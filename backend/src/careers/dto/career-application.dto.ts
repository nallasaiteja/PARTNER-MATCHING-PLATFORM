import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsNumber,
  IsArray,
  IsDateString,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { RoleType } from '../../common/constants/roles.constants';

export class SendCareerOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile: string;
}

export class VerifyCareerOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class EducationItemDto {
  @IsString()
  @IsNotEmpty()
  qualification: string; // "10TH", "INTERMEDIATE", "DEGREE", "POSTGRADUATE", "ADDITIONAL"

  @IsString()
  @IsNotEmpty()
  yearOfPassing: string;

  @IsString()
  @IsNotEmpty()
  educationType: string; // "REGULAR", "DISTANCE"

  @IsString()
  @IsOptional()
  certificateUrl?: string;
}

export class CreateCareerApplicationDto {
  // Personal Details
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  surname: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  maritalStatus: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  @IsNotEmpty()
  religion: string;

  @IsString()
  @IsNotEmpty()
  caste: string;

  // Address Details
  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  mandal: string;

  @IsString()
  @IsNotEmpty()
  temporaryAddress: string;

  @IsString()
  @IsNotEmpty()
  permanentAddress: string;

  // Identity Verification
  @IsString()
  @IsNotEmpty()
  idProofType: string; // "AADHAAR", "VOTER_ID", "PAN", "PASSPORT", "DRIVING_LICENSE"

  @IsString()
  @IsNotEmpty()
  idProofNumber: string;

  @IsString()
  @IsNotEmpty()
  idProofUrl: string;

  @IsString()
  @IsNotEmpty()
  panCardUrl: string;

  // Education Details
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one education qualification is required' })
  educationDetails: EducationItemDto[];

  // Experience and Family
  @IsNumber()
  @IsOptional()
  experienceYears?: number;

  @IsString()
  @IsOptional()
  fatherName?: string;

  @IsString()
  @IsOptional()
  fatherProfession?: string;

  @IsString()
  @IsOptional()
  motherName?: string;

  @IsString()
  @IsOptional()
  motherProfession?: string;

  // References (Optional)
  @IsString()
  @IsOptional()
  referenceName?: string;

  @IsString()
  @IsOptional()
  referenceMobile?: string;

  @IsString()
  @IsOptional()
  referenceAddress?: string;

  // Photos (up to 10 photos)
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  photos?: string[];

  // Completion timer
  @IsNumber()
  @IsOptional()
  timeTakenSeconds?: number;
}

export class BlockCareerApplicationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RegisterAsStaffDto {
  @IsString()
  @IsNotEmpty()
  role: RoleType;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  staffDivision?: string;

  @IsString()
  @IsOptional()
  temporaryPassword?: string;
}

export class QueryCareerApplicationDto {
  @IsOptional()
  status?: string;

  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
