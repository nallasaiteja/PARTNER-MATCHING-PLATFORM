import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Validate it's an image
    if (!file.mimetype.startsWith('image/')) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Only image files are allowed for profile photos');
    }

    // Max 2MB on server side (frontend should compress to 500KB, but allow some margin)
    if (file.size > 2 * 1024 * 1024) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Photo file too large. Maximum size is 2MB.');
    }

    const url = `/uploads/photos/${file.filename}`;

    // Update the MemberProfile record
    try {
      await this.prisma.memberProfile.update({
        where: { id: profileId },
        data: {
          photoUrl: url,
          photoFilename: file.filename,
        },
      });
    } catch {
      // Profile may not exist yet (draft mode); that's OK
    }

    return { url, filename: file.filename };
  }

  /**
   * Save uploaded ID proof document and update MemberProfile.idProofFileUrl
   */
  async saveIdProof(
    file: Express.Multer.File,
    profileId: string,
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

    const url = `/uploads/id-proofs/${file.filename}`;

    try {
      await this.prisma.memberProfile.update({
        where: { id: profileId },
        data: { idProofFileUrl: url },
      });
    } catch {
      // Profile may not exist yet; that's OK
    }

    return { url, filename: file.filename };
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
