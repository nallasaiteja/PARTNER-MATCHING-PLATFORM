import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles.constants';

@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('reminders')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM, Role.BRANCH_MANAGER, Role.BRANCH_STAFF)
  listReminders(@Query('isResolved') isResolved?: string) {
    const resolvedBool = isResolved !== undefined ? isResolved === 'true' : undefined;
    return this.alertsService.listReminders({ isResolved: resolvedBool });
  }

  @Post('reminders')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM, Role.BRANCH_MANAGER, Role.BRANCH_STAFF)
  @HttpCode(HttpStatus.CREATED)
  createReminder(
    @CurrentUser() user: any,
    @Body() dto: {
      memberProfileId: string;
      packageId?: string;
      alertDate: string;
      alertType: 'PAYMENT' | 'VISIT' | 'PACKAGE_FOLLOWUP';
      note?: string;
    },
  ) {
    return this.alertsService.createReminder(user, dto);
  }

  @Patch('reminders/:id/resolve')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.HQ_SERVICE_TEAM, Role.BRANCH_MANAGER, Role.BRANCH_STAFF)
  resolveReminder(@Param('id') id: string) {
    return this.alertsService.resolveReminder(id);
  }

  @Post('greetings/trigger-birthdays')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  triggerBirthdayWishes() {
    return this.alertsService.triggerBirthdayWishes();
  }

  @Post('greetings/send-festival')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  sendFestivalGreetings(
    @Body() dto: {
      festivalName: string;
      message: string;
      discountPercent?: number;
      offerCode?: string;
    },
  ) {
    return this.alertsService.sendFestivalGreetings(dto);
  }

  @Post('bulk-sms')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  sendBranchBulkSms(
    @CurrentUser() user: any,
    @Body() dto: {
      branchOrgId?: string;
      title: string;
      message: string;
      targetIdRangeStart?: string;
      targetIdRangeEnd?: string;
    },
    @Req() req: any,
  ) {
    return this.alertsService.sendBranchBulkSms(user, dto, req.ip);
  }

  @Get('bulk-sms/reports')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.BRANCH_MANAGER)
  getBranchSmsReports() {
    return this.alertsService.getBranchSmsReports();
  }
}
