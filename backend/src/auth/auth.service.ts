import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import {
  LOGIN_BLOCKED_STATUSES,
  Role,
} from '../common/constants/roles.constants';
import { AuditAction } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import {
  RegisterMemberDto,
  RequestRegistrationOtpDto,
  RequestLoginOtpDto,
  VerifyLoginOtpDto,
} from './dto/member-auth.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private registrationOtps = new Map<
    string,
    { hash: string; expiresAt: Date; sentAt: Date; attempts: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly supabaseService?: SupabaseService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    let user: any = null;
    const identifier = dto.identifier || dto.mobile || dto.email || dto.memberId;

    if (!identifier) {
      throw new BadRequestException('Mobile, Email, or Member ID is required');
    }

    // 1. Try finding by Member ID
    if (dto.memberId || identifier.toUpperCase().startsWith('M')) {
      const profile = await this.prisma.memberProfile.findFirst({
        where: { memberId: { equals: dto.memberId || identifier, mode: 'insensitive' } },
        include: { user: { include: { organization: true } } },
      });
      if (profile?.user) {
        user = profile.user;
      }
    }

    // 2. Try finding by Email
    if (!user && (dto.email || identifier.includes('@'))) {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: dto.email || identifier, mode: 'insensitive' } },
        include: { organization: true },
      });
    }

    // 3. Try finding by Mobile
    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { mobile: dto.mobile || identifier },
        include: { organization: true },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reject BLOCKED and TERMINATED immediately
    if (LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException(
        `Your account is ${user.status.toLowerCase()}. Please contact administration.`,
      );
    }

    let accessToken: string;
    let refreshToken: string;
    let authenticatedViaSupabase = false;

    // Authenticate via Supabase Auth if configured
    if (this.supabaseService?.isConfigured()) {
      const authEmail = user.email || `${user.mobile}@member.telugumatrimony.local`;
      const supaRes = await this.supabaseService.signInWithPassword({
        email: authEmail,
        password: dto.password,
      });

      if (supaRes.session) {
        accessToken = supaRes.session.access_token;
        refreshToken = supaRes.session.refresh_token;
        authenticatedViaSupabase = true;
      }
    }

    if (!authenticatedViaSupabase) {
      const passwordMatch = user.passwordHash
        ? await bcrypt.compare(dto.password, user.passwordHash)
        : false;
      if (!passwordMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = {
        sub: user.id,
        role: user.role,
        status: user.status,
        orgId: user.organizationId,
      };

      accessToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '8h',
      });

      refreshToken = this.jwtService.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      });
    }


    // If user is a MEMBER, load their memberProfile
    let memberProfile: any = null;
    if (user.role === 'MEMBER') {
      memberProfile = await this.prisma.memberProfile.findUnique({
        where: { userId: user.id },
      });
    }

    // Audit login event
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.LOGIN,
      resourceType: 'Session',
      orgId: user.organizationId,
      metadata: { mobile: user.mobile, status: user.status },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
        staffDivision: user.staffDivision,
        organizationId: user.organizationId,
        organization: user.organization
          ? { id: user.organization.id, name: user.organization.name, type: user.organization.type }
          : null,
      },
      memberProfile: memberProfile
        ? {
            id: memberProfile.id,
            memberId: memberProfile.memberId,
            firstName: memberProfile.firstName,
            lastName: memberProfile.lastName,
            packageType: memberProfile.packageType,
            currentStep: memberProfile.currentStep,
            termsAccepted: memberProfile.termsAccepted,
          }
        : null,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Never expose passwordHash
    const {
      passwordHash,
      mobileOtpHash,
      mobileOtpExpiresAt,
      mobileOtpSentAt,
      mobileOtpFailedAttempts,
      emailOtpHash,
      emailOtpExpiresAt,
      emailOtpSentAt,
      emailOtpFailedAttempts,
      passwordResetTokenHash,
      passwordResetExpiresAt,
      passwordResetRequestedAt,
      ...safeUser
    } = user;
    return safeUser;
  }

  async requestMobileVerification(userId: string) {
    const user = await this.findVerificationUser(userId);
    await this.enforceResendDelay(user.mobileOtpSentAt);
    const code = String(randomInt(100000, 1000000));
    await this.sendDeliveryWebhook('sms', user.mobile, {
      type: 'verification-otp',
      code,
      expiresInMinutes: 10,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mobileOtpHash: await bcrypt.hash(code, 10),
        mobileOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        mobileOtpSentAt: new Date(),
        mobileOtpFailedAttempts: 0,
      },
    });
    return { message: 'Mobile verification code sent' };
  }

  async verifyMobile(userId: string, code: string) {
    const user = await this.findVerificationUser(userId);
    const valid = await this.verifyOtp(user, code, 'mobile');
    if (!valid) throw new UnauthorizedException('Invalid or expired verification code');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mobileVerified: true,
        mobileOtpHash: null,
        mobileOtpExpiresAt: null,
        mobileOtpFailedAttempts: 0,
      },
    });
    return { mobileVerified: true };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.findVerificationUser(userId);
    if (!user.email) throw new BadRequestException('No email address is registered');
    await this.enforceResendDelay(user.emailOtpSentAt);
    const code = String(randomInt(100000, 1000000));
    await this.sendDeliveryWebhook('email', user.email, {
      type: 'verification-otp',
      code,
      expiresInMinutes: 10,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailOtpHash: await bcrypt.hash(code, 10),
        emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        emailOtpSentAt: new Date(),
        emailOtpFailedAttempts: 0,
      },
    });
    return { message: 'Email verification code sent' };
  }

  async verifyEmail(userId: string, code: string) {
    const user = await this.findVerificationUser(userId);
    const valid = await this.verifyOtp(user, code, 'email');
    if (!valid) throw new UnauthorizedException('Invalid or expired verification code');
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
        emailOtpFailedAttempts: 0,
      },
    });
    return { emailVerified: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 12) },
    });
    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(email: string) {
    const deliveryUrl = process.env.EMAIL_PROVIDER_WEBHOOK_URL;
    const frontendUrl = process.env.FRONTEND_BASE_URL;
    if (!deliveryUrl || !frontendUrl) {
      throw new ServiceUnavailableException(
        'Password reset requires EMAIL_PROVIDER_WEBHOOK_URL and FRONTEND_BASE_URL configuration',
      );
    }

    const genericResponse = {
      message: 'If the account exists, password reset instructions will be sent to its registered email.',
    };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return genericResponse;

    if (user.passwordResetRequestedAt && Date.now() - user.passwordResetRequestedAt.getTime() < 60_000) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
        passwordResetRequestedAt: new Date(),
      },
    });

    try {
      await this.sendDeliveryWebhook('email', email, {
        type: 'password-reset',
        resetUrl: `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`,
        expiresInMinutes: 30,
      });
    } catch {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetTokenHash: null, passwordResetExpiresAt: null },
      });
    }
    return genericResponse;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: { passwordResetTokenHash: tokenHash },
    });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { message: 'Password has been reset' };
  }

  private async findVerificationUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Account not accessible');
    return user;
  }

  private async enforceResendDelay(sentAt: Date | null) {
    if (sentAt && Date.now() - sentAt.getTime() < 60_000) {
      throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async verifyOtp(user: any, code: string, channel: 'mobile' | 'email') {
    const isMobile = channel === 'mobile';
    const hash = isMobile ? user.mobileOtpHash : user.emailOtpHash;
    const expiresAt = isMobile ? user.mobileOtpExpiresAt : user.emailOtpExpiresAt;
    const attempts = isMobile ? user.mobileOtpFailedAttempts : user.emailOtpFailedAttempts;
    const fieldPrefix = isMobile ? 'mobile' : 'email';
    if (attempts >= 5) {
      throw new HttpException('Too many invalid codes. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!hash || !expiresAt || expiresAt <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { [`${fieldPrefix}OtpHash`]: null, [`${fieldPrefix}OtpExpiresAt`]: null },
      });
      return false;
    }
    const matches = await bcrypt.compare(code, hash);
    if (!matches) {
      const failedAttempts = attempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          [`${fieldPrefix}OtpFailedAttempts`]: failedAttempts,
          ...(failedAttempts >= 5 ? { [`${fieldPrefix}OtpHash`]: null } : {}),
        },
      });
      return false;
    }
    return true;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendDeliveryWebhook(
    channel: 'sms' | 'email',
    recipient: string,
    payload: Record<string, string | number>,
  ) {
    const url = channel === 'sms'
      ? process.env.SMS_PROVIDER_WEBHOOK_URL
      : process.env.EMAIL_PROVIDER_WEBHOOK_URL;
    if (!url) {
      throw new ServiceUnavailableException(
        `${channel === 'sms' ? 'SMS_PROVIDER_WEBHOOK_URL' : 'EMAIL_PROVIDER_WEBHOOK_URL'} is not configured`,
      );
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.NOTIFICATION_PROVIDER_WEBHOOK_TOKEN) {
      headers.Authorization = `Bearer ${process.env.NOTIFICATION_PROVIDER_WEBHOOK_TOKEN}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ channel, recipient, ...payload }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`${channel} delivery provider returned ${response.status}`);
    }
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException('Account not accessible');
    }

    const newPayload = {
      sub: user.id,
      role: user.role,
      status: user.status,
      orgId: user.organizationId,
    };

    return {
      accessToken: this.jwtService.sign(newPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '8h',
      }),
    };
  }

  // ──────────────────────────────────────────────────────────
  // SECTION 4.1: REGISTRATION & OTP LOGIN
  // ──────────────────────────────────────────────────────────

  async requestRegistrationOtp(dto: RequestRegistrationOtpDto) {
    const isMobile = dto.channel === 'mobile';
    const recipient = dto.recipient.trim();

    // Prevent duplicate accounts
    const existing = await this.prisma.user.findFirst({
      where: isMobile ? { mobile: recipient } : { email: { equals: recipient, mode: 'insensitive' } },
    });
    if (existing) {
      throw new BadRequestException(
        `An account with this ${isMobile ? 'mobile number' : 'email address'} is already registered`,
      );
    }

    const cached = this.registrationOtps.get(recipient);
    if (cached && Date.now() - cached.sentAt.getTime() < 60_000) {
      throw new HttpException(
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.registrationOtps.set(recipient, {
      hash: codeHash,
      expiresAt,
      sentAt: new Date(),
      attempts: 0,
    });

    const isWebhookConfigured = isMobile
      ? Boolean(process.env.SMS_PROVIDER_WEBHOOK_URL)
      : Boolean(process.env.EMAIL_PROVIDER_WEBHOOK_URL);

    if (isWebhookConfigured) {
      await this.sendDeliveryWebhook(isMobile ? 'sms' : 'email', recipient, {
        type: 'registration-otp',
        code,
        expiresInMinutes: 10,
      });
      return { message: `Verification code sent to ${recipient}`, providerConfigured: true };
    }

    console.log(`\n🔑 [DEV/SUPABASE MODE] Registration OTP for ${recipient} (${dto.channel}): ${code}\n`);
    return {
      message: `OTP generated for ${recipient}. Enter code: ${code}`,
      providerConfigured: false,
      devCode: code,
    };
  }

  async registerMember(dto: RegisterMemberDto, ipAddress?: string) {
    if (!dto.termsAccepted) {
      throw new BadRequestException('You must accept the Terms & Conditions before registration');
    }

    const recipient = (dto.channel === 'mobile' ? dto.mobile : dto.email || dto.mobile).trim();
    const challenge = this.registrationOtps.get(recipient);

    if (!challenge) {
      throw new UnauthorizedException('No OTP requested or code has expired. Please request a new code.');
    }

    if (challenge.expiresAt <= new Date()) {
      this.registrationOtps.delete(recipient);
      throw new UnauthorizedException('Verification code has expired. Please request a new code.');
    }

    if (challenge.attempts >= 5) {
      this.registrationOtps.delete(recipient);
      throw new HttpException('Too many invalid attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = await bcrypt.compare(dto.otpCode.trim(), challenge.hash);
    if (!valid) {
      challenge.attempts += 1;
      throw new UnauthorizedException('Invalid verification code');
    }

    // OTP consumed successfully
    this.registrationOtps.delete(recipient);

    // Prevent duplicate user creation
    const existingMobile = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (existingMobile) {
      throw new BadRequestException('An account with this mobile number already exists');
    }
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existingEmail) {
        throw new BadRequestException('An account with this email address already exists');
      }
    }

    let supaUserId: string | null = null;
    const authEmail = dto.email || `${dto.mobile}@member.telugumatrimony.local`;

    if (this.supabaseService?.isConfigured()) {
      const { user: supaUser, error: supaErr } = await this.supabaseService.registerAuthUser({
        email: authEmail,
        password: dto.password,
        phone: dto.mobile,
        role: 'MEMBER',
        metadata: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          gender: dto.gender,
        },
      });

      if (supaErr) {
        console.warn(`[Supabase Auth Register Warning]: ${supaErr.message}`);
      } else if (supaUser) {
        supaUserId = supaUser.id;
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const memberId = `M${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;

    // Create User account (using Supabase UUID if available)
    const user = await this.prisma.user.create({
      data: {
        id: supaUserId || undefined,
        mobile: dto.mobile,
        email: dto.email || null,
        passwordHash,
        role: 'MEMBER',
        status: 'ACTIVE',
        mobileVerified: dto.channel === 'mobile',
        emailVerified: dto.channel === 'email',
      },
    });


    // Create MemberProfile
    const profile = await this.prisma.memberProfile.create({
      data: {
        memberId,
        userId: user.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        gender: dto.gender,
        dateOfBirth: new Date(dto.dateOfBirth),
        createdByType: 'MEMBER',
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        currentStep: 1,
        completedSteps: [1],
        profileData: {
          step1: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth,
            maritalStatus: dto.maritalStatus,
            religion: dto.religion,
            caste: dto.caste,
            mobile: dto.mobile,
            email: dto.email || null,
          },
        },
      },
    });

    const payload = {
      sub: user.id,
      role: user.role,
      status: user.status,
      orgId: null,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.PROFILE_CREATE,
      resourceType: 'MemberProfile',
      resourceId: profile.id,
      metadata: { memberId, registeredBy: 'MEMBER' },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      memberProfile: {
        id: profile.id,
        memberId: profile.memberId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        packageType: profile.packageType,
        currentStep: profile.currentStep,
        termsAccepted: true,
        createdByType: 'MEMBER',
      },
    };
  }

  async requestLoginOtp(dto: RequestLoginOtpDto) {
    const isMobile = dto.channel === 'mobile';
    const identifier = dto.identifier.trim();

    let user: any = null;
    if (identifier.toUpperCase().startsWith('M')) {
      const profile = await this.prisma.memberProfile.findFirst({
        where: { memberId: { equals: identifier, mode: 'insensitive' } },
        include: { user: true },
      });
      user = profile?.user;
    } else if (identifier.includes('@')) {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: identifier, mode: 'insensitive' } },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: { mobile: identifier },
      });
    }

    if (!user) {
      throw new UnauthorizedException(
        'No account found with this identifier. Please register first using Quick Registration.',
      );
    }

    if (LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const targetRecipient = isMobile ? user.mobile : user.email;
    if (!targetRecipient) {
      throw new BadRequestException(`No registered ${dto.channel} on this account`);
    }

    await this.enforceResendDelay(isMobile ? user.mobileOtpSentAt : user.emailOtpSentAt);

    const code = String(randomInt(100000, 1000000));
    const isWebhookConfigured = isMobile
      ? Boolean(process.env.SMS_PROVIDER_WEBHOOK_URL)
      : Boolean(process.env.EMAIL_PROVIDER_WEBHOOK_URL);

    if (isWebhookConfigured) {
      await this.sendDeliveryWebhook(isMobile ? 'sms' : 'email', targetRecipient, {
        type: 'login-otp',
        code,
        expiresInMinutes: 10,
      });
    } else {
      console.log(`\n🔑 [DEV/SUPABASE MODE] Login OTP for ${targetRecipient} (${dto.channel}): ${code}\n`);
    }

    const fieldPrefix = isMobile ? 'mobile' : 'email';
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        [`${fieldPrefix}OtpHash`]: await bcrypt.hash(code, 10),
        [`${fieldPrefix}OtpExpiresAt`]: new Date(Date.now() + 10 * 60 * 1000),
        [`${fieldPrefix}OtpSentAt`]: new Date(),
        [`${fieldPrefix}OtpFailedAttempts`]: 0,
      },
    });

    return {
      message: `Login code generated: ${code}`,
      providerConfigured: isWebhookConfigured,
      devCode: code,
    };
  }


  async verifyLoginOtp(dto: VerifyLoginOtpDto, ipAddress?: string) {
    const isMobile = dto.channel === 'mobile';
    const identifier = dto.identifier.trim();

    let user: any = null;
    if (identifier.toUpperCase().startsWith('M')) {
      const profile = await this.prisma.memberProfile.findFirst({
        where: { memberId: { equals: identifier, mode: 'insensitive' } },
        include: { user: { include: { organization: true } } },
      });
      user = profile?.user;
    } else if (identifier.includes('@')) {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: identifier, mode: 'insensitive' } },
        include: { organization: true },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: { mobile: identifier },
        include: { organization: true },
      });
    }

    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const valid = await this.verifyOtp(user, dto.code.trim(), dto.channel);
    if (!valid) throw new UnauthorizedException('Invalid or expired login code');

    const fieldPrefix = isMobile ? 'mobile' : 'email';
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        [`${fieldPrefix}OtpHash`]: null,
        [`${fieldPrefix}OtpExpiresAt`]: null,
        [`${fieldPrefix}OtpFailedAttempts`]: 0,
        [`${fieldPrefix}Verified`]: true,
      },
    });

    const payload = {
      sub: user.id,
      role: user.role,
      status: user.status,
      orgId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    let memberProfile: any = null;
    if (user.role === 'MEMBER') {
      memberProfile = await this.prisma.memberProfile.findUnique({
        where: { userId: user.id },
      });
    }

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.LOGIN,
      resourceType: 'Session',
      orgId: user.organizationId,
      metadata: { method: `${dto.channel}_OTP`, status: user.status },
      ipAddress,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        status: user.status,
        organizationId: user.organizationId,
      },
      memberProfile: memberProfile
        ? {
            id: memberProfile.id,
            memberId: memberProfile.memberId,
            firstName: memberProfile.firstName,
            lastName: memberProfile.lastName,
            packageType: memberProfile.packageType,
            currentStep: memberProfile.currentStep,
            termsAccepted: memberProfile.termsAccepted,
          }
        : null,
    };
  }

  async getTermsAndConditions() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: 'TERMS_AND_CONDITIONS' },
    });
    if (setting?.value) {
      return setting.value;
    }
    return {
      title: 'Partner Matching Platform — Terms and Conditions',
      version: '1.0',
      content:
        '1. Genuine Membership: Profiles must be created with authentic personal and demographic details.\n2. Privacy: Profiles are protected by privacy rules and contact disclosure settings.\n3. Safety: Inappropriate behavior or harassment results in immediate profile blocking.\n4. Permanent Records: Profiles cannot be permanently deleted; data is preserved permanently for compliance.',
    };
  }

  async acceptTermsAndConditions(userId: string) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new BadRequestException('No member profile found for this user');
    }
    const updated = await this.prisma.memberProfile.update({
      where: { id: profile.id },
      data: { termsAccepted: true, termsAcceptedAt: new Date() },
    });
    return { termsAccepted: true, termsAcceptedAt: updated.termsAcceptedAt };
  }

  async logout(user: any, ipAddress?: string) {
    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.LOGOUT,
      resourceType: 'Session',
      orgId: user.organizationId,
      ipAddress,
    });
    return { message: 'Logged out successfully' };
  }
}

