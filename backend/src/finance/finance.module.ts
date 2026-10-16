import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { FinanceController } from './finance.controller';
import { PaymentsController } from './payments.controller';
import { WalletsService } from './wallets.service';
import { LedgersService } from './ledgers.service';
import { CommissionsService } from './commissions.service';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [InvoicesController, FinanceController, PaymentsController],
  providers: [
    InvoicesService,
    WalletsService,
    LedgersService,
    CommissionsService,
    RazorpayService,
  ],
  exports: [
    InvoicesService,
    WalletsService,
    LedgersService,
    CommissionsService,
    RazorpayService,
  ],
})
export class FinanceModule {}
