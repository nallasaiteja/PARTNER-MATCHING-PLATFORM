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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reject BLOCKED and TERMINATED immediately
    if (LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException(
        `Your account is ${user.status.toLowerCase()}. Please contact administration.`,
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
}
