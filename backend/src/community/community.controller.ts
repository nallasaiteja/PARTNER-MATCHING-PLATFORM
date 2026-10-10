import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CommunityMasterLevel } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles.constants';
import { CreateCommunityMasterDto, UpdateCommunityMasterDto } from './community.dto';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get()
  list(@Query('parentId') parentId?: string, @Query('level') level?: CommunityMasterLevel) {
    return this.communityService.list(parentId, level);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  create(@Body() dto: CreateCommunityMasterDto) {
    return this.communityService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCommunityMasterDto) {
    return this.communityService.update(id, dto);
  }
}