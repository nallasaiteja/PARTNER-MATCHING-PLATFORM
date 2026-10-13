import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
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
