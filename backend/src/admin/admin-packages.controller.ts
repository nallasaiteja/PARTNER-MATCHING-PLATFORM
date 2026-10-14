import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminPackagesService } from './admin-packages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPackagesController {
  constructor(private readonly packagesService: AdminPackagesService) {}

  @Get()
  listAllPackages() {
    return this.packagesService.listAllPackages();
  }

  @Get(':id')
  getPackage(@Param('id') id: string) {
    return this.packagesService.getPackage(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createPackage(
    @CurrentUser() user: any,
    @Body() dto: {
      name: string;
      validityDays: number;
      contactReveals: number;
      ticketQuota?: number;
      emiEligible?: boolean;
      cost: number;
      servicesProvided: string;
      featuredProfileEligible?: boolean;
    },
    @Req() req: any,
  ) {
    return this.packagesService.createPackage(user, dto, req.ip);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updatePackage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.packagesService.updatePackage(user, id, dto, req.ip);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  deletePackage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.packagesService.deleteOrDeactivatePackage(user, id, req.ip);
  }
}
