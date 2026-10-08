import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MinLength,
  IsMobilePhone,
  IsEmail,
} from 'class-validator';
import { Role, StaffDivision } from '../../common/constants/roles.constants';

export class CreateStaffDto {
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
}

export class UpdateStaffDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(Object.values(StaffDivision))
  @IsOptional()
  staffDivision?: string;

  @IsOptional()
  permissionOverrides?: Record<string, string[]>;
}
