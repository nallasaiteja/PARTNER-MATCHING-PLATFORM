import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
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
    const { passwordHash, ...safeUser } = user;
    return safeUser;
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
