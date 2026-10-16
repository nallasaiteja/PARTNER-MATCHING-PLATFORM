import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';
import { ReportsService } from './reports.service';
import {
  DateFilterDto,
  MemberDataFilterDto,
  MemberDownloadFilterDto,
  SalesRevenueFilterDto,
  StaffActivityFilterDto,
} from './dto/report-filters.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // --------------------------------------------------------------------------
  // 1. MEMBER DATA REPORTS
  // --------------------------------------------------------------------------

  @Get('organizations')
  getOrganizations() {
    return this.reportsService.getOrganizations();
  }

  @Get('members/unverified-ids')
  getUnverifiedIdProofs(
    @CurrentUser() user: any,
    @Query() filter: MemberDataFilterDto,
  ) {
    return this.reportsService.getUnverifiedIdProofs(user, filter);
  }

  @Get('members/no-photos')
  getProfilesWithoutPhotos(
    @CurrentUser() user: any,
    @Query() filter: MemberDataFilterDto,
  ) {
    return this.reportsService.getProfilesWithoutPhotos(user, filter);
  }

  @Get('members/below-30')
  getProfilesBelow30(
    @CurrentUser() user: any,
    @Query() filter: MemberDataFilterDto,
  ) {
    return this.reportsService.getProfilesBelow30(user, filter);
  }

  @Get('members/incomplete-summary')
  getIncompleteProfileSummary(
    @CurrentUser() user: any,
    @Query() filter: MemberDataFilterDto,
  ) {
    return this.reportsService.getIncompleteProfileSummary(user, filter);
  }

  // --------------------------------------------------------------------------
  // 2. SALES AND REVENUE REPORTS
  // --------------------------------------------------------------------------

  @Get('sales/branch-revenue')
  getBranchRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: SalesRevenueFilterDto,
  ) {
    return this.reportsService.getBranchRevenueReport(user, filter);
  }

  @Get('sales/agent-revenue')
  getAgentRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: SalesRevenueFilterDto,
  ) {
    return this.reportsService.getAgentRevenueReport(user, filter);
  }

  @Get('sales/franchise-revenue')
  getFranchiseRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: SalesRevenueFilterDto,
  ) {
    return this.reportsService.getFranchiseRevenueReport(user, filter);
  }

  @Get('sales/invoice-approvals')
  getInvoiceApprovalReport(
    @CurrentUser() user: any,
    @Query() filter: SalesRevenueFilterDto,
  ) {
    return this.reportsService.getInvoiceApprovalReport(user, filter);
  }

  @Get('sales/featured-profiles')
  getFeaturedProfileRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: DateFilterDto,
  ) {
    return this.reportsService.getFeaturedProfileRevenueReport(user, filter);
  }

  @Get('sales/advertisements')
  getAdvertisementRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: DateFilterDto,
  ) {
    return this.reportsService.getAdvertisementRevenueReport(user, filter);
  }

  @Get('sales/wedding-services')
  getWeddingServicesRevenueReport(
    @CurrentUser() user: any,
    @Query() filter: DateFilterDto,
  ) {
    return this.reportsService.getWeddingServicesRevenueReport(user, filter);
  }

  // --------------------------------------------------------------------------
  // 3. STAFF ACTIVITY REPORTS
  // --------------------------------------------------------------------------

  @Get('staff/visits')
  getStaffProfileVisits(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffProfileVisits(user, filter);
  }

  @Get('staff/created')
  getStaffProfilesCreated(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffProfilesCreated(user, filter);
  }

  @Get('staff/edited')
  getStaffProfilesEdited(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffProfilesEdited(user, filter);
  }

  @Get('staff/blocked')
  getStaffProfilesBlocked(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffProfilesBlocked(user, filter);
  }

  @Get('staff/payments')
  getStaffPaymentsProcessed(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffPaymentsProcessed(user, filter);
  }

  @Get('staff/cash')
  getStaffCurrencyCollected(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffCurrencyCollected(user, filter);
  }

  @Get('staff/messages')
  getStaffMessagesReceived(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffMessagesReceived(user, filter);
  }

  @Get('staff/tickets')
  getStaffTicketsResolved(
    @CurrentUser() user: any,
    @Query() filter: StaffActivityFilterDto,
  ) {
    return this.reportsService.getStaffTicketsResolved(user, filter);
  }

  // --------------------------------------------------------------------------
  // 4. MEMBER DATA DOWNLOADS
  // --------------------------------------------------------------------------

  @Get('downloads/members')
  downloadMemberData(
    @CurrentUser() user: any,
    @Query() filter: MemberDownloadFilterDto,
    @Req() req: any,
  ) {
    return this.reportsService.downloadMemberData(user, filter, req.ip);
  }

  @Get('downloads/biodata/:memberId')
  getMemberBiodata(
    @CurrentUser() user: any,
    @Param('memberId') memberId: string,
  ) {
    return this.reportsService.getMemberBiodata(user, memberId);
  }

  @Get('downloads/photos')
  getPhotosDownloadList(
    @CurrentUser() user: any,
    @Query() filter: { type?: 'MEMBERS' | 'STAFF'; branchId?: string },
  ) {
    return this.reportsService.getPhotosDownloadList(user, filter);
  }
}
