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

  async queryAuditLogs(filter: {
    actorId?: string;
    action?: AuditAction;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.action) where.action = filter.action as any;
    if (filter.resourceType) where.resourceType = filter.resourceType;
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, mobile: true, email: true, role: true, employeeId: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filter.limit || 50,
        skip: filter.offset || 0,
      }),
    ]);

    return { total, logs };
  }
}

// Re-export AuditAction for use in other files
export { AuditAction };
