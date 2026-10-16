import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { SuccessStoriesService } from './success-stories.service';
import {
  CreateSuccessStoryDto,
  UpdateSuccessStoryDto,
  QuerySuccessStoryDto,
} from './dto/success-story.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

@Controller('success-stories')
export class SuccessStoriesController {
  constructor(private readonly successStoriesService: SuccessStoriesService) {}

  /**
   * Public: List all approved/published success stories
   */
  @Get()
  async getPublicStories(@Query() query: QuerySuccessStoryDto) {
    return this.successStoriesService.findAllPublic(query);
  }

  /**
   * Admin: List all success stories (including drafts)
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  async getAdminStories(@Query() query: QuerySuccessStoryDto) {
    return this.successStoriesService.findAllAdmin(query);
  }

  /**
   * Public or Admin: Get single success story
   */
  @Get(':id')
  async getStory(@Param('id') id: string) {
    return this.successStoriesService.findOne(id, false);
  }

  /**
   * Admin: Create a new success story
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async createStory(
    @Body() dto: CreateSuccessStoryDto,
    @CurrentUser() user: any,
  ) {
    return this.successStoriesService.create(dto, user);
  }

  /**
   * Admin: Upload couple photo
   */
  @Post('upload-photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'photos', 'stories');
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `story-couple-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('Only image files are allowed') as any, false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No photo uploaded');
    const relativeUrl = `/uploads/photos/stories/${file.filename}`;
    return { url: relativeUrl, filename: file.filename };
  }

  /**
   * Admin: Update success story
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateStory(
    @Param('id') id: string,
    @Body() dto: UpdateSuccessStoryDto,
    @CurrentUser() user: any,
  ) {
    return this.successStoriesService.update(id, dto, user);
  }

  /**
   * Admin: Toggle publish status
   */
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async togglePublish(
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
    @CurrentUser() user: any,
  ) {
    return this.successStoriesService.togglePublish(id, Boolean(isPublished), user);
  }

  /**
   * Admin: Delete success story
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteStory(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.successStoriesService.delete(id, user);
  }
}
