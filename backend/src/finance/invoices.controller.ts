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
import { InvoicesService } from './invoices.service';
import {
  RaiseInvoiceRequestDto,
  ApproveInvoiceDto,
  RejectInvoiceDto,
  EditInvoiceDto,
  FilterInvoicesDto,
} from './dto/finance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * POST /api/v1/invoices/request
   * Step 1: Authorized staff raises an invoice request with trusted package price
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  raiseRequest(
    @CurrentUser() user: any,
    @Body() dto: RaiseInvoiceRequestDto,
    @Req() req: any,
  ) {
    return this.invoicesService.raiseInvoiceRequest(user, dto, req.ip);
  }

  /**
   * GET /api/v1/invoices
   * List invoices with search, filters, and backend pagination
   */
  @Get()
  listInvoices(
    @CurrentUser() user: any,
    @Query() filter: FilterInvoicesDto,
  ) {
    return this.invoicesService.listInvoices(user, filter);
  }

  /**
   * GET /api/v1/invoices/pending
   * List pending invoice requests waiting for HQ / Franchise approval
   */
  @Get('pending')
  listPending(@CurrentUser() user: any) {
    return this.invoicesService.listPendingRequests(user);
  }

  /**
   * GET /api/v1/invoices/export
   * Bulk download invoices in Excel (CSV) format — Super Admin and Admin only
   */
  @Get('export')
  exportInvoices(
    @CurrentUser() user: any,
    @Query() filter: FilterInvoicesDto,
  ) {
    return this.invoicesService.exportInvoices(user, filter);
  }

  /**
   * GET /api/v1/invoices/member-status
   * Date-wise list of members with invoices vs members without invoices
   */
  @Get('member-status')
  getMembersInvoiceStatus(
    @CurrentUser() user: any,
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    return this.invoicesService.getMembersInvoiceStatus(user, query);
  }

  /**
   * GET /api/v1/invoices/:id
   * Single invoice details with audit trail
   */
  @Get(':id')
  getDetail(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.getInvoiceDetail(user, id);
  }

  /**
   * POST /api/v1/invoices/:id/approve
   * Steps 2 & 3: Approve & Finalize invoice (HQ for branch, Franchise Manager for franchise with wallet check)
   */
  @Post(':id/approve')
  approveInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ApproveInvoiceDto,
    @Req() req: any,
  ) {
    return this.invoicesService.approveInvoice(user, id, dto, req.ip);
  }

  /**
   * POST /api/v1/invoices/:id/reject
   * Reject invoice request with reason, approver, and timestamp
   */
  @Post(':id/reject')
  rejectInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RejectInvoiceDto,
    @Req() req: any,
  ) {
    return this.invoicesService.rejectInvoice(user, id, dto, req.ip);
  }

  /**
   * PATCH /api/v1/invoices/:id
   * Edit existing invoice (Super Admin / Admin only with audit trail)
   */
  @Patch(':id')
  editInvoice(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: EditInvoiceDto,
    @Req() req: any,
  ) {
    return this.invoicesService.editInvoice(user, id, dto, req.ip);
  }
}
