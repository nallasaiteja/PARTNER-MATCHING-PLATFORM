import { IsOptional, IsString, IsBoolean, IsDateString, IsIn, IsNumber } from 'class-validator';

export class VerifyMemberIdProofDto {
  @IsBoolean()
  verified: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class BlockMemberProfileDto {
  @IsString()
  reason: string;
}

export class EditMemberDobDto {
  @IsDateString()
  dateOfBirth: string;

  @IsString()
  reason: string;
}

export class UpdateMemberMobileDto {
  @IsString()
  mobile: string;

  @IsString()
  reason: string;
}

export class ResetMemberPasswordDto {
  @IsOptional()
  @IsString()
  tempPassword?: string;
}

export class RaiseBranchInvoiceDto {
  @IsString()
  memberProfileId: string;

  @IsString()
  packageId: string;

  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  saleStaffId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;

  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @IsOptional()
  @IsBoolean()
  isCash?: boolean;
}

export class SubmitLeaveApplicationDto {
  @IsString()
  leaveType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  reason: string;
}

export class ReviewLeaveApplicationDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class CreatePaymentAlertDto {
  @IsString()
  memberProfileId: string;

  @IsDateString()
  alertDate: string;

  @IsOptional()
  @IsString()
  alertType?: string = 'PAYMENT';

  @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsString()
  responsibleStaffId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
