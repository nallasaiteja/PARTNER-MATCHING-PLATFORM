import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import {
  ApplyLeaveDto,
  ReviewLeaveDto,
  ManualAttendanceCorrectionDto,
  QueryLeaveDto,
  QueryAttendanceDto,
} from './dto/leave-management.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('leave')
@UseGuards(JwtAuthGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  /**
   * Staff: Apply for leave
   */
  @Post('apply')
  async applyLeave(@CurrentUser() user: any, @Body() dto: ApplyLeaveDto) {
    return this.leaveService.applyLeave(user, dto);
  }

  /**
   * Staff: View own leave applications
   */
  @Get('my-leaves')
  async getMyLeaves(@CurrentUser() user: any, @Query() query: QueryLeaveDto) {
    return this.leaveService.getMyLeaves(user, query);
  }

  /**
   * Staff: Cancel own pending leave
   */
  @Patch(':id/cancel')
  async cancelMyLeave(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leaveService.cancelMyLeave(user, id);
  }

  /**
   * Branch Manager / HQ Admin: List leave applications (branch scoped)
   */
  @Get('list')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async listLeaves(@CurrentUser() user: any, @Query() query: QueryLeaveDto) {
    return this.leaveService.listLeaves(user, query);
  }

  /**
   * Branch Manager / HQ Admin: Review leave application (approve/reject)
   */
  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async reviewLeave(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.reviewLeave(user, id, dto);
  }

  /**
   * Branch Manager / HQ Admin: List staff attendance records
   */
  @Get('attendance')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async listAttendance(
    @CurrentUser() user: any,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.leaveService.listAttendance(user, query);
  }

  /**
   * Branch Manager / HQ Admin: Correct attendance manually
   */
  @Post('attendance/manual-correct')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  async manualCorrectAttendance(
    @CurrentUser() user: any,
    @Body() dto: ManualAttendanceCorrectionDto,
  ) {
    return this.leaveService.manualCorrectAttendance(user, dto);
  }

  /**
   * Staff: Record daily login ping for computed attendance
   */
  @Post('attendance/login-ping')
  async recordLoginPing(@CurrentUser() user: any) {
    return this.leaveService.recordStaffLogin(user);
  }
}
