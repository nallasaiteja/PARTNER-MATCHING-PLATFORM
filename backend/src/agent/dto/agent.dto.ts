import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsIn,
  IsEmail,
  Matches,
  IsInt,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateAgentMemberProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsIn(['Male', 'Female'], { message: 'Gender must be Male or Female' })
  gender: string;

  @IsDateString({}, { message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Mobile must be a valid phone number (10–15 digits)' })
  mobile: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  caste?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  idProofType?: string;

  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @IsOptional()
  @IsString()
  timeOfBirth?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  idProofFileUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep?: number;

  @IsOptional()
  @IsArray()
  completedSteps?: number[];

  @IsOptional()
  profileData?: Record<string, any>;
}

export class UpdateAgentMemberProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  idProofType?: string;

  @IsOptional()
  @IsString()
  idProofNumber?: string;

  @IsOptional()
  @IsString()
  timeOfBirth?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  idProofFileUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  currentStep?: number;

  @IsOptional()
  @IsArray()
  completedSteps?: number[];

  @IsOptional()
  profileData?: Record<string, any>;
}

export class RaiseAgentInvoiceRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Member profile ID is required' })
  memberProfileId: string;

  @IsString()
  @IsNotEmpty({ message: 'Package ID is required' })
  packageId: string;

  @IsIn(['ONLINE', 'CHEQUE', 'CASH', 'UPI', 'CARD', 'EMI'], {
    message: 'Payment mode must be ONLINE, CHEQUE, CASH, UPI, CARD, or EMI',
  })
  paymentMode: string;

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

  @IsOptional()
  @IsBoolean()
  cashReceivedDeclaration?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FilterAgentProfilesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  packageType?: string;

  @IsOptional()
  @IsString()
  isBlocked?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class FilterAgentInvoicesDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
