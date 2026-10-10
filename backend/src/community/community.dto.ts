import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommunityMasterLevel } from '@prisma/client';

export class CreateCommunityMasterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(CommunityMasterLevel)
  level: CommunityMasterLevel;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCommunityMasterDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}