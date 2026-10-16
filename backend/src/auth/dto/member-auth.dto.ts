import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  IsBoolean,
  IsIn,
  ValidateIf,
} from 'class-validator';

export class FlexibleLoginDto {
  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RequestRegistrationOtpDto {
  @IsString()
  @IsNotEmpty()
  recipient: string; // mobile number or email

  @IsString()
  @IsIn(['mobile', 'email'])
  channel: 'mobile' | 'email';
}

export class RegisterMemberDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsNotEmpty()
  dateOfBirth: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  maritalStatus: string;

  @IsString()
  @IsNotEmpty()
  religion: string;

  @IsString()
  @IsNotEmpty()
  caste: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsOptional()
  @ValidateIf((o) => typeof o.email === 'string' && o.email.trim().length > 0)
  @IsEmail()
  email?: string;


  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  otpCode: string;

  @IsString()
  @IsIn(['mobile', 'email'])
  channel: 'mobile' | 'email';

  @IsBoolean()
  termsAccepted: boolean;

  @IsOptional()
  @IsString()
  registrationSource?: string;

  @IsOptional()
  attributionData?: Record<string, any>;
}

export class RequestLoginOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Mobile, Email, or Member ID

  @IsString()
  @IsIn(['mobile', 'email'])
  channel: 'mobile' | 'email';
}

export class VerifyLoginOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsIn(['mobile', 'email'])
  channel: 'mobile' | 'email';
}
