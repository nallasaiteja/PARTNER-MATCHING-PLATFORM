import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MinLength,
  IsEmail,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Role, StaffDivision } from '../../common/constants/roles.constants';

export class RequestStaffOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile: string;
}

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(Object.values(Role))
  role: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(Object.values(StaffDivision))
  @IsOptional()
  staffDivision?: string;

  @IsString()
  @IsNotEmpty()
  aadhaarUrl: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @IsString()
  @IsOptional()
  employeeId?: string;
}

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(Object.values(StaffDivision))
  @IsOptional()
  staffDivision?: string;

  @IsOptional()
  permissionOverrides?: Record<string, string[]>;
}

export class AddStaffSalaryDto {
  @IsString()
  @IsNotEmpty()
  month: string;

  @IsNumber()
  salaryAmount: number;

  @IsNumber()
  @IsOptional()
  incentiveAmount?: number;

  @IsString()
  @IsOptional()
  packageName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class SetStaffAccessRuleDto {
  @IsString()
  @IsOptional()
  idRangeStart?: string;

  @IsString()
  @IsOptional()
  idRangeEnd?: string;

  @IsArray()
  @IsOptional()
  allowedCastes?: string[];

  @IsArray()
  @IsOptional()
  allowedGenders?: string[];

  @IsArray()
  @IsOptional()
  customSeries?: string[];
}
