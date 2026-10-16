import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryNotificationHistoryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CreateFestivalDto {
  @IsString()
  festivalName: string;

  @IsString()
  festivalDate: string; // YYYY-MM-DD

  @IsString()
  messageTemplate: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsString()
  offerCode?: string;

  @IsOptional()
  @IsArray()
  channels?: string[]; // ["APP_PUSH", "EMAIL", "WHATSAPP"]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateFestivalDto {
  @IsOptional()
  @IsString()
  festivalName?: string;

  @IsOptional()
  @IsString()
  festivalDate?: string;

  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountPercent?: number;

  @IsOptional()
  @IsString()
  offerCode?: string;

  @IsOptional()
  @IsArray()
  channels?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RegisterPushTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsIn(['WEB', 'ANDROID', 'IOS'])
  platform?: string = 'WEB';
}

export class SendTestNotificationDto {
  @IsIn(['APP_PUSH', 'SMS', 'EMAIL', 'WHATSAPP'])
  channel: 'APP_PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';

  @IsOptional()
  @IsString()
  type?: string = 'MANUAL';

  @IsString()
  recipientContact: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  templateId?: string;
}

export class PreviewBulkSmsDto {
  @IsOptional()
  @IsString()
  branchOrgId?: string;

  @IsOptional()
  @IsString()
  targetIdRangeStart?: string;

  @IsOptional()
  @IsString()
  targetIdRangeEnd?: string;
}

export class SendBulkSmsCampaignDto {
  @IsOptional()
  @IsString()
  branchOrgId?: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  targetIdRangeStart?: string;

  @IsOptional()
  @IsString()
  targetIdRangeEnd?: string;
}
