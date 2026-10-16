import { Injectable, Logger } from '@nestjs/common';
import {
  INotificationProvider,
  NotificationChannel,
  NotificationPayload,
  ProviderDispatchResult,
} from './interfaces';

@Injectable()
export class EmailNotificationProvider implements INotificationProvider {
  private readonly logger = new Logger(EmailNotificationProvider.name);
  readonly channel: NotificationChannel = 'EMAIL';

  async dispatch(payload: NotificationPayload): Promise<ProviderDispatchResult> {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL;
    const brevoSenderName = process.env.BREVO_SENDER_NAME || 'Partner Matching Platform';
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'notifications@partnermatching.com';

    // 1. Brevo (Sendinblue) REST API v3
    if (brevoApiKey && brevoSenderEmail && payload.recipientContact.includes('@')) {
      try {
        const htmlBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9;">
              <span style="display: inline-block; padding: 6px 14px; background: #fff1f2; color: #e11d48; border-radius: 9999px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                Partner Matching Platform
              </span>
              <h2 style="margin: 12px 0 0 0; color: #0f172a; font-size: 20px; font-weight: 700;">
                ${payload.title || 'Notification from Partner Matching Platform'}
              </h2>
            </div>
            
            <div style="padding: 24px 0; font-size: 15px; line-height: 1.7; color: #334155;">
              ${payload.content.replace(/\n/g, '<br/>')}
            </div>

            <div style="padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This is an automated notification from Partner Matching Platform. Please do not reply directly to this email.
              </p>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1;">
                © ${new Date().getFullYear()} Partner Matching Platform • Trusted Telugu Matrimony
              </p>
            </div>
          </div>
        `;

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { email: brevoSenderEmail, name: brevoSenderName },
            to: [{ email: payload.recipientContact, name: payload.recipientName || 'Member' }],
            subject: payload.title || 'Notification from Partner Matching Platform',
            htmlContent: htmlBody,
          }),
        });

        const data: any = await res.json().catch(() => ({}));

        if (res.ok) {
          const msgId = data?.messageId || `brevo_${Date.now()}`;
          this.logger.log(`✅ [BREVO EMAIL] Dispatched to ${payload.recipientContact} (ID: ${msgId})`);
          return {
            success: true,
            provider: 'BREVO_EMAIL',
            providerMessageId: msgId,
            simulated: false,
          };
        } else {
          this.logger.warn(`Brevo API Error [${res.status}]: ${JSON.stringify(data)}`);
        }
      } catch (err: any) {
        this.logger.error(`Brevo dispatch error: ${err.message}`);
      }
    }

    // 2. SendGrid Web API v3
    if (sendgridApiKey && payload.recipientContact.includes('@')) {
      try {
        const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: payload.recipientContact, name: payload.recipientName }] }],
            from: { email: fromEmail, name: 'Partner Matching Platform' },
            subject: payload.title || 'Notification from Partner Matching Platform',
            content: [{ type: 'text/html', value: `<div style="font-family: Arial, sans-serif; padding: 20px;">${payload.content.replace(/\n/g, '<br/>')}</div>` }],
          }),
        });

        if (res.ok) {
          const msgId = res.headers.get('x-message-id') || `sg_${Date.now()}`;
          return {
            success: true,
            provider: 'SENDGRID_EMAIL',
            providerMessageId: msgId,
            simulated: false,
          };
        }
      } catch (err: any) {
        this.logger.error(`SendGrid dispatch error: ${err.message}`);
      }
    }

    // 3. Fallback: Simulated Email Dispatch
    this.logger.log(
      `📧 [EMAIL GATEWAY DISPATCH] To: ${payload.recipientContact} (${payload.recipientName || 'Member'}) | Subject: ${payload.title} | Content: "${payload.content}"`,
    );

    return {
      success: true,
      provider: 'EMAIL_GATEWAY_DEV',
      providerMessageId: `email_dev_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      simulated: true,
    };
  }
}
