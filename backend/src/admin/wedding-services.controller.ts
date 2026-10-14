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
import { WeddingServicesService } from './wedding-services.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/wedding-services')
export class WeddingServicesController {
  constructor(private readonly weddingService: WeddingServicesService) {}

  // ─── ADMIN MANAGEMENT ──────────────────────────────────────

  @Get('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getAdminList(
    @Query('category') category?: string,
    @Query('isFeatured') isFeatured?: string,
  ) {
    const featuredBool = isFeatured !== undefined ? isFeatured === 'true' : undefined;
    return this.weddingService.getAllServicesAdmin(category, featuredBool);
  }

  @Get('report')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getFinancialReport() {
    return this.weddingService.getPartnershipFinancialReport();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async createService(@Body() body: any) {
    return this.weddingService.createService(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateService(@Param('id') id: string, @Body() body: any) {
    return this.weddingService.updateService(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteService(@Param('id') id: string) {
    return this.weddingService.deleteService(id);
  }

  // ─── DIRECTORY (PUBLIC / MEMBER WITH TIER ENFORCEMENT) ─────

  @Get('directory')
  async getDirectory(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('isPaid') isPaid?: string,
  ) {
    const isPaidUser = isPaid === 'true';
    return this.weddingService.getDirectory(category, city, isPaidUser);
  }
}
