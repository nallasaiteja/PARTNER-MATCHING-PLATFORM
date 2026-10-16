import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderDispatchResult,
} from './interfaces';

@Injectable()
export class PushNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(PushNotificationProvider.name);
  readonly channel: NotificationChannel = 'APP_PUSH';

  async dispatch(payload: NotificationPayload): Promise<ProviderDispatchResult> {
    const fcmServerKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;

    // Check if real FCM credentials are provided
    if (fcmServerKey || firebaseProjectId) {
      try {
        // Production FCM dispatch using FCM REST API
        if (fcmServerKey && payload.recipientContact.length > 20) {
          const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: payload.recipientContact,
              notification: {
                title: payload.title || 'Partner Matching Platform',
                body: payload.content,
              },
              data: payload.metadata || {},
            }),
          });

          const data = (await response.json()) as any;
          if (data && data.success === 1) {
            return {
              success: true,
              provider: 'FIREBASE_FCM',
              providerMessageId: data.results?.[0]?.message_id || `fcm_${Date.now()}`,
              simulated: false,
            };
          } else {
            return {
              success: false,
              provider: 'FIREBASE_FCM',
              error: data?.results?.[0]?.error || 'FCM dispatch failed',
              simulated: false,
            };
          }
        }
      } catch (err: any) {
        this.logger.error(`FCM gateway error: ${err.message}`);
        return {
          success: false,
          provider: 'FIREBASE_FCM',
          error: err.message,
          simulated: false,
        };
      }
    }

    // Development / Test Mock Provider (no credentials configured)
    this.logger.log(
      `🔔 [APP PUSH DISPATCH] Recipient: ${payload.recipientName || 'Member'} (${payload.recipientContact}) | Title: ${payload.title} | Content: ${payload.content}`,
    );

    return {
      success: true,
      provider: 'FIREBASE_FCM_MOCK',
      providerMessageId: `fcm_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    };
  }
}
