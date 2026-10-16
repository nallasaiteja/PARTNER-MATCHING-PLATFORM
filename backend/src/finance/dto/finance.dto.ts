import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentModeEnum {
  ONLINE = 'ONLINE',
  CHEQUE = 'CHEQUE',
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  EMI = 'EMI',
}

export class RaiseInvoiceRequestDto {
  @IsString()
  @IsNotEmpty()
  memberProfileId: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsNotEmpty()
  paymentMode: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  transactionRef?: string;

  @IsString()
  @IsOptional()
  chequeDate?: string;

  @IsBoolean()
  @IsOptional()
  isCash?: boolean;

  @IsBoolean()
  @IsOptional()
  cashReceivedDeclaration?: boolean;

  @IsString()
  @IsOptional()
  saleStaffId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApproveInvoiceDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectInvoiceDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class EditInvoiceDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  amount?: number;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  transactionRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsNotEmpty()
  editReason: string;
}

export class FilterInvoicesDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  memberId?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  mobile?: string;

  @IsString()
  @IsOptional()
  orgId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsString()
  @IsOptional()
  hasInvoice?: string; // 'true' | 'false'

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 15;
}

export class TopupWalletDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SetWalletLimitDto {
  @IsNumber()
  @Min(0)
  creditLimit: number;
}

export class SetCommissionConfigDto {
  @IsString()
  @IsNotEmpty()
  scope: string; // "GLOBAL_BRANCH", "ORG_FRANCHISE", "AGENT_SPECIFIC"

  @IsString()
  @IsOptional()
  orgId?: string;

  @IsString()
  @IsOptional()
  agentUserId?: string;

  @IsString()
  @IsOptional()
  packageId?: string;

  @IsString()
  @IsNotEmpty()
  commissionType: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  rateValue: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordExternalRevenueDto {
  @IsString()
  @IsNotEmpty()
  category: 'AD_REVENUE' | 'WEDDING_SERVICE_REVENUE' | 'ADJUSTMENT';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  sourceEntityId?: string;
}
