import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
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
import { LoginDto, VerifyAdmin2faDto, VerifyAdminRecoveryCodeDto } from './dto/login.dto';
import {
  RegisterMemberDto,
  RequestRegistrationOtpDto,
  RequestLoginOtpDto,
  VerifyLoginOtpDto,
} from './dto/member-auth.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { EmailNotificationProvider } from '../notifications/providers/email.provider';

@Injectable()
export class AuthService {
  private readonly smsProvider = new SmsNotificationProvider();
  private readonly emailProvider = new EmailNotificationProvider();
  private registrationOtps = new Map<
    string,
    { hash: string; expiresAt: Date; sentAt: Date; attempts: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly supabaseService?: SupabaseService,
  ) { }

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

    // Role-based portal segregation (Ordinary members cannot log in via staff portal)
    if (dto.portalType === 'STAFF' && user.role === 'MEMBER') {
      throw new UnauthorizedException(
        'Access denied: Ordinary members cannot access the staff portal. Please use Member Login.',
      );
    }
    if (dto.portalType === 'MEMBER' && user.role !== 'MEMBER') {
      throw new UnauthorizedException(
        'Access denied: Staff accounts must log in via the Staff Login portal.',
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

      // Section 12.1.A: Mandatory 2FA for Admin Accounts (Super Admin and Admin)
      if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) {
        const code = String(randomInt(100000, 1000000));
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorOtpHash: codeHash,
            twoFactorOtpExpiresAt: expiresAt,
            twoFactorOtpAttempts: 0,
          },
        });

        const challengePayload = {
          sub: user.id,
          role: user.role,
          twoFactorPending: true,
        };

        const challengeToken = this.jwtService.sign(challengePayload, {
          secret: process.env.JWT_SECRET,
          expiresIn: '5m',
        });

        console.log(`\n🔑 [ADMIN 2FA CHALLENGE] 6-digit verification code for ${user.role} (${user.mobile}): ${code}\n`);

        await this.auditService.log({
          actorId: user.id,
          actorRole: user.role as any,
          action: AuditAction.OTP_SENT,
          resourceType: 'Admin2FA',
          metadata: { mobile: user.mobile, channel: 'mobile' },
          ipAddress,
        });

        return {
          requires2fa: true,
          challengeToken,
          channel: 'mobile',
          maskedMobile: user.mobile ? `${user.mobile.slice(0, 3)}****${user.mobile.slice(-2)}` : null,
          message: 'Two-factor authentication required for Administrator access. Please enter the verification code sent to your registered mobile number.',
          devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
        };
      }

      const payload = {
        sub: user.id,
        role: user.role,
        status: user.status,
        orgId: user.organizationId,
        is2faVerified: false,
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

    // 1. Dispatch live via Brevo/SendGrid Email Provider
    let dispatched = false;
    try {
      const dispatchRes = await this.emailProvider.dispatch({
        type: 'OTP',
        channel: 'EMAIL',
        recipientContact: user.email,
        recipientName: (user as any).fullName || 'Member',
        title: 'Email Verification Code - Partner Matching Platform',
        content: `Your email verification code is: <strong style="color: #e11d48; font-size: 20px; letter-spacing: 2px;">${code}</strong><br/><br/>This code will expire in 10 minutes. Please enter it on the platform to verify your email.`,
      });
      if (dispatchRes.success && !dispatchRes.simulated) {
        dispatched = true;
      }
    } catch (err: any) {
      console.warn(`[Email Verification Dispatch Warning]: ${err.message}`);
    }

    if (!dispatched && process.env.EMAIL_PROVIDER_WEBHOOK_URL) {
      await this.sendDeliveryWebhook('email', user.email, {
        type: 'verification-otp',
        code,
        expiresInMinutes: 10,
      });
    }

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
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const hasEmailProvider = Boolean(process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY || deliveryUrl);
    if (!hasEmailProvider) {
      throw new ServiceUnavailableException(
        'Password reset requires BREVO_API_KEY or EMAIL_PROVIDER_WEBHOOK_URL configuration',
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
      let dispatched = false;
      if (process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY) {
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
        const dispatchRes = await this.emailProvider.dispatch({
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientContact: email,
          title: 'Reset Your Password - Partner Matching Platform',
          content: `We received a request to reset your password for your Partner Matching Platform account.<br/><br/>
            <a href="${resetUrl}" style="display: inline-block; background-color: #e11d48; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 12px 0;">Reset My Password</a><br/><br/>
            Or open the link directly:<br/><span style="color: #64748b; font-size: 13px;">${resetUrl}</span><br/><br/>
            This reset link will expire in 30 minutes. If you did not make this request, you can safely ignore this email.`,
        });
        if (dispatchRes.success && !dispatchRes.simulated) {
          dispatched = true;
        }
      }

      if (!dispatched && deliveryUrl) {
        await this.sendDeliveryWebhook('email', email, {
          type: 'password-reset',
          resetUrl: `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`,
          expiresInMinutes: 30,
        });
      }
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

    // 1. If mobile and SMS Provider (Twilio / Fast2SMS) is active, dispatch live SMS OTP
    if (isMobile) {
      try {
        const dispatchRes = await this.smsProvider.dispatch({
          type: 'OTP',
          channel: 'SMS',
          recipientContact: recipient,
          title: 'Registration Verification Code',
          content: `[Partner Matching Platform] Your registration OTP is ${code}. Valid for 10 minutes. Do not share this code with anyone.`,
        });

        if (dispatchRes.success && !dispatchRes.simulated) {
          return {
            message: `Verification code sent via SMS to ${recipient}`,
            providerConfigured: true,
            provider: dispatchRes.provider,
          };
        }
      } catch (err: any) {
        console.warn(`[SMS OTP Dispatch Warning]: ${err.message}`);
      }
    } else {
      // 2. If email and Brevo / SendGrid Email Provider is active, dispatch live Email OTP
      try {
        const dispatchRes = await this.emailProvider.dispatch({
          type: 'OTP',
          channel: 'EMAIL',
          recipientContact: recipient,
          title: 'Registration Verification Code - Partner Matching Platform',
          content: `Your verification code for registration is: <strong style="color: #e11d48; font-size: 20px; letter-spacing: 2px;">${code}</strong><br/><br/>This code will expire in 10 minutes. Please do not share this code with anyone.`,
        });

        if (dispatchRes.success && !dispatchRes.simulated) {
          console.log(`\n📧 [BREVO EMAIL DISPATCHED] OTP for ${recipient}: ${code} (Message ID: ${dispatchRes.providerMessageId})\n`);
          return {
            message: `Verification code sent via Email to ${recipient}`,
            providerConfigured: true,
            provider: dispatchRes.provider,
            devCode: code,
          };
        }
      } catch (err: any) {
        console.warn(`[Email OTP Dispatch Warning]: ${err.message}`);
      }
    }

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
      console.warn(`[Register Error] No active OTP found for "${recipient}". Active keys: [${Array.from(this.registrationOtps.keys()).join(', ')}]`);
      throw new UnauthorizedException('No OTP requested or code has expired. Please request a new code.');
    }

    if (challenge.expiresAt <= new Date()) {
      this.registrationOtps.delete(recipient);
      console.warn(`[Register Error] OTP expired for "${recipient}"`);
      throw new UnauthorizedException('Verification code has expired. Please request a new code.');
    }

    if (challenge.attempts >= 5) {
      this.registrationOtps.delete(recipient);
      console.warn(`[Register Error] Too many attempts for "${recipient}"`);
      throw new HttpException('Too many invalid attempts. Request a new code.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const valid = await bcrypt.compare(dto.otpCode.trim(), challenge.hash);
    if (!valid) {
      challenge.attempts += 1;
      console.warn(`[Register Error] Invalid OTP code submitted: "${dto.otpCode.trim()}" for "${recipient}"`);
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
        registrationSource: dto.registrationSource || 'DIRECT',
        attributionData: dto.attributionData || null,
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
        registrationSource: profile.registrationSource,
        attributionData: profile.attributionData,
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

    // 1. If mobile and SMS Provider (Twilio / Fast2SMS) is active, dispatch live SMS OTP
    if (isMobile) {
      try {
        const dispatchRes = await this.smsProvider.dispatch({
          type: 'OTP',
          channel: 'SMS',
          recipientContact: targetRecipient,
          title: 'Login OTP',
          content: `[Partner Matching Platform] Your login OTP is ${code}. Valid for 10 minutes. Do not share this code with anyone.`,
        });
        if (dispatchRes.success && !dispatchRes.simulated) {
          console.log(`📱 Live SMS Login OTP delivered to ${targetRecipient} via ${dispatchRes.provider}`);
        }
      } catch (err: any) {
        console.warn(`[SMS Login OTP Dispatch Warning]: ${err.message}`);
      }
    } else {
      // 2. If email and Brevo / SendGrid Email Provider is active, dispatch live Email OTP
      try {
        const dispatchRes = await this.emailProvider.dispatch({
          type: 'OTP',
          channel: 'EMAIL',
          recipientContact: targetRecipient,
          recipientName: (user as any).fullName || 'Member',
          title: 'Login OTP - Partner Matching Platform',
          content: `Your login verification code is: <strong style="color: #e11d48; font-size: 20px; letter-spacing: 2px;">${code}</strong><br/><br/>This code will expire in 10 minutes. Please do not share this code with anyone.`,
        });
        if (dispatchRes.success && !dispatchRes.simulated) {
          console.log(`📧 Live Email Login OTP delivered to ${targetRecipient} via ${dispatchRes.provider}`);
        }
      } catch (err: any) {
        console.warn(`[Email Login OTP Dispatch Warning]: ${err.message}`);
      }
    }

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

  // ──────────────────────────────────────────────────────────
  // SECTION 12.1.A: ADMIN TWO-FACTOR AUTHENTICATION
  // ──────────────────────────────────────────────────────────

  async verifyAdmin2fa(dto: VerifyAdmin2faDto, ipAddress?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.challengeToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA challenge token. Please login again.');
    }

    if (!payload.twoFactorPending || !payload.sub) {
      throw new UnauthorizedException('Invalid 2FA challenge token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      throw new UnauthorizedException('2FA verification only applies to administrative roles.');
    }

    if (user.twoFactorOtpAttempts >= 3) {
      throw new UnauthorizedException('Maximum 2FA verification attempts exceeded. Please login again.');
    }

    if (!user.twoFactorOtpExpiresAt || user.twoFactorOtpExpiresAt < new Date()) {
      throw new UnauthorizedException('2FA verification code has expired. Please login again.');
    }

    const isMatch = user.twoFactorOtpHash
      ? await bcrypt.compare(dto.code, user.twoFactorOtpHash)
      : false;

    if (!isMatch) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorOtpAttempts: { increment: 1 },
        },
      });

      await this.auditService.log({
        actorId: user.id,
        actorRole: user.role as any,
        action: AuditAction.LOGIN,
        resourceType: 'Admin2FA',
        metadata: { success: false, reason: 'Invalid 2FA code', attempt: user.twoFactorOtpAttempts + 1 },
        ipAddress,
      });

      throw new UnauthorizedException('Invalid 2FA verification code.');
    }

    // Success! Clear challenge fields and issue admin token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorOtpHash: null,
        twoFactorOtpExpiresAt: null,
        twoFactorOtpAttempts: 0,
      },
    });

    const jwtPayload = {
      sub: user.id,
      role: user.role,
      status: user.status,
      orgId: user.organizationId,
      is2faVerified: true,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.TWO_FACTOR_VERIFY,
      resourceType: 'Session',
      orgId: user.organizationId,
      metadata: { twoFactorVerified: true },
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
      is2faVerified: true,
    };
  }

  async verifyAdminRecoveryCode(dto: VerifyAdminRecoveryCodeDto, ipAddress?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(dto.challengeToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired 2FA challenge token. Please login again.');
    }

    if (!payload.twoFactorPending || !payload.sub) {
      throw new UnauthorizedException('Invalid 2FA challenge token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      throw new UnauthorizedException('User not found or unauthorized.');
    }

    const enteredCode = dto.recoveryCode.trim().toUpperCase();
    let matchedIndex = -1;

    for (let i = 0; i < (user.twoFactorBackupCodes || []).length; i++) {
      const codeHash = user.twoFactorBackupCodes[i];
      if (await bcrypt.compare(enteredCode, codeHash)) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      throw new UnauthorizedException('Invalid emergency recovery backup code.');
    }

    // Consume the used backup code
    const updatedCodes = [...user.twoFactorBackupCodes];
    updatedCodes.splice(matchedIndex, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorBackupCodes: updatedCodes,
        twoFactorOtpHash: null,
        twoFactorOtpExpiresAt: null,
        twoFactorOtpAttempts: 0,
      },
    });

    const jwtPayload = {
      sub: user.id,
      role: user.role,
      status: user.status,
      orgId: user.organizationId,
      is2faVerified: true,
    };

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '8h',
    });

    const refreshToken = this.jwtService.sign(jwtPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.TWO_FACTOR_RECOVERY,
      resourceType: 'Session',
      metadata: { remainingBackupCodes: updatedCodes.length },
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
      },
      is2faVerified: true,
      remainingBackupCodes: updatedCodes.length,
    };
  }

  async setupAdmin2fa(adminUserId: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminUserId },
    });
    if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
      throw new ForbiddenException('Only Administrators can configure two-factor authentication.');
    }

    // Generate 5 emergency backup codes (8 characters)
    const backupCodes: string[] = [];
    const hashedCodes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      backupCodes.push(code);
      hashedCodes.push(await bcrypt.hash(code, 12));
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
        twoFactorEnrolledAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorRole: user.role as any,
      action: AuditAction.TWO_FACTOR_SETUP,
      resourceType: 'UserSecurity',
      metadata: { backupCodesGenerated: 5 },
      ipAddress,
    });

    return {
      success: true,
      backupCodes,
      message: 'Two-factor authentication configured. Store these 5 emergency recovery codes securely. Each can be used once if you lose access to your primary device.',
    };
  }
}

