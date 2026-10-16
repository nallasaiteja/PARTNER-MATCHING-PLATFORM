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
import { WalletsService } from './wallets.service';
import { LedgersService } from './ledgers.service';
import { CommissionsService } from './commissions.service';
import {
  TopupWalletDto,
  SetWalletLimitDto,
  SetCommissionConfigDto,
  RecordExternalRevenueDto,
} from './dto/finance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly ledgersService: LedgersService,
    private readonly commissionsService: CommissionsService,
  ) {}

  // ─── 6.8 FRANCHISE WALLET ENDPOINTS ─────────────────────────

  @Get('wallets')
  listWallets(@CurrentUser() user: any) {
    return this.walletsService.listWallets(user);
  }

  @Get('wallets/my-wallet')
  getMyWallet(@CurrentUser() user: any) {
    return this.walletsService.getMyWallet(user);
  }

  @Get('wallets/:franchiseOrgId')
  getWalletByOrgId(
    @CurrentUser() user: any,
    @Param('franchiseOrgId') franchiseOrgId: string,
  ) {
    return this.walletsService.getWalletByOrgId(user, franchiseOrgId);
  }

  @Post('wallets/:franchiseOrgId/topup')
  @HttpCode(HttpStatus.OK)
  topupWallet(
    @CurrentUser() user: any,
    @Param('franchiseOrgId') franchiseOrgId: string,
    @Body() dto: TopupWalletDto,
    @Req() req: any,
  ) {
    return this.walletsService.topupWallet(user, franchiseOrgId, dto, req.ip);
  }

  @Patch('wallets/:franchiseOrgId/limit')
  setCreditLimit(
    @CurrentUser() user: any,
    @Param('franchiseOrgId') franchiseOrgId: string,
    @Body() dto: SetWalletLimitDto,
    @Req() req: any,
  ) {
    return this.walletsService.setCreditLimit(user, franchiseOrgId, dto, req.ip);
  }

  // ─── 6.7 FINANCIAL LEDGERS ENDPOINTS ────────────────────────

  @Get('ledgers')
  getLedgerEntries(
    @CurrentUser() user: any,
    @Query() query: {
      ledgerType?: 'HQ' | 'FRANCHISE' | 'AGENT';
      ownerOrgId?: string;
      agentUserId?: string;
      category?: string;
      entryType?: 'CREDIT' | 'DEBIT';
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.ledgersService.getLedgerEntries(user, query);
  }

  @Post('ledgers/revenue')
  @HttpCode(HttpStatus.CREATED)
  recordExternalRevenue(
    @CurrentUser() user: any,
    @Body() dto: RecordExternalRevenueDto,
    @Req() req: any,
  ) {
    return this.ledgersService.recordExternalRevenue(user, dto, req.ip);
  }

  // ─── 6.7 COMMISSION CONFIGURATION & REPORTING ───────────────

  @Get('commissions/configs')
  listCommissionConfigs(@CurrentUser() user: any) {
    return this.commissionsService.listConfigurations(user);
  }

  @Post('commissions/configs')
  @HttpCode(HttpStatus.CREATED)
  setCommissionConfig(
    @CurrentUser() user: any,
    @Body() dto: SetCommissionConfigDto,
    @Req() req: any,
  ) {
    return this.commissionsService.setCommissionConfig(user, dto, req.ip);
  }

  @Get('commissions/report')
  getCommissionReport(
    @CurrentUser() user: any,
    @Query() query: {
      agentUserId?: string;
      orgId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    return this.commissionsService.getCommissionReport(user, query);
  }
}
