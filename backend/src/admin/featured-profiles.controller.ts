import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FeaturedProfilesService } from './featured-profiles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/featured-profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeaturedProfilesController {
  constructor(private readonly featuredService: FeaturedProfilesService) {}

  @Get('active')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  async getActiveFeatured() {
    return this.featuredService.getActiveFeaturedProfiles();
  }

  @Get('report')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getReport() {
    return this.featuredService.getFeaturedReport();
  }

  @Post(':profileId/feature')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async featureProfile(
    @Param('profileId') profileId: string,
    @Body() body: { validityDays: number; notes?: string },
    @CurrentUser() user: any,
  ) {
    const actorId = user?.id || 'admin-system';
    const days = body.validityDays || 30;
    return this.featuredService.markAsFeatured(profileId, actorId, days, body.notes);
  }

  @Patch(':profileId/unfeature')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async unfeatureProfile(@Param('profileId') profileId: string) {
    return this.featuredService.unfeatureProfile(profileId);
  }

  @Patch('settings/limit')
  @Roles(Role.SUPER_ADMIN)
  async updateMaxLimit(@Body('limit') limit: number) {
    return this.featuredService.updateMaxFeaturedLimit(limit);
  }
}
