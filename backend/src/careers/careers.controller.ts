import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { CareersService } from './careers.service';
import {
  SendCareerOtpDto,
  VerifyCareerOtpDto,
  CreateCareerApplicationDto,
  BlockCareerApplicationDto,
  RegisterAsStaffDto,
  QueryCareerApplicationDto,
} from './dto/career-application.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  /**
   * Public: Request Mobile OTP for career application
   */
  @Post('otp/send')
  async sendOtp(@Body() dto: SendCareerOtpDto) {
    return this.careersService.sendOtp(dto);
  }

  /**
   * Public: Verify Mobile OTP
   */
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyCareerOtpDto) {
    return this.careersService.verifyOtp(dto);
  }

  /**
   * Public: Upload career document (ID proof, PAN card, Certificate, or Photo)
   */
  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'careers');
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `career-doc-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Only JPG, PNG, WEBP images or PDF documents are allowed.',
            ) as any,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const relativeUrl = `/uploads/careers/${file.filename}`;
    return {
      url: relativeUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    };
  }

  /**
   * Public: Submit Career Application
   */
  @Post('apply')
  async submitApplication(@Body() dto: CreateCareerApplicationDto) {
    return this.careersService.submitApplication(dto);
  }

  /**
   * Admin: List applications (filter by status, search by mobile/name/idProof)
   */
  @Get('applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async listApplications(@Query() query: QueryCareerApplicationDto) {
    return this.careersService.listApplications(query);
  }

  /**
   * Admin: View full single application
   */
  @Get('applications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getApplication(@Param('id') id: string) {
    return this.careersService.getApplication(id);
  }

  /**
   * Admin: Block application with reason
   */
  @Patch('applications/:id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async blockApplication(
    @Param('id') id: string,
    @Body() dto: BlockCareerApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.careersService.blockApplication(id, dto, user);
  }

  /**
   * Admin: Directly register an eligible applicant as staff
   */
  @Post('applications/:id/register-staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async registerAsStaff(
    @Param('id') id: string,
    @Body() dto: RegisterAsStaffDto,
    @CurrentUser() user: any,
  ) {
    return this.careersService.registerAsStaff(id, dto, user);
  }
}
