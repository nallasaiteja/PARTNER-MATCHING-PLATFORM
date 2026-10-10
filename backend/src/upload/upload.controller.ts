import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Get,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/constants/roles.constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('id-proof/:profileId')
  @RequirePermission(Permission.PROFILE_VIEW)
  async downloadIdProof(
    @Param('profileId') profileId: string,
    @CurrentUser() user: any,
  ) {
    const file = await this.uploadService.getIdProof(profileId, user);
    return new StreamableFile(fs.createReadStream(file.filePath), {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  /**
   * POST /api/v1/uploads/photo/:profileId
   * Upload and save a member profile photo.
   * Requires PROFILE_EDIT or PROFILE_CREATE permission.
   */
  @Post('photo/:profileId')
  @RequirePermission(Permission.PROFILE_CREATE)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'photos');
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const profileId = req.params.profileId || 'draft';
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${profileId}-photo${ext}`);
        },
      }),
      limits: { fileSize: 500 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Param('profileId') profileId: string,
    @Req() req: any,
  ) {
    return this.uploadService.savePhoto(file, profileId);
  }

  /**
  * POST /api/v1/uploads/id-proof/:profileId
  * Upload an ID proof to a profile the actor is allowed to edit.
   */
  @Post('id-proof/:profileId')
  @RequirePermission(Permission.PROFILE_EDIT)
  @UseInterceptors(
    FileInterceptor('idProof', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'id-proofs');
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const profileId = req.params.profileId || 'draft';
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${profileId}-idproof-${Date.now()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for ID proof (PDF can be larger)
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new Error('Only JPG, PNG, WEBP or PDF files allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadIdProof(
    @UploadedFile() file: Express.Multer.File,
    @Param('profileId') profileId: string,
    @CurrentUser() user: any,
  ) {
    return this.uploadService.saveIdProof(file, profileId, user);
  }
}
