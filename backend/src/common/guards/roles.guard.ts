import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ROLE_PERMISSIONS,
  SUSPENDED_BLOCKED_PERMISSIONS,
  StaffStatus,
  RoleType,
  PermissionType,
} from '../constants/roles.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * RolesGuard
 * Enforces role and permission checks on every protected route.
 * Also enforces SUSPENDED staff restrictions.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleType[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No role/permission requirement → pass through
    if (!requiredRoles && !requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Access denied: not authenticated');
    }

    const userRole = user.role as RoleType;
    const userStatus = user.status;

    // Check role requirement
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Access denied: role ${userRole} is not permitted for this action`,
      );
    }

    // Check permission requirement
    if (requiredPermissions) {
      const rolePerms = ROLE_PERMISSIONS[userRole] || [];

      for (const perm of requiredPermissions) {
        // SUSPENDED staff: block certain permissions
        if (
          userStatus === StaffStatus.SUSPENDED &&
          SUSPENDED_BLOCKED_PERMISSIONS.includes(perm)
        ) {
          throw new ForbiddenException(
            `Access denied: suspended accounts cannot perform '${perm}'`,
          );
        }

        // Check if role has the permission (or has override via permissionOverrides)
        const overrides: string[] = user.permissionOverrides?.granted || [];
        const hasPermission = rolePerms.includes(perm) || overrides.includes(perm);

        if (!hasPermission) {
          throw new ForbiddenException(
            `Access denied: missing permission '${perm}'`,
          );
        }
      }
    }

    return true;
  }
}
