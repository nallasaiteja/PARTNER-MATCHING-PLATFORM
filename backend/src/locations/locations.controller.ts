import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationLevel } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';
import { CreateLocationDto, UpdateLocationDto } from './location.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  list(@Query('parentId') parentId?: string, @Query('level') level?: LocationLevel) {
    return this.locationsService.list(parentId, level);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.locationsService.update(id, dto);
  }
}