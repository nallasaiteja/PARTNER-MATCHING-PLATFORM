import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/step5-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Staff login - validates status, returns JWT tokens
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.authService.login(dto, ipAddress);
  }

  /**
   * GET /api/v1/auth/me
   * Returns authenticated user profile (no passwordHash)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('verification/mobile/request')
  @UseGuards(JwtAuthGuard)
  requestMobileVerification(@CurrentUser() user: any) {
    return this.authService.requestMobileVerification(user.id);
  }

  @Post('verification/mobile/verify')
  @UseGuards(JwtAuthGuard)
  verifyMobile(@CurrentUser() user: any, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyMobile(user.id, dto.code);
  }

  @Post('verification/email/request')
  @UseGuards(JwtAuthGuard)
  requestEmailVerification(@CurrentUser() user: any) {
    return this.authService.requestEmailVerification(user.id);
  }

  @Post('verification/email/verify')
  @UseGuards(JwtAuthGuard)
  verifyEmail(@CurrentUser() user: any, @Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(user.id, dto.code);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('password/forgot')
  @HttpCode(HttpStatus.ACCEPTED)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
