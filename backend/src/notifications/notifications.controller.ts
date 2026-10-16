import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';
import { NotificationsService } from './notifications.service';
import { AutomatedRemindersService } from './automated-reminders.service';
import { EventNotificationsService } from './event-notifications.service';
import { BulkSmsService } from './bulk-sms.service';
import { FestivalsService } from './festivals.service';
import {
  QueryNotificationHistoryDto,
  CreateFestivalDto,
  UpdateFestivalDto,
  RegisterPushTokenDto,
  SendTestNotificationDto,
  PreviewBulkSmsDto,
  SendBulkSmsCampaignDto,
} from './dto/notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly remindersService: AutomatedRemindersService,
    private readonly eventNotificationsService: EventNotificationsService,
    private readonly bulkSmsService: BulkSmsService,
    private readonly festivalsService: FestivalsService,
  ) {}

  // ──────────────────────────────────────────────────────────
  // 1. DELIVERY LOGS & STATISTICS
  // ──────────────────────────────────────────────────────────

  @Get('history')
  getNotificationHistory(
    @CurrentUser() user: any,
    @Query() query: QueryNotificationHistoryDto,
  ) {
    return this.notificationsService.getNotificationHistory(user, query);
  }

  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  getNotificationStats() {
    return this.notificationsService.getNotificationStats();
  }

  @Post('push-token')
  @HttpCode(HttpStatus.OK)
  registerPushToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.notificationsService.registerPushToken(user.id, dto);
  }

  @Post('test-dispatch')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  sendTestNotification(
    @CurrentUser() user: any,
    @Body() dto: SendTestNotificationDto,
  ) {
    return this.notificationsService.sendTestNotification(user, dto);
  }

  // ──────────────────────────────────────────────────────────
  // 2. FESTIVAL CONFIGURATION & MANAGEMENT
  // ──────────────────────────────────────────────────────────

  @Get('festivals')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  listFestivals() {
    return this.festivalsService.listFestivals();
  }

  @Post('festivals')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  createFestival(
    @CurrentUser() user: any,
    @Body() dto: CreateFestivalDto,
  ) {
    return this.festivalsService.createFestival(user, dto);
  }

  @Patch('festivals/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  updateFestival(
    @Param('id') id: string,
    @Body() dto: UpdateFestivalDto,
  ) {
    return this.festivalsService.updateFestival(id, dto);
  }

  @Delete('festivals/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  deleteFestival(@Param('id') id: string) {
    return this.festivalsService.deleteFestival(id);
  }

  @Post('festivals/:id/dispatch')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  dispatchFestival(@Param('id') id: string) {
    return this.festivalsService.dispatchFestival(id);
  }

  // ──────────────────────────────────────────────────────────
  // 3. AUTOMATED REMINDERS TRIGGERS / CRON RUNNERS
  // ──────────────────────────────────────────────────────────

  @Post('automated/run-birthdays')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runBirthdays() {
    return this.remindersService.dispatchDailyBirthdays();
  }

  @Post('automated/run-festivals')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runFestivals() {
    return this.remindersService.dispatchFestivalWishes();
  }

  @Post('automated/run-payment-alerts')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runPaymentAlerts() {
    return this.remindersService.dispatchPaymentAlerts();
  }

  @Post('automated/run-package-expiry')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runPackageExpiry() {
    return this.remindersService.dispatchPackageExpiryAlerts();
  }

  @Post('automated/run-daily-expiry')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  runDailyExpiry() {
    return this.remindersService.executeDailyMembershipExpiryCheck();
  }

  @Post('automated/run-lead-followups')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  runLeadFollowups() {
    return this.remindersService.executeLeadFollowupReminders();
  }

  @Get('automated/scheduler-status')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  getSchedulerStatus() {
    return this.remindersService.getSchedulerStatus();
  }

  // ──────────────────────────────────────────────────────────
  // 4. BULK BRANCH SMS
  // ──────────────────────────────────────────────────────────

  @Post('bulk-sms/preview')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  previewBulkSms(
    @CurrentUser() user: any,
    @Body() dto: PreviewBulkSmsDto,
  ) {
    return this.bulkSmsService.previewCampaign(user, dto);
  }

  @Post('bulk-sms/send')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  sendBulkSms(
    @CurrentUser() user: any,
    @Body() dto: SendBulkSmsCampaignDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.bulkSmsService.sendCampaign(user, dto, ipAddress);
  }

  @Get('bulk-sms/reports')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  getBulkSmsReports(@CurrentUser() user: any) {
    return this.bulkSmsService.getUsageReports(user);
  }

  // ──────────────────────────────────────────────────────────
  // 5. SUPPORT TICKET CLOSURE OTP
  // ──────────────────────────────────────────────────────────

  @Post('tickets/:id/request-closure-otp')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  requestTicketClosureOtp(
    @CurrentUser() user: any,
    @Param('id') ticketId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.eventNotificationsService.requestTicketClosureOtp(user, ticketId, ipAddress);
  }

  @Post('tickets/:id/verify-closure-otp')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM)
  verifyTicketClosureOtp(
    @CurrentUser() user: any,
    @Param('id') ticketId: string,
    @Body('otp') otp: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    return this.eventNotificationsService.verifyOtpAndClose(user, ticketId, otp, ipAddress);
  }
}
