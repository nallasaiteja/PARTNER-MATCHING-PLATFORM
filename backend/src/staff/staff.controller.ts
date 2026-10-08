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
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, Permission } from '../common/constants/roles.constants';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  /**
   * GET /api/v1/staff
   * List staff (SUPER_ADMIN, ADMIN: all; FRANCHISE_MANAGER: own franchise only)
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  listStaff(@CurrentUser() user: any) {
    return this.staffService.listStaff(user);
  }

  /**
   * GET /api/v1/staff/:id
   */
  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  getStaff(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.getStaff(user, id);
  }

  /**
   * POST /api/v1/staff
   * Create staff - only SUPER_ADMIN, ADMIN, FRANCHISE_MANAGER (own franchise)
   */
  @Post()
  @RequirePermission(Permission.STAFF_CREATE)
  createStaff(
    @CurrentUser() user: any,
    @Body() dto: CreateStaffDto,
    @Req() req: any,
  ) {
    return this.staffService.createStaff(user, dto, req.ip);
  }

  /**
   * PATCH /api/v1/staff/:id
   * Update staff - only SUPER_ADMIN, ADMIN, FRANCHISE_MANAGER (own franchise)
   */
  @Patch(':id')
  @RequirePermission(Permission.STAFF_EDIT)
  updateStaff(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @Req() req: any,
  ) {
    return this.staffService.updateStaff(user, id, dto, req.ip);
  }

  /**
   * PATCH /api/v1/staff/:id/block
   * Block staff account
   */
  @Patch(':id/block')
  @RequirePermission(Permission.STAFF_BLOCK)
  @HttpCode(HttpStatus.OK)
  blockStaff(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.staffService.blockStaff(user, id, req.ip);
  }

  /**
   * PATCH /api/v1/staff/:id/terminate
   * Terminate staff account
   */
  @Patch(':id/terminate')
  @RequirePermission(Permission.STAFF_TERMINATE)
  @HttpCode(HttpStatus.OK)
  terminateStaff(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.staffService.terminateStaff(user, id, req.ip);
  }
}
