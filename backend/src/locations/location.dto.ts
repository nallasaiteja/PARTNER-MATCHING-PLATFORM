import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LocationLevel } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(LocationLevel)
  level: LocationLevel;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}