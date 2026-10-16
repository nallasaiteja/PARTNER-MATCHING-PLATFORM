import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

export class CreateSuggestionDto {
  @IsString()
  @IsNotEmpty()
  suggestedProfileId: string;

  @IsString()
  @IsNotEmpty()
  receivingMemberProfileId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSuggestionStatusDto {
  @IsEnum(SuggestionStatus)
  @IsNotEmpty()
  status: SuggestionStatus;
}

export class TogglePackageEligibilityDto {
  @IsBoolean()
  @IsNotEmpty()
  eligible: boolean;
}

export class SuggestionQueryDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  receivingMemberId?: string;

  @IsOptional()
  @IsString()
  suggestedProfileId?: string;

  @IsOptional()
  @IsEnum(SuggestionStatus)
  status?: SuggestionStatus;

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
