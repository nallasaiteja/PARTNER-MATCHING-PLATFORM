import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { PushNotificationProvider } from './providers/push.provider';
import { SmsNotificationProvider } from './providers/sms.provider';
import { EmailNotificationProvider } from './providers/email.provider';
import { WhatsAppNotificationProvider } from './providers/whatsapp.provider';
import { NotificationsService } from './notifications.service';
import { AutomatedRemindersService } from './automated-reminders.service';
import { EventNotificationsService } from './event-notifications.service';
import { BulkSmsService } from './bulk-sms.service';
import { FestivalsService } from './festivals.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [NotificationsController],
  providers: [
    PushNotificationProvider,
    SmsNotificationProvider,
    EmailNotificationProvider,
    WhatsAppNotificationProvider,
    NotificationsService,
    AutomatedRemindersService,
    EventNotificationsService,
    BulkSmsService,
    FestivalsService,
  ],
  exports: [
    NotificationsService,
    AutomatedRemindersService,
    EventNotificationsService,
    BulkSmsService,
    FestivalsService,
    SmsNotificationProvider,
  ],
})
export class NotificationsModule {}
