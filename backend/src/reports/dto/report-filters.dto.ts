import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class DateFilterDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'monthly', 'overall'])
  period?: 'daily' | 'monthly' | 'overall';
}

export class MemberDataFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 25;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class MemberDownloadFilterDto {
  @IsOptional()
  @IsString()
  idRangeStart?: string;

  @IsOptional()
  @IsString()
  idRangeEnd?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ALL', 'FREE', 'PAID', 'BLOCKED'])
  status?: 'ALL' | 'FREE' | 'PAID' | 'BLOCKED' = 'ALL';

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['json', 'csv', 'pdf'])
  format?: 'json' | 'csv' | 'pdf' = 'json';
}

export class SalesRevenueFilterDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  franchiseId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'monthly', 'overall'])
  period?: 'daily' | 'monthly' | 'overall' = 'overall';
}

export class StaffActivityFilterDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(['daily', 'monthly', 'overall'])
  period?: 'daily' | 'monthly' | 'overall' = 'overall';
}
