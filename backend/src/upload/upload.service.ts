import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeGuardService } from '../common/guards/scope-guard.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeGuard: ScopeGuardService,
  ) {}

  /**
   * Ensures upload directories exist on startup.
   */
  ensureDirectories() {
    const dirs = [
      path.join(process.cwd(), 'uploads', 'photos'),
      path.join(process.cwd(), 'uploads', 'id-proofs'),
    ];
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Save uploaded photo and update MemberProfile.photoUrl
   */
  async savePhoto(
    file: Express.Multer.File,
    profileId: string,
  ): Promise<{ url: string; filename: string }> {
    if (!file) throw new BadRequestException('No file uploaded');

    if (!file.mimetype.startsWith('image/')) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Only image files are allowed for profile photos');
    }

    const maxPhotoBytes = 500 * 1024;
    if (file.size > maxPhotoBytes) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Photo must be 500KB or smaller. Please reduce size or crop the image.');
    }

    const dbProfile = await this.prisma.memberProfile.findUnique({ where: { id: profileId } });
    const memberId = dbProfile?.memberId || profileId;
    const safeName = `${memberId.replace(/[^a-zA-Z0-9_-]/g, '-') || 'member'}-photo.jpg`;
    const destDir = path.join(process.cwd(), 'uploads', 'photos');
    const finalPath = path.join(destDir, safeName);
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    fs.renameSync(file.path, finalPath);

    const url = `/uploads/photos/${safeName}`;

    try {
      await this.prisma.memberProfile.update({
        where: { id: profileId },
        data: {
          photoUrl: url,
          photoFilename: safeName,
        },
      });
    } catch {
      // Profile may not exist yet (draft mode); that's OK
    }

    return { url, filename: safeName };
  }

  /**
   * Save uploaded ID proof document and update MemberProfile.idProofFileUrl
   */
  async saveIdProof(
    file: Express.Multer.File,
    profileId: string,
    actor: any,
  ): Promise<{ url: string; filename: string }> {
    if (!file) throw new BadRequestException('No file uploaded');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Only JPG, PNG, WEBP, or PDF files are allowed for ID proof');
    }

    if (file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('ID proof file too large. Maximum size is 5MB.');
    }

    try {
      const profile = await this.prisma.memberProfile.findUnique({
        where: { id: profileId },
      });
      if (!profile) throw new BadRequestException('Profile not found');
      await this.scopeGuard.requireProfileOwnership(actor.id, actor.role, profileId);
      await this.scopeGuard.requireOrganizationScope(
        actor.role,
        actor.organizationId,
        profileId,
        actor.id,
      );
      const step5 = (profile.profileData as Record<string, any>)?.step5 || {};
      const isRejected =
        step5.idProofStatus === 'REJECTED' ||
        (!step5.idProofVerified && Boolean(step5.idProofRejectionReason));

      if (
        profile.idProofFileUrl &&
        !profile.idProofFileUrl.startsWith('blob:') &&
        !isRejected &&
        step5.idProofVerified
      ) {
        throw new BadRequestException('An ID proof has already been uploaded and verified');
      }

      const url = `/uploads/id-proofs/${file.filename}`;
      const profileData = (profile.profileData as Record<string, any>) || {};
      await this.prisma.memberProfile.update({
        where: { id: profileId },
        data: {
          idProofFileUrl: url,
          profileData: {
            ...profileData,
            step5: {
              ...(profileData.step5 || {}),
              idProofUploaded: true,
              idProofVerified: false,
              idProofStatus: 'PENDING_REVIEW',
              idProofRejectionReason: null,
              idProofResubmittedAt: new Date().toISOString(),
              idProofVerifiedAt: null,
              idProofVerifiedBy: null,
            },
          } as any,
        },
      });

      // Task 2: Dispatch alert to assigned staff or Branch Manager
      const memberName = `${profile.firstName} ${profile.lastName}`;
      let staffToNotify: string[] = [];
      if (profile.assignedToId) {
        staffToNotify.push(profile.assignedToId);
      } else if (profile.ownerOrgId) {
        const managers = await this.prisma.user.findMany({
          where: { organizationId: profile.ownerOrgId, role: 'BRANCH_MANAGER', status: 'ACTIVE' },
          select: { id: true },
        });
        staffToNotify = managers.map((m) => m.id);
      }
      if (staffToNotify.length === 0) {
        const admins = await this.prisma.user.findMany({
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
          take: 2,
        });
        staffToNotify = admins.map((a) => a.id);
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      for (const recipientId of staffToNotify) {
        const idempotencyKey = `ID_RESUBMIT_${profileId}_${recipientId}_${todayStr}`;
        await this.prisma.notificationLog.upsert({
          where: { idempotencyKey },
          create: {
            type: 'ID_PROOF_RESUBMITTED',
            channel: 'APP_PUSH',
            recipientUserId: recipientId,
            recipientMemberProfileId: profileId,
            recipientContact: recipientId,
            recipientName: 'Staff Reviewer',
            title: `ID Proof Resubmitted: ${profile.memberId || memberName}`,
            content: `Member ${memberName} (${profile.memberId || profileId}) has uploaded a new ID proof document for verification.`,
            status: 'SENT',
            provider: 'SYSTEM_INTERNAL',
            idempotencyKey,
            metadata: { profileId, memberName, action: 'ID_PROOF_RESUBMITTED' },
            sentAt: new Date(),
          },
          update: {
            sentAt: new Date(),
          },
        });
      }

      return { url, filename: file.filename };
    } catch (error) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw error;
    }
  }

  async getIdProof(profileId: string, actor: any) {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile?.idProofFileUrl) throw new NotFoundException('ID proof not found');
    await this.scopeGuard.requireProfileOwnership(actor.id, actor.role, profileId);
    await this.scopeGuard.requireOrganizationScope(
      actor.role,
      actor.organizationId,
      profileId,
      actor.id,
    );

    const filename = path.basename(profile.idProofFileUrl);
    const directory = path.resolve(process.cwd(), 'uploads', 'id-proofs');
    const filePath = path.resolve(directory, filename);
    if (!filename || !filePath.startsWith(`${directory}${path.sep}`) || !fs.existsSync(filePath)) {
      throw new NotFoundException('ID proof file not found');
    }

    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === '.pdf' ? 'application/pdf'
      : extension === '.png' ? 'image/png'
        : extension === '.webp' ? 'image/webp'
          : 'image/jpeg';
    return { filePath, filename, contentType };
  }

  /**
   * Delete an old file from disk (e.g., when replacing a photo)
   */
  deleteFile(filePath: string) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (err) {
      console.error('[UploadService] Failed to delete file:', err);
    }
  }
}
