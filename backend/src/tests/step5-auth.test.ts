import * as assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

async function run() {
  const originalFetch = global.fetch;
  const originalEnv = {
    sms: process.env.SMS_PROVIDER_WEBHOOK_URL,
    email: process.env.EMAIL_PROVIDER_WEBHOOK_URL,
    frontend: process.env.FRONTEND_BASE_URL,
  };
  const deliveries: any[] = [];
  const user: any = {
    id: 'member-1',
    mobile: '+15555550123',
    email: 'member@example.test',
    passwordHash: await bcrypt.hash('OldPassword!234', 10),
    mobileVerified: false,
    emailVerified: false,
    mobileOtpHash: null,
    mobileOtpExpiresAt: null,
    mobileOtpSentAt: null,
    mobileOtpFailedAttempts: 0,
    emailOtpHash: null,
    emailOtpExpiresAt: null,
    emailOtpSentAt: null,
    emailOtpFailedAttempts: 0,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    passwordResetRequestedAt: null,
  };

  (process.env as any).SMS_PROVIDER_WEBHOOK_URL = 'http://provider.test/sms';
  (process.env as any).EMAIL_PROVIDER_WEBHOOK_URL = 'http://provider.test/email';
  (process.env as any).FRONTEND_BASE_URL = 'https://app.example.test';
  global.fetch = (async (_url: any, init: any) => {
    deliveries.push(JSON.parse(init.body));
    return new Response(null, { status: 202 });
  }) as typeof fetch;

  const prisma: any = {
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id === user.id || where.email === user.email) return user;
        return null;
      },
      findFirst: async ({ where }: any) =>
        where.passwordResetTokenHash === user.passwordResetTokenHash ? user : null,
      update: async ({ data }: any) => {
        Object.assign(user, data);
        return user;
      },
    },
  };
  const service = new AuthService(prisma, {} as any, {} as any);

  try {
    const requestResult = await service.requestMobileVerification(user.id);
    const mobileDelivery = deliveries.at(-1);
    assert.equal(requestResult.message, 'Mobile verification code sent');
    assert.match(mobileDelivery.code, /^\d{6}$/);
    assert.equal(JSON.stringify(requestResult).includes(mobileDelivery.code), false);
    assert.equal(await bcrypt.compare(mobileDelivery.code, user.mobileOtpHash), true);
    assert.ok(user.mobileOtpExpiresAt.getTime() > Date.now());

    await assert.rejects(service.verifyMobile(user.id, '111111'), UnauthorizedException);
    assert.equal(user.mobileOtpFailedAttempts, 1);
    await assert.rejects(service.requestMobileVerification(user.id), (error: any) =>
      error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
    await service.verifyMobile(user.id, mobileDelivery.code);
    assert.equal(user.mobileVerified, true);
    assert.equal(user.mobileOtpHash, null);

    user.emailOtpSentAt = new Date(0);
    await service.requestEmailVerification(user.id);
    const emailCode = deliveries.at(-1).code;
    user.emailOtpExpiresAt = new Date(Date.now() - 1);
    await assert.rejects(service.verifyEmail(user.id, emailCode), UnauthorizedException);
    assert.equal(user.emailVerified, false);

    user.emailOtpSentAt = new Date(0);
    await service.requestEmailVerification(user.id);
    const validEmailCode = deliveries.at(-1).code;
    const invalidEmailCode = validEmailCode === '000000' ? '999999' : '000000';
    await assert.rejects(service.verifyEmail(user.id, invalidEmailCode), UnauthorizedException);
    assert.equal(user.emailOtpFailedAttempts, 1);
    await assert.rejects(service.requestEmailVerification(user.id), (error: any) =>
      error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );
    await service.verifyEmail(user.id, validEmailCode);
    assert.equal(user.emailVerified, true);
    assert.equal(user.emailOtpHash, null);

    user.mobileOtpSentAt = new Date(0);
    await service.requestMobileVerification(user.id);
    const wrongCode = deliveries.at(-1).code === '000000' ? '999999' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assert.rejects(service.verifyMobile(user.id, wrongCode), UnauthorizedException);
    }
    await assert.rejects(service.verifyMobile(user.id, wrongCode), (error: any) =>
      error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS,
    );

    const unknownEmailResponse = await service.requestPasswordReset('unknown@example.test');
    assert.match(unknownEmailResponse.message, /If the account exists/);
    assert.equal(JSON.stringify(unknownEmailResponse).includes('unknown@example.test'), false);
    const changed = await service.changePassword(user.id, 'OldPassword!234', 'NewPassword!567');
    assert.equal(changed.message, 'Password changed successfully');
    assert.equal(await bcrypt.compare('NewPassword!567', user.passwordHash), true);

    user.passwordResetRequestedAt = null;
    const genericResult = await service.requestPasswordReset(user.email);
    const resetDelivery = deliveries.at(-1);
    const resetToken = new URL(resetDelivery.resetUrl).searchParams.get('token')!;
    assert.match(resetToken, /^[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(genericResult).includes(resetToken), false);
    assert.notEqual(user.passwordResetTokenHash, resetToken);
    await service.resetPassword(resetToken, 'ResetPassword!567');
    assert.equal(await bcrypt.compare('ResetPassword!567', user.passwordHash), true);
    assert.equal(user.passwordResetTokenHash, null);
    await assert.rejects(service.resetPassword(resetToken, 'AnotherPassword!567'));
    const safeUser = await service.getProfile(user.id);
    assert.equal('passwordHash' in safeUser, false);
    assert.equal('mobileOtpHash' in safeUser, false);
    assert.equal('emailOtpHash' in safeUser, false);
    assert.equal('passwordResetTokenHash' in safeUser, false);

    const storedOtpHash = user.mobileOtpHash;
    (process.env as any).SMS_PROVIDER_WEBHOOK_URL = '';
    user.mobileOtpSentAt = new Date(0);
    await assert.rejects(service.requestMobileVerification(user.id), ServiceUnavailableException);
    assert.equal(user.mobileOtpHash, storedOtpHash);

    (process.env as any).EMAIL_PROVIDER_WEBHOOK_URL = '';
    await assert.rejects(service.requestPasswordReset('nobody@example.test'), ServiceUnavailableException);
  } finally {
    global.fetch = originalFetch;
    if (originalEnv.sms === undefined) delete process.env.SMS_PROVIDER_WEBHOOK_URL;
    else process.env.SMS_PROVIDER_WEBHOOK_URL = originalEnv.sms;
    if (originalEnv.email === undefined) delete process.env.EMAIL_PROVIDER_WEBHOOK_URL;
    else process.env.EMAIL_PROVIDER_WEBHOOK_URL = originalEnv.email;
    if (originalEnv.frontend === undefined) delete process.env.FRONTEND_BASE_URL;
    else process.env.FRONTEND_BASE_URL = originalEnv.frontend;
  }

  console.log('Step 5 OTP, expiry, attempts, resend, password change/reset, and provider checks passed');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});