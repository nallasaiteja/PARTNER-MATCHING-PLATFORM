import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ComplaintType, ComplaintStatus } from '@prisma/client';

export class CreateComplaintDto {
  @IsEnum(ComplaintType, { message: 'Type must be either MEMBER or STAFF' })
  @IsNotEmpty()
  type: ComplaintType;

  @IsOptional()
  @IsString()
  relatedMemberId?: string;

  @IsOptional()
  @IsString()
  relatedStaffId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateComplaintDto {
  @IsOptional()
  @IsEnum(ComplaintStatus, { message: 'Invalid complaint status' })
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsString()
  historyNote?: string;
}

export class ComplaintQueryDto {
  @IsOptional()
  @IsEnum(ComplaintType)
  type?: ComplaintType;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;
}
