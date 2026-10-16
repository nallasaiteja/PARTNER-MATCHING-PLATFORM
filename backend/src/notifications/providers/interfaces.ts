export type NotificationChannel = 'APP_PUSH' | 'SMS' | 'EMAIL' | 'WHATSAPP';

export type NotificationType =
  | 'BIRTHDAY'
  | 'FESTIVAL'
  | 'PAYMENT_ALERT'
  | 'PACKAGE_EXPIRY'
  | 'INTEREST_RECEIVED'
  | 'INTEREST_ACCEPTED'
  | 'PROFILE_BLOCKED'
  | 'TICKET_CLOSURE_OTP'
  | 'OTP'
  | 'TRANSACTIONAL'
  | 'PASSWORD_RESET'
  | 'BULK_BRANCH_SMS'
  | 'MANUAL';

export interface NotificationPayload {
  type: NotificationType;
  channel: NotificationChannel;
  recipientContact: string; // Phone, Email, or FCM Token
  recipientName?: string;
  recipientUserId?: string;
  recipientMemberProfileId?: string;
  title?: string;
  content: string;
  templateId?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  scheduledFor?: Date;
}

export interface ProviderDispatchResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface INotificationProvider {
  channel: NotificationChannel;
  dispatch(payload: NotificationPayload): Promise<ProviderDispatchResult>;
}
