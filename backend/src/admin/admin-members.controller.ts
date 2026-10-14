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
import { AdminMembersService } from './admin-members.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminMembersController {
  constructor(private readonly membersService: AdminMembersService) {}

  /**
   * GET /api/v1/admin/members
   * List members with views: ALL, FREE, PAID, BLOCKED, TERMINATED, CONVERTED
   */
  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.FRANCHISE_MANAGER,
    Role.FRANCHISE_STAFF,
  )
  listMembers(
    @CurrentUser() user: any,
    @Query('type') type?: 'ALL' | 'FREE' | 'PAID' | 'BLOCKED' | 'TERMINATED' | 'CONVERTED',
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.membersService.listMembers(user, { type, search, page, limit });
  }

  /**
   * PATCH /api/v1/admin/members/:id/block
   * Block member profile (Any staff can block; records staff ID, timestamp, reason, sends SMS)
   */
  @Patch(':id/block')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.FRANCHISE_MANAGER,
    Role.FRANCHISE_STAFF,
  )
  @HttpCode(HttpStatus.OK)
  blockMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.membersService.blockMember(user, id, reason, req.ip);
  }

  /**
   * PATCH /api/v1/admin/members/:id/unblock
   * Strictly reserved for Super Admin and Admin only
   */
  @Patch(':id/unblock')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  unblockMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.membersService.unblockMember(user, id, req.ip);
  }

  /**
   * POST /api/v1/admin/members/:id/request-closure
   * Member or staff requests profile closure
   */
  @Post(':id/request-closure')
  @HttpCode(HttpStatus.OK)
  requestClosure(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.membersService.requestProfileClosure(user, id, reason, req.ip);
  }

  /**
   * PATCH /api/v1/admin/members/:id/approve-closure
   * Staff/Admin approves profile closure
   */
  @Patch(':id/approve-closure')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER, Role.HQ_SERVICE_TEAM)
  @HttpCode(HttpStatus.OK)
  approveClosure(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.membersService.approveProfileClosure(user, id, req.ip);
  }

  /**
   * POST /api/v1/admin/members/:id/mark-paid
   * Mark member as paid with facilitating staff ID
   */
  @Post(':id/mark-paid')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER, Role.FRANCHISE_MANAGER)
  @HttpCode(HttpStatus.OK)
  markMemberAsPaid(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: { packageId: string; facilitatingStaffId: string; paymentMode?: string; notes?: string },
    @Req() req: any,
  ) {
    return this.membersService.markMemberAsPaid(user, id, dto, req.ip);
  }

  /**
   * GET /api/v1/admin/members/:id/notes
   * Confidential CRM internal notes
   */
  @Get(':id/notes')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.FRANCHISE_MANAGER,
    Role.FRANCHISE_STAFF,
  )
  getInternalNotes(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.membersService.getInternalNotes(user, id);
  }

  /**
   * POST /api/v1/admin/members/:id/notes
   * Add internal note
   */
  @Post(':id/notes')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
    Role.FRANCHISE_MANAGER,
    Role.FRANCHISE_STAFF,
  )
  @HttpCode(HttpStatus.CREATED)
  addInternalNote(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.membersService.addInternalNote(user, id, note);
  }

  /**
   * POST /api/v1/admin/members/:id/update-requests
   * Member submits profile update request
   */
  @Post(':id/update-requests')
  submitUpdateRequest(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() requestedData: any,
  ) {
    return this.membersService.submitUpdateRequest(user, id, requestedData);
  }

  /**
   * GET /api/v1/admin/members/update-requests/list
   * List profile update requests
   */
  @Get('update-requests/list')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.HQ_SERVICE_TEAM,
    Role.BRANCH_MANAGER,
    Role.BRANCH_STAFF,
  )
  listUpdateRequests(
    @CurrentUser() user: any,
    @Query('status') status?: string,
  ) {
    return this.membersService.listUpdateRequests(user, status);
  }

  /**
   * PATCH /api/v1/admin/members/update-requests/:requestId/review
   * Accept or dismiss profile update request
   */
  @Patch('update-requests/:requestId/review')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER, Role.HQ_SERVICE_TEAM)
  reviewUpdateRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
    @Body() body: { action: 'APPROVED' | 'DISMISSED'; dismissReason?: string },
    @Req() req: any,
  ) {
    return this.membersService.reviewUpdateRequest(
      user,
      requestId,
      body.action,
      body.dismissReason,
      req.ip,
    );
  }
}
