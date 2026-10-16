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
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';
import { BranchService } from './branch.service';
import {
  VerifyMemberIdProofDto,
  BlockMemberProfileDto,
  EditMemberDobDto,
  UpdateMemberMobileDto,
  ResetMemberPasswordDto,
  RaiseBranchInvoiceDto,
  SubmitLeaveApplicationDto,
  ReviewLeaveApplicationDto,
  CreatePaymentAlertDto,
} from './dto/branch.dto';

@Controller('branch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // --------------------------------------------------------------------------
  // 1. DASHBOARD OVERVIEW & METRICS
  // --------------------------------------------------------------------------

  @Get('dashboard')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  getBranchDashboard(@CurrentUser() user: any) {
    return this.branchService.getBranchDashboard(user);
  }

  // --------------------------------------------------------------------------
  // 2. BRANCH MEMBERS
  // --------------------------------------------------------------------------

  @Get('members')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.SUPER_ADMIN, Role.ADMIN)
  getBranchMembers(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('packageType') packageType?: string,
    @Query('isBlocked') isBlocked?: string,
    @Query('idProofStatus') idProofStatus?: 'PENDING' | 'VERIFIED' | 'MISSING',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.branchService.getBranchMembers(user, {
      search,
      packageType,
      isBlocked: isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
      idProofStatus,
      page,
      limit,
    });
  }

  // --------------------------------------------------------------------------
  // 3. ID PROOF REVIEW & VERIFICATION
  // --------------------------------------------------------------------------

  @Get('verifications')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  getPendingVerifications(@CurrentUser() user: any) {
    return this.branchService.getPendingVerifications(user);
  }

  @Post('verifications/:profileId')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  verifyMemberIdProof(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
    @Body() dto: VerifyMemberIdProofDto,
    @Req() req: any,
  ) {
    return this.branchService.verifyMemberIdProof(user, profileId, dto, req.ip);
  }

  // --------------------------------------------------------------------------
  // 4. MEMBER PROFILE BLOCKING & STRICT UNBLOCK FORBIDDEN
  // --------------------------------------------------------------------------

  @Post('members/:profileId/block')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  blockMemberProfile(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
    @Body() dto: BlockMemberProfileDto,
    @Req() req: any,
  ) {
    return this.branchService.blockMemberProfile(user, profileId, dto, req.ip);
  }

  @Post('members/:profileId/unblock')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  unblockMemberProfile(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
  ) {
    return this.branchService.unblockMemberProfile(user, profileId);
  }

  // --------------------------------------------------------------------------
  // 5. CHANGE MEMBER DATE OF BIRTH & UPDATE PHONE NUMBER
  // --------------------------------------------------------------------------

  @Patch('members/:profileId/dob')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  changeMemberDob(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
    @Body() dto: EditMemberDobDto,
    @Req() req: any,
  ) {
    return this.branchService.changeMemberDob(user, profileId, dto, req.ip);
  }

  @Patch('members/:profileId/mobile')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  updateMemberMobile(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
    @Body() dto: UpdateMemberMobileDto,
    @Req() req: any,
  ) {
    return this.branchService.updateMemberMobile(user, profileId, dto, req.ip);
  }

  // --------------------------------------------------------------------------
  // 6. MEMBER CREDENTIALS & SECURE PASSWORD ASSISTANCE
  // --------------------------------------------------------------------------

  @Get('members/:profileId/account-info')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  getMemberAccountInfo(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
  ) {
    return this.branchService.getMemberAccountInfo(user, profileId);
  }

  @Post('members/:profileId/reset-password')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  resetMemberPassword(
    @CurrentUser() user: any,
    @Param('profileId') profileId: string,
    @Body() dto: ResetMemberPasswordDto,
    @Req() req: any,
  ) {
    return this.branchService.resetMemberPassword(user, profileId, dto, req.ip);
  }

  // --------------------------------------------------------------------------
  // 7. RESTRICTED OPERATIONS: CREATE/TERMINATE STAFF & DIRECT INVOICE APPROVAL
  // --------------------------------------------------------------------------

  @Post('staff/create')
  @Roles(Role.BRANCH_MANAGER)
  createStaffProfile() {
    return this.branchService.createStaffProfileForbidden();
  }

  @Post('staff/:staffId/terminate')
  @Roles(Role.BRANCH_MANAGER)
  terminateStaffProfile() {
    return this.branchService.terminateStaffProfileForbidden();
  }

  @Post('invoices/:invoiceId/approve')
  @Roles(Role.BRANCH_MANAGER)
  approveInvoiceDirectly() {
    return this.branchService.approveInvoiceDirectlyForbidden();
  }

  // --------------------------------------------------------------------------
  // 8. BRANCH SALES AND STAFF-WISE SALES
  // --------------------------------------------------------------------------

  @Get('sales')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  getBranchSales(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.branchService.getBranchSales(user, { startDate, endDate, staffId });
  }

  // --------------------------------------------------------------------------
  // 9. INVOICE REQUEST WORKFLOW & 72-HOUR AUTO-CANCEL
  // --------------------------------------------------------------------------

  @Post('invoices')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.BRANCH_AGENT, Role.SUPER_ADMIN, Role.ADMIN)
  raiseBranchInvoice(
    @CurrentUser() user: any,
    @Body() dto: RaiseBranchInvoiceDto,
    @Req() req: any,
  ) {
    return this.branchService.raiseBranchInvoice(user, dto, req.ip);
  }

  @Post('invoices/auto-cancel-check')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  triggerAutoCancel(@CurrentUser() user: any) {
    return this.branchService.autoCancelExpiredBranchInvoices(user);
  }

  // --------------------------------------------------------------------------
  // 10. STAFF ATTENDANCE TRACKING (8.2)
  // --------------------------------------------------------------------------

  @Get('attendance')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  getStaffAttendance(
    @CurrentUser() user: any,
    @Query('date') date?: string,
  ) {
    return this.branchService.getStaffAttendance(user, date);
  }

  @Post('attendance/log')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.BRANCH_AGENT)
  logAttendanceActivity(@CurrentUser() user: any) {
    return this.branchService.logStaffAttendanceActivity(user);
  }

  // --------------------------------------------------------------------------
  // 11. STAFF LEAVE MANAGEMENT (8.2)
  // --------------------------------------------------------------------------

  @Get('leaves')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.SUPER_ADMIN, Role.ADMIN)
  getBranchLeaves(@CurrentUser() user: any) {
    return this.branchService.getBranchLeaves(user);
  }

  @Post('leaves')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.BRANCH_AGENT)
  submitLeaveApplication(
    @CurrentUser() user: any,
    @Body() dto: SubmitLeaveApplicationDto,
  ) {
    return this.branchService.submitLeaveApplication(user, dto);
  }

  @Patch('leaves/:leaveId/review')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  reviewLeaveApplication(
    @CurrentUser() user: any,
    @Param('leaveId') leaveId: string,
    @Body() dto: ReviewLeaveApplicationDto,
  ) {
    return this.branchService.reviewLeaveApplication(user, leaveId, dto);
  }

  // --------------------------------------------------------------------------
  // 12. BRANCH-LEVEL PAYMENT ALERTS & NOTIFICATIONS (8.3 & 9)
  // --------------------------------------------------------------------------

  @Get('payment-alerts')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.SUPER_ADMIN, Role.ADMIN)
  getBranchPaymentAlerts(@CurrentUser() user: any) {
    return this.branchService.getBranchPaymentAlerts(user);
  }

  @Post('payment-alerts')
  @Roles(Role.BRANCH_MANAGER, Role.BRANCH_STAFF, Role.SUPER_ADMIN, Role.ADMIN)
  createPaymentAlert(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentAlertDto,
  ) {
    return this.branchService.createPaymentAlert(user, dto);
  }

  @Post('payment-alerts/trigger')
  @Roles(Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.ADMIN)
  triggerAlertNotifications(@CurrentUser() user: any) {
    return this.branchService.triggerAlertNotifications(user);
  }
}
