import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { AttendanceStatus, LeaveStatus } from '@prisma/client';

export class ApplyLeaveDto {
  @IsString()
  @IsNotEmpty()
  leaveType: string; // "CASUAL", "SICK", "EARNED", "EMERGENCY"

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class ReviewLeaveDto {
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status: LeaveStatus; // "APPROVED" | "REJECTED"

  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

export class ManualAttendanceCorrectionDto {
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // "YYYY-MM-DD"

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsNumber()
  @Min(0)
  @Max(24)
  workingHours: number;

  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class QueryLeaveDto {
  @IsOptional()
  status?: string;

  @IsOptional()
  branchOrgId?: string;

  @IsOptional()
  staffId?: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

export class QueryAttendanceDto {
  @IsOptional()
  date?: string;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  branchOrgId?: string;

  @IsOptional()
  staffId?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
