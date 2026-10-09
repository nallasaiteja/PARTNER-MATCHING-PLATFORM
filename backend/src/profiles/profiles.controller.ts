import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import {
  CreateProfileDto,
  UpdateProfileDto,
  BlockProfileDto,
} from './dto/profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission, Role } from '../common/constants/roles.constants';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * GET /api/v1/profiles
   * List profiles scoped to actor's role/org
   */
  @Get()
  @RequirePermission(Permission.PROFILE_VIEW)
  listProfiles(
    @CurrentUser() user: any,
    @Query('id') id?: string,
  ) {
    return this.profilesService.listProfiles(user, id);
  }

  /**
   * GET /api/v1/profiles/me
   * Get member profile of currently authenticated user
   */
  @Get('me')
  @RequirePermission(Permission.PROFILE_VIEW)
  getMyProfile(@CurrentUser() user: any) {
    return this.profilesService.getMyProfile(user);
  }

  /**
   * GET /api/v1/profiles/:id
   * Get a single profile
   */
  @Get(':id')
  @RequirePermission(Permission.PROFILE_VIEW)
  getProfile(@CurrentUser() user: any, @Param('id') id: string) {
    return this.profilesService.getProfileById(user, id);
  }

  /**
   * POST /api/v1/profiles
   * Create member profile
   */
  @Post()
  @RequirePermission(Permission.PROFILE_CREATE)
  createProfile(
    @CurrentUser() user: any,
    @Body() dto: CreateProfileDto,
    @Req() req: any,
  ) {
    return this.profilesService.createProfile(user, dto, req.ip);
  }

  /**
   * PATCH /api/v1/profiles/:id
   * Update member profile
   */
  @Patch(':id')
  @RequirePermission(Permission.PROFILE_EDIT)
  updateProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateProfileDto,
    @Req() req: any,
  ) {
    return this.profilesService.updateProfile(user, id, dto, req.ip);
  }

  /**
   * PATCH /api/v1/profiles/:id/block
   * Block a member profile
   * BRANCH_MANAGER, FRANCHISE_MANAGER, ADMIN, SUPER_ADMIN only
   */
  @Patch(':id/block')
  @RequirePermission(Permission.MEMBER_BLOCK)
  @HttpCode(HttpStatus.OK)
  blockProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: BlockProfileDto,
    @Req() req: any,
  ) {
    return this.profilesService.blockProfile(user, id, dto, req.ip);
  }

  /**
   * PATCH /api/v1/profiles/:id/unblock
   * Unblock a member profile — SUPER_ADMIN and ADMIN ONLY
   */
  @Patch(':id/unblock')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @RequirePermission(Permission.MEMBER_UNBLOCK)
  @HttpCode(HttpStatus.OK)
  unblockProfile(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.profilesService.unblockProfile(user, id, req.ip);
  }

  /**
   * GET /api/v1/profiles/export
   * Export member data — SUPER_ADMIN and ADMIN ONLY
   */
  @Get('export/data')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @RequirePermission(Permission.MEMBER_EXPORT)
  exportProfiles(
    @CurrentUser() user: any,
    @Query('format') format: string = 'json',
    @Req() req: any,
  ) {
    return this.profilesService.exportProfiles(user, format, req.ip);
  }

  /**
   * PATCH /api/v1/profiles/:id/transfer-to-hq
   * Transfer profile ownership to HQ (when member becomes paid)
   * ADMIN and SUPER_ADMIN only
   */
  @Patch(':id/transfer-to-hq')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  transferToHq(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.profilesService.transferToHq(user, id, req.ip);
  }
}
