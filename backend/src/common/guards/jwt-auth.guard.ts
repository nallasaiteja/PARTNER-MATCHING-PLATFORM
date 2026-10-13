import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { StaffStatus, LOGIN_BLOCKED_STATUSES } from '../constants/roles.constants';

/**
 * JwtAuthGuard
 * - Validates JWT token from Authorization header (supports both Supabase Auth & platform tokens)
 * - Rejects BLOCKED and TERMINATED staff at login boundary
 * - Attaches full user object to request
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      // If local JWT verification fails, verify with Supabase Auth
      if (this.supabaseService.isConfigured()) {
        const { user: supaUser } = await this.supabaseService.getUser(token);
        if (supaUser) {
          payload = { sub: supaUser.id };
        }
      }
      if (!payload) {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });


    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Block BLOCKED and TERMINATED staff from all API access
    if (LOGIN_BLOCKED_STATUSES.includes(user.status as any)) {
      throw new UnauthorizedException(
        `Account is ${user.status.toLowerCase()}. Access denied.`,
      );
    }

    request.user = user;
    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
