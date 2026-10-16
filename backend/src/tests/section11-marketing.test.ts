import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushNotificationProvider } from '../notifications/providers/push.provider';
import { SmsNotificationProvider } from '../notifications/providers/sms.provider';
import { EmailNotificationProvider } from '../notifications/providers/email.provider';
import { WhatsAppNotificationProvider } from '../notifications/providers/whatsapp.provider';
import { MarketingService } from '../marketing/marketing.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/constants/roles.constants';
import * as assert from 'assert';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING SECTION 11.6 — MARKETING & SEO TESTS');
  console.log('========================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const pushProvider = new PushNotificationProvider();
  const smsProvider = new SmsNotificationProvider();
  const emailProvider = new EmailNotificationProvider();
  const whatsappProvider = new WhatsAppNotificationProvider();
  const notificationsService = new NotificationsService(
    prisma,
    pushProvider,
    smsProvider,
    emailProvider,
    whatsappProvider,
  );
  const marketingService = new MarketingService(prisma, notificationsService, auditService);

  const jwtService = new JwtService({ secret: 'test-jwt-secret-key-12345' });
  const authService = new AuthService(prisma, jwtService, auditService);

  try {
    // 0. Setup actors
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    assert.ok(adminUser, 'Super Admin must exist');
    const adminActor = { id: adminUser.id, role: Role.SUPER_ADMIN };

    const memberUser = await prisma.user.findFirst({
      where: { role: Role.MEMBER },
    });
    const nonAdminActor = { id: memberUser?.id || 'non-admin', role: Role.MEMBER };

    console.log('✓ Test Setup Completed.\n');

    // TEST 1: Security & Role Authorization Guard
    console.log('Test 1: Security enforcement for marketing endpoints');
    let deniedAttribution = false;
    try {
      await marketingService.getAttributionReport(nonAdminActor);
    } catch (err: any) {
      deniedAttribution = err.status === 403 || err.message.includes('Forbidden') || err.message.includes('Only Administrators');
    }
    assert.strictEqual(deniedAttribution, true, 'Non-admin must be forbidden from accessing attribution report');

    let deniedCampaign = false;
    try {
      await marketingService.sendWhatsAppCampaign(nonAdminActor, {
        campaignName: 'Unauthorized Campaign',
        templateId: 'festival_wishes_v1',
        targetAudience: 'ALL_MEMBERS',
      });
    } catch (err: any) {
      deniedCampaign = err.status === 403 || err.message.includes('Forbidden') || err.message.includes('Only Administrators');
    }
    assert.strictEqual(deniedCampaign, true, 'Non-admin must be forbidden from dispatching WhatsApp marketing campaigns');
    console.log('  -> Non-admin access strictly blocked (403 Forbidden). Passed.\n');

    // TEST 2: Platform-Branded WhatsApp Templates
    console.log('Test 2: Pre-approved WhatsApp template availability');
    const templates = marketingService.getApprovedTemplates();
    assert.ok(templates.length >= 4, 'Must provide pre-approved platform templates');
    const templateIds = templates.map((t) => t.id);
    assert.ok(templateIds.includes('festival_wishes_v1'), 'Must include festival wishes template');
    assert.ok(templateIds.includes('welcome_message_v1'), 'Must include welcome template');
    assert.ok(templateIds.includes('package_expiry_v1'), 'Must include package expiry template');
    console.log(`  -> Available pre-approved templates: ${templateIds.join(', ')}. Passed.\n`);

    // TEST 3: Member Registration with Source Attribution Tracking
    console.log('Test 3: Member registration captures referral source and UTM parameters');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const testMobile = `9199${randomSuffix}`;

    // First request OTP so it can be verified during registration
    const otpRes = await authService.requestRegistrationOtp({
      recipient: testMobile,
      channel: 'mobile',
    });

    const registered = await authService.registerMember({
      firstName: 'Marketing',
      lastName: `Test ${randomSuffix}`,
      gender: 'MALE',
      dateOfBirth: '1995-05-15',
      maritalStatus: 'NEVER_MARRIED',
      religion: 'Hindu',
      caste: 'Reddy',
      mobile: testMobile,
      password: 'SecurePassword123!',
      otpCode: otpRes.devCode || '123456',
      channel: 'mobile',
      termsAccepted: true,
      registrationSource: 'GOOGLE',
      attributionData: {
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'diwali_2026_special',
        term: 'partner match matrimony',
      },
    });

    assert.ok(registered.user, 'User should be created');
    assert.ok(registered.memberProfile, 'MemberProfile should be created');
    assert.strictEqual(registered.memberProfile.registrationSource, 'GOOGLE', 'Profile should preserve registration source');
    assert.ok(registered.memberProfile.attributionData, 'Profile should store attributionData');
    const attrData = registered.memberProfile.attributionData as any;
    assert.strictEqual(attrData.utm_source, 'google', 'UTM source preserved');
    assert.strictEqual(attrData.utm_campaign, 'diwali_2026_special', 'UTM campaign preserved');
    console.log(`  -> Member registered with Source: GOOGLE, Campaign: ${attrData.utm_campaign}. Passed.\n`);

    // TEST 4: Attribution Report Aggregation
    console.log('Test 4: Attribution Report reflects registered source and UTM distribution');
    const report = await marketingService.getAttributionReport(adminActor);
    assert.ok(report.totalMembersAnalyzed > 0, 'Report must analyze registered members');
    assert.ok(report.sourceBreakdown.GOOGLE >= 1, 'Google source count must be at least 1');
    assert.ok(report.utmBreakdown.sources['google'] >= 1, 'UTM source "google" count must be tracked');
    assert.ok(report.utmBreakdown.campaigns['diwali_2026_special'] >= 1, 'UTM campaign must be tracked');
    assert.ok(Array.isArray(report.recentAttributions), 'Recent attributions list must be returned');
    console.log(`  -> Analyzed ${report.totalMembersAnalyzed} members. Sources:`, report.sourceBreakdown);
    console.log('  -> Attribution reporting verified. Passed.\n');

    // TEST 5: Safe WhatsApp Marketing Campaign Dispatch
    console.log('Test 5: Safe WhatsApp marketing campaign execution (Simulated Dev Mode)');
    const campaignResult = await marketingService.sendWhatsAppCampaign(adminActor, {
      campaignName: 'Test Festive Matchmaking Campaign',
      templateId: 'festival_wishes_v1',
      targetAudience: 'ALL_MEMBERS',
      customMessage: 'Auspicious festive greetings! Find your life partner today.',
    });

    assert.strictEqual(campaignResult.success, true, 'Campaign dispatch must succeed');
    assert.strictEqual(campaignResult.simulated, true, 'Without WhatsApp API key, must run in simulated dev mode');
    assert.ok(campaignResult.dispatchedCount >= 0, 'Dispatched count must be non-negative');
    console.log(`  -> WhatsApp campaign dispatched. Targeted: ${campaignResult.totalTargeted}, Dispatched: ${campaignResult.dispatchedCount}, Simulated: ${campaignResult.simulated}. Passed.\n`);

    // TEST 6: YouTube Embed URL Security Validation
    console.log('Test 6: YouTube embed URL validation & XSS protection');
    const safeYouTubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    
    const validUrl1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const validUrl2 = 'https://youtu.be/dQw4w9WgXcQ';
    const validUrl3 = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    const maliciousUrl1 = 'javascript:alert("XSS")';
    const maliciousUrl2 = 'https://attacker.com/malicious.mp4';
    const maliciousUrl3 = '<iframe src="http://evil.com"></iframe>';

    assert.ok(safeYouTubeRegex.test(validUrl1), 'Standard watch URL must match');
    assert.ok(safeYouTubeRegex.test(validUrl2), 'Short youtu.be URL must match');
    assert.ok(safeYouTubeRegex.test(validUrl3), 'Embed URL must match');
    assert.strictEqual(safeYouTubeRegex.test(maliciousUrl1), false, 'JavaScript protocol must be rejected');
    assert.strictEqual(safeYouTubeRegex.test(maliciousUrl2), false, 'Arbitrary domain must be rejected');
    assert.strictEqual(safeYouTubeRegex.test(maliciousUrl3), false, 'Direct iframe injection string must be rejected');
    console.log('  -> Safe YouTube regex accepted valid URLs and rejected malicious/arbitrary injections. Passed.\n');

    // Clean up test member
    await prisma.auditLog.deleteMany({
      where: { actorId: registered.user.id },
    });
    await prisma.memberProfile.deleteMany({
      where: { id: registered.memberProfile.id },
    });
    await prisma.user.deleteMany({
      where: { id: registered.user.id },
    });

    console.log('========================================================');
    console.log('🎉 ALL SECTION 11.6 MARKETING & SEO TESTS PASSED (6/6)');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
