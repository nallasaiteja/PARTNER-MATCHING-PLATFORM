import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';

export class CreateSuccessStoryDto {
  @IsString()
  @IsNotEmpty()
  partner1MemberId: string;

  @IsString()
  @IsNotEmpty()
  partner2MemberId: string;

  @IsString()
  @IsOptional()
  partner1Name?: string;

  @IsString()
  @IsOptional()
  partner2Name?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  story?: string;

  @IsDateString()
  @IsOptional()
  engagementDate?: string;

  @IsDateString()
  @IsNotEmpty()
  marriageDate: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one couple photo is required' })
  @IsString({ each: true })
  couplePhotos: string[];

  @IsString()
  @IsOptional()
  youtubeVideoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateSuccessStoryDto {
  @IsString()
  @IsOptional()
  partner1MemberId?: string;

  @IsString()
  @IsOptional()
  partner2MemberId?: string;

  @IsString()
  @IsOptional()
  partner1Name?: string;

  @IsString()
  @IsOptional()
  partner2Name?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  story?: string;

  @IsDateString()
  @IsOptional()
  engagementDate?: string;

  @IsDateString()
  @IsOptional()
  marriageDate?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  couplePhotos?: string[];

  @IsString()
  @IsOptional()
  youtubeVideoUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class QuerySuccessStoryDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  search?: string;

  @IsOptional()
  isPublished?: string;
}
