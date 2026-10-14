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
import { StaffService } from './staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  RequestStaffOtpDto,
  AddStaffSalaryDto,
  SetStaffAccessRuleDto,
} from './dto/staff.dto';
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
   * POST /api/v1/staff/request-otp
   * Request OTP for staff creation verification
   */
  @Post('request-otp')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  @HttpCode(HttpStatus.OK)
  requestStaffOtp(@Body() dto: RequestStaffOtpDto) {
    return this.staffService.requestStaffOtp(dto.mobile);
  }

  /**
   * GET /api/v1/staff
   * List staff (with optional ?status=ACTIVE|BLOCKED|SUSPENDED|TERMINATED)
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  listStaff(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.staffService.listStaff(user, status);
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
   * GET /api/v1/staff/:id/activity
   * View staff activity history (profiles created, edited, visited, blocked, payments processed)
   */
  @Get(':id/activity')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  getStaffActivity(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.getStaffActivityHistory(user, id);
  }

  /**
   * GET /api/v1/staff/:id/salary
   * View month-wise and package-wise salary/payment history
   */
  @Get(':id/salary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.FRANCHISE_MANAGER)
  getStaffSalary(@CurrentUser() user: any, @Param('id') id: string) {
    return this.staffService.getStaffSalaryHistory(user, id);
  }

  /**
   * POST /api/v1/staff/:id/salary
   * Record salary / commission payment
   */
  @Post(':id/salary')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  addStaffSalary(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddStaffSalaryDto,
  ) {
    return this.staffService.addStaffSalary(user, id, dto);
  }

  /**
   * POST /api/v1/staff/:id/access-rules
   * Configure staff profile access permissions by ID range, caste, gender, custom series
   */
  @Post(':id/access-rules')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  setStaffAccessRule(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SetStaffAccessRuleDto,
  ) {
    return this.staffService.setStaffAccessRule(user, id, dto);
  }

  /**
   * POST /api/v1/staff
   * Create staff - only SUPER_ADMIN, ADMIN, FRANCHISE_MANAGER (own franchise)
   * Enforces Aadhaar upload & OTP verification
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
   * Update staff
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
