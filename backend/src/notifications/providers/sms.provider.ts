import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderDispatchResult,
} from './interfaces';

@Injectable()
export class SmsNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(SmsNotificationProvider.name);
  readonly channel: NotificationChannel = 'SMS';

  async dispatch(payload: NotificationPayload): Promise<ProviderDispatchResult> {
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    // 1. Check Fast2SMS Indian SMS Gateway
    if (fast2smsKey && payload.recipientContact) {
      try {
        const cleanMobile = payload.recipientContact.replace(/\D/g, '').slice(-10);
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'v3',
            sender_id: 'PRTMAT',
            message: payload.content,
            language: 'english',
            flash: 0,
            numbers: cleanMobile,
          }),
        });

        const data = (await res.json()) as any;
        if (data && data.return === true) {
          return {
            success: true,
            provider: 'FAST2SMS',
            providerMessageId: data.request_id || `sms_${Date.now()}`,
            simulated: false,
          };
        }
      } catch (err: any) {
        this.logger.error(`Fast2SMS dispatch error: ${err.message}`);
      }
    }

    // 2. Check Twilio SMS Gateway
    if (twilioSid && twilioToken && twilioPhone) {
      try {
        const params = new URLSearchParams();
        params.append('To', payload.recipientContact.startsWith('+') ? payload.recipientContact : `+91${payload.recipientContact}`);
        params.append('From', twilioPhone);
        params.append('Body', payload.content);

        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          },
        );

        const data = (await res.json()) as any;
        if (res.ok && data.sid) {
          this.logger.log(`Twilio SMS delivered successfully. SID: ${data.sid}`);
          return {
            success: true,
            provider: 'TWILIO_SMS',
            providerMessageId: data.sid,
            simulated: false,
          };
        } else {
          this.logger.warn(`Twilio SMS rejected: [Code ${data.code}] ${data.message}`);
        }
      } catch (err: any) {
        this.logger.error(`Twilio SMS dispatch error: ${err.message}`);
      }
    }

    // 3. Fallback: Automated Simulated SMS Dispatch
    this.logger.log(
      `📱 [SMS GATEWAY DISPATCH] To: ${payload.recipientContact} (${payload.recipientName || 'Member'}) | Content: "${payload.content}"`,
    );

    return {
      success: true,
      provider: 'SMS_GATEWAY_DEV',
      providerMessageId: `sms_dev_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    };
  }
}
