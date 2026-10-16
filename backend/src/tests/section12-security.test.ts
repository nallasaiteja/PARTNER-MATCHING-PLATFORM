import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { ReportsService } from '../reports/reports.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../common/constants/roles.constants';
import * as bcrypt from 'bcrypt';
import * as assert from 'assert';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING SECTION 12 — SECURITY, AUDIT & 2FA TESTS');
  console.log('========================================================\n');

  const prisma = new PrismaService();
  const auditService = new AuditService(prisma);
  const jwtService = new JwtService({ secret: 'test-jwt-secret-key-12345' });
  const authService = new AuthService(prisma, jwtService, auditService);
  const reportsService = new ReportsService(prisma, auditService);

  try {
    // 0. Locate test Super Admin and non-admin
    const adminUser = await prisma.user.findFirst({
      where: { role: Role.SUPER_ADMIN },
    });
    assert.ok(adminUser, 'Super Admin user must exist in database');

    const branchManager = await prisma.user.findFirst({
      where: { role: Role.BRANCH_MANAGER },
    });

    const memberUser = await prisma.user.findFirst({
      where: { role: Role.MEMBER },
    });

    console.log(`✓ Test Setup: Super Admin (${adminUser.mobile}), Branch Manager (${branchManager?.mobile || 'N/A'}), Member (${memberUser?.mobile || 'N/A'})\n`);

    // -------------------------------------------------------------
    // TEST 1: Mandatory Admin 2FA Challenge on Login
    // -------------------------------------------------------------
    console.log('TEST 1: Mandatory 2FA Challenge for Admin Accounts');
    // Set a known test password for admin
    const testAdminPassword = 'AdminSecret@2026!';
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash: await bcrypt.hash(testAdminPassword, 12),
        twoFactorOtpHash: null,
        twoFactorOtpAttempts: 0,
      },
    });

    const adminLoginRes: any = await authService.login({
      identifier: adminUser.mobile,
      password: testAdminPassword,
    });

    assert.strictEqual(adminLoginRes.requires2fa, true, 'Admin login must require 2FA');
    assert.ok(adminLoginRes.challengeToken, 'Challenge token must be issued');
    assert.ok(adminLoginRes.devCode, 'Dev verification code generated');
    assert.strictEqual(adminLoginRes.accessToken, undefined, 'Access token must NOT be issued before 2FA');
    console.log('  -> Admin login triggered mandatory 2FA challenge. Passed.\n');

    // -------------------------------------------------------------
    // TEST 2: Ordinary Member Login Does NOT Require 2FA
    // -------------------------------------------------------------
    console.log('TEST 2: Ordinary Member Authentication (No 2FA Obstruction)');
    if (memberUser) {
      const testMemberPassword = 'MemberSecret@2026!';
      await prisma.user.update({
        where: { id: memberUser.id },
        data: {
          passwordHash: await bcrypt.hash(testMemberPassword, 12),
        },
      });

      const memberLoginRes: any = await authService.login({
        identifier: memberUser.mobile,
        password: testMemberPassword,
      });

      assert.strictEqual(memberLoginRes.requires2fa, undefined, 'Member should not be blocked by 2FA');
      assert.ok(memberLoginRes.accessToken, 'Member receives access token directly');
      console.log('  -> Member authenticated directly. Passed.\n');
    }

    // -------------------------------------------------------------
    // TEST 3: 2FA Verification & Retry Limit Enforcement
    // -------------------------------------------------------------
    console.log('TEST 3: 2FA Verification and Retry Limit Enforcement');
    // 3a. Invalid code attempt
    let failedAttemptCaught = false;
    try {
      await authService.verifyAdmin2fa({
        challengeToken: adminLoginRes.challengeToken,
        code: '000000',
      });
    } catch (err: any) {
      failedAttemptCaught = true;
      assert.ok(err.message.includes('Invalid 2FA') || err.status === 401);
    }
    assert.strictEqual(failedAttemptCaught, true, 'Invalid 2FA code must be rejected');

    // 3b. Valid code attempt
    const verifySuccess: any = await authService.verifyAdmin2fa({
      challengeToken: adminLoginRes.challengeToken,
      code: adminLoginRes.devCode,
    });

    assert.ok(verifySuccess.accessToken, 'Full access token issued after 2FA');
    assert.strictEqual(verifySuccess.is2faVerified, true, 'JWT marked is2faVerified = true');

    // Decode and verify the payload contains is2faVerified: true
    const decodedPayload: any = jwtService.verify(verifySuccess.accessToken, {
      secret: process.env.JWT_SECRET,
    });
    assert.strictEqual(decodedPayload.is2faVerified, true, 'Decoded token has is2faVerified: true');
    console.log('  -> Valid 2FA code accepted. Verified JWT issued with is2faVerified: true. Passed.\n');

    // -------------------------------------------------------------
    // TEST 4: Emergency Backup Recovery Codes
    // -------------------------------------------------------------
    console.log('TEST 4: Emergency 2FA Backup Recovery Codes');
    const setupRes = await authService.setupAdmin2fa(adminUser.id);
    assert.strictEqual(setupRes.success, true, '2FA setup successful');
    assert.strictEqual(setupRes.backupCodes.length, 5, '5 backup codes generated');

    // Trigger fresh login challenge
    const freshLogin: any = await authService.login({
      identifier: adminUser.mobile,
      password: testAdminPassword,
    });

    // Use the first emergency backup code
    const recoveryCodeToUse = setupRes.backupCodes[0];
    const recoveryRes = await authService.verifyAdminRecoveryCode({
      challengeToken: freshLogin.challengeToken,
      recoveryCode: recoveryCodeToUse,
    });

    assert.ok(recoveryRes.accessToken, 'Access token issued via recovery code');
    assert.strictEqual(recoveryRes.is2faVerified, true, 'is2faVerified set to true via recovery code');
    assert.strictEqual(recoveryRes.remainingBackupCodes, 4, 'Used recovery code consumed (4 left)');

    // Trying the same recovery code again must fail (Single-use enforcement)
    let reUseFailed = false;
    try {
      await authService.verifyAdminRecoveryCode({
        challengeToken: freshLogin.challengeToken,
        recoveryCode: recoveryCodeToUse,
      });
    } catch {
      reUseFailed = true;
    }
    assert.strictEqual(reUseFailed, true, 'Reusing a consumed recovery code must fail');
    console.log('  -> Single-use emergency recovery code verified and consumed. Passed.\n');

    // -------------------------------------------------------------
    // TEST 5: Member Data Download Restrictions (Super Admin / Admin Only)
    // -------------------------------------------------------------
    console.log('TEST 5: Member Data Export Permissions & Denial for Non-Admins');
    if (branchManager) {
      let branchManagerExportDenied = false;
      try {
        await reportsService.downloadMemberData(branchManager, {});
      } catch (err: any) {
        branchManagerExportDenied = err.status === 403 || err.message.includes('Access Denied');
      }
      assert.strictEqual(branchManagerExportDenied, true, 'Branch Manager must be denied member export');
    }

    if (memberUser) {
      let memberExportDenied = false;
      try {
        await reportsService.downloadMemberData(memberUser, {});
      } catch (err: any) {
        memberExportDenied = err.status === 403 || err.message.includes('Access Denied');
      }
      assert.strictEqual(memberExportDenied, true, 'Member must be denied member export');
    }

    // Super Admin must succeed
    const adminExport = await reportsService.downloadMemberData(adminUser, {});
    assert.ok(adminExport.records, 'Admin can download member export');
    assert.ok(adminExport.csvContent, 'CSV export generated');

    // Verify audit log entry for MEMBER_EXPORT
    const exportAudit = await prisma.auditLog.findFirst({
      where: {
        actorId: adminUser.id,
        action: 'MEMBER_EXPORT' as any,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(exportAudit, 'MEMBER_EXPORT action must be recorded in AuditLog');
    console.log('  -> Non-admin export blocked (403). Admin export succeeded and logged in AuditLog. Passed.\n');

    // -------------------------------------------------------------
    // TEST 6: Bcrypt Password Hashing Work Factor >= 12
    // -------------------------------------------------------------
    console.log('TEST 6: Password Hashing Work Factor & Plaintext Protection');
    const updatedAdmin = await prisma.user.findUnique({
      where: { id: adminUser.id },
      select: { passwordHash: true },
    });
    assert.ok(updatedAdmin?.passwordHash, 'Password hash exists');
    // Bcrypt hash format: $2a$12$ or $2b$12$
    const costFactorMatch = updatedAdmin.passwordHash.match(/^\$2[ab]\$(\d+)\$/);
    assert.ok(costFactorMatch, 'Must be valid bcrypt format');
    const cost = parseInt(costFactorMatch[1], 10);
    assert.ok(cost >= 12, `Bcrypt cost factor must be >= 12 (actual: ${cost})`);

    // Verify /auth/me sanitizes passwordHash
    const profile = await authService.getProfile(adminUser.id);
    assert.strictEqual((profile as any).passwordHash, undefined, 'passwordHash must never be exposed');
    console.log(`  -> Bcrypt work factor confirmed at ${cost} (>=12). passwordHash strictly concealed. Passed.\n`);

    // -------------------------------------------------------------
    // TEST 7: Central Audit Trail Querying
    // -------------------------------------------------------------
    console.log('TEST 7: Central Audit Trail Logging & Querying');
    const auditQuery = await auditService.queryAuditLogs({
      actorId: adminUser.id,
      limit: 10,
    });
    assert.ok(auditQuery.total > 0, 'Audit records must be queryable');
    assert.ok(auditQuery.logs.length > 0, 'Logs array returned');
    assert.ok(auditQuery.logs[0].action, 'Audit action is present');
    console.log(`  -> Retrieved ${auditQuery.total} audit events for Admin. Passed.\n`);

    console.log('========================================================');
    console.log('🎉 ALL SECTION 12 SECURITY TESTS PASSED (7/7)');
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
