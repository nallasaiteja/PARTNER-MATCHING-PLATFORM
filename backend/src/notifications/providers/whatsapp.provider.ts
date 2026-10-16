import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderDispatchResult,
} from './interfaces';

@Injectable()
export class WhatsAppNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(WhatsAppNotificationProvider.name);
  readonly channel: NotificationChannel = 'WHATSAPP';

  /**
   * Pre-approved WhatsApp Business Message Templates (per Section 10 PDF spec):
   * 1. Birthday wishes: birthday_wishes_v1
   * 2. Festival wishes: festival_wishes_v1
   * 3. Payment alerts: payment_alert_v1
   * 4. Package expiry reminders: package_expiry_v1
   * 5. Welcome messages: welcome_message_v1
   * 6. Biodata sharing: biodata_share_v1
   */
  async dispatch(payload: NotificationPayload): Promise<ProviderDispatchResult> {
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Clean recipient phone number (format: 919876543210 without '+' or hyphens)
    const rawNumber = payload.recipientContact.replace(/\D/g, '');
    const cleanNumber = rawNumber.length === 10 ? `91${rawNumber}` : rawNumber;

    if (apiToken && phoneNumberId && cleanNumber.length >= 10) {
      try {
        const bodyPayload: any = {
          messaging_product: 'whatsapp',
          to: cleanNumber,
        };

        if (payload.templateId) {
          // Template message dispatch
          bodyPayload.type = 'template';
          bodyPayload.template = {
            name: payload.templateId,
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: (payload.metadata?.templateParams || [payload.recipientName || 'Member']).map(
                  (text: string) => ({ type: 'text', text }),
                ),
              },
            ],
          };
        } else {
          // Standard text message dispatch
          bodyPayload.type = 'text';
          bodyPayload.text = { body: payload.content };
        }

        const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        const data = (await res.json()) as any;
        if (res.ok && data.messages?.[0]?.id) {
          return {
            success: true,
            provider: 'WHATSAPP_BUSINESS_API',
            providerMessageId: data.messages[0].id,
            simulated: false,
          };
        } else {
          this.logger.warn(`WhatsApp API response: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error(`WhatsApp Business dispatch error: ${err.message}`);
      }
    }

    // 2. Check Twilio WhatsApp Gateway
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_NUMBER || (process.env.TWILIO_PHONE_NUMBER ? `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` : 'whatsapp:+14155238886');

    if (twilioSid && twilioToken && cleanNumber.length >= 10) {
      try {
        const formattedTo = `whatsapp:+${cleanNumber}`;
        const formattedFrom = twilioWhatsAppFrom.startsWith('whatsapp:') ? twilioWhatsAppFrom : `whatsapp:${twilioWhatsAppFrom}`;

        const params = new URLSearchParams();
        params.append('To', formattedTo);
        params.append('From', formattedFrom);
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
          return {
            success: true,
            provider: 'TWILIO_WHATSAPP',
            providerMessageId: data.sid,
            simulated: false,
          };
        } else {
          this.logger.warn(`Twilio WhatsApp response: ${data?.message || JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error(`Twilio WhatsApp dispatch error: ${err.message}`);
      }
    }

    // 3. Fallback: Automated Simulated WhatsApp Dispatch
    const templateTag = payload.templateId ? `[Template: ${payload.templateId}] ` : '';
    this.logger.log(
      `💬 [WHATSAPP BUSINESS DISPATCH] To: ${cleanNumber} (${payload.recipientName || 'Member'}) | ${templateTag}"${payload.content}"`,
    );

    return {
      success: true,
      provider: 'WHATSAPP_BUSINESS_DEV',
      providerMessageId: `wamid.HBgL${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    };
  }
}
