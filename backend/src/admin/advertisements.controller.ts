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
  Request,
} from '@nestjs/common';
import { AdvertisementsService } from './advertisements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/advertisements')
export class AdvertisementsController {
  constructor(private readonly adsService: AdvertisementsService) {}

  // ─── SUPER ADMIN EXCLUSIVE CRUD ─────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getAllAds(
    @Query('slot') slot?: string,
    @Query('status') status?: string,
  ) {
    return this.adsService.getAllAdvertisements(slot, status);
  }

  @Get('report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async getReport() {
    return this.adsService.getAdPerformanceReport();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createAd(@Body() body: any) {
    return this.adsService.createAdvertisement(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async updateAd(@Param('id') id: string, @Body() body: any) {
    return this.adsService.updateAdvertisement(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async deleteAd(@Param('id') id: string) {
    return this.adsService.deleteAdvertisement(id);
  }

  // ─── PUBLIC & MEMBER DISPLAY / TRACKING ─────────────────────

  @Get('slot/:slotName')
  async getAdsForSlot(
    @Param('slotName') slotName: string,
    @Query('tier') tier?: 'FREE' | 'PAID' | 'ANONYMOUS',
  ) {
    return this.adsService.getActiveAdsForSlot(slotName, tier || 'ANONYMOUS');
  }

  @Post(':id/impression')
  async trackImpression(@Param('id') id: string) {
    return this.adsService.recordImpression(id);
  }

  @Post(':id/click')
  async trackClick(@Param('id') id: string) {
    return this.adsService.recordClick(id);
  }
}
