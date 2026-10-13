import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export class MatchQueryFilterDto {
  @IsOptional()
  @IsString()
  caste?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  star?: string;

  @IsOptional()
  @IsString()
  raasi?: string;

  @IsOptional()
  @IsString()
  padam?: string;

  @IsOptional()
  @IsString()
  ageMin?: string;

  @IsOptional()
  @IsString()
  ageMax?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class ContactRevealActionDto {
  @IsString()
  @IsIn(['ACCEPT', 'REJECT', 'BLOCK'])
  action: 'ACCEPT' | 'REJECT' | 'BLOCK';
}

export class InterestActionDto {
  @IsString()
  @IsIn(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}

export class UpgradePackageDto {
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsIn(['ONLINE', 'UPI', 'CARD', 'EMI', 'CASH'])
  paymentMode: 'ONLINE' | 'UPI' | 'CARD' | 'EMI' | 'CASH';

  @IsOptional()
  @IsString()
  notes?: string;
}
