import { IsEmail, IsString, Length, MinLength, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(12)
  newPassword: string;
}