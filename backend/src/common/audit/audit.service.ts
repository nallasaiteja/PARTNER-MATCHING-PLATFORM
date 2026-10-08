import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleType } from '../constants/roles.constants';
import { AuditAction } from '@prisma/client';
export interface AuditEventData {
  actorId: string;
  actorRole: RoleType;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  orgId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * AuditService
 * Provides a reusable, centralized mechanism for logging audit events.
 * All audit events are stored in the AuditLog table.
 * Sensitive data (passwords, OTPs, tokens) must never be passed as metadata.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(event: AuditEventData): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: event.actorId,
          actorRole: event.actorRole as any,
          action: event.action as any,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          orgId: event.orgId,
          metadata: event.metadata,
          ipAddress: event.ipAddress,
        },
      });
    } catch (err) {
      // Audit logging must never crash the main application
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  async getLogsForActor(actorId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLogsByAction(action: AuditAction, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { action: action as any },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

// Re-export AuditAction for use in other files
export { AuditAction };
