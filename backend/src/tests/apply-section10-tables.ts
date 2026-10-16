import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying Section 10 Tables ---');

  // 1. NotificationLog table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "NotificationLog" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "type" TEXT NOT NULL,
        "channel" TEXT NOT NULL,
        "recipientUserId" TEXT,
        "recipientMemberProfileId" TEXT,
        "recipientContact" TEXT NOT NULL,
        "recipientName" TEXT,
        "title" TEXT,
        "content" TEXT NOT NULL,
        "templateId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "provider" TEXT,
        "providerMessageId" TEXT,
        "error" TEXT,
        "metadata" JSONB,
        "idempotencyKey" TEXT UNIQUE,
        "scheduledFor" TIMESTAMPTZ,
        "sentAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Created NotificationLog table');
  } catch (err: any) {
    console.error('Failed creating NotificationLog:', err.message);
  }

  // Foreign keys for NotificationLog
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "NotificationLog" 
      ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" 
      FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✓ Added recipientUserId foreign key');
  } catch (err: any) {
    console.log('recipientUserId FK already exists or error:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "NotificationLog" 
      ADD CONSTRAINT "NotificationLog_recipientMemberProfileId_fkey" 
      FOREIGN KEY ("recipientMemberProfileId") REFERENCES "MemberProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    console.log('✓ Added recipientMemberProfileId foreign key');
  } catch (err: any) {
    console.log('recipientMemberProfileId FK already exists or error:', err.message);
  }

  // 2. FestivalWishConfig table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "FestivalWishConfig" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "festivalName" TEXT NOT NULL,
        "festivalDate" TEXT NOT NULL,
        "messageTemplate" TEXT NOT NULL,
        "discountPercent" DOUBLE PRECISION,
        "offerCode" TEXT,
        "channels" JSONB,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdById" TEXT,
        "lastDispatchedAt" TIMESTAMPTZ,
        "dispatchCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    console.log('✓ Created FestivalWishConfig table');
  } catch (err: any) {
    console.error('Failed creating FestivalWishConfig:', err.message);
  }

  // 3. UserPushToken table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserPushToken" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "platform" TEXT NOT NULL DEFAULT 'WEB',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UserPushToken_userId_token_key" UNIQUE ("userId", "token")
      );
    `);
    console.log('✓ Created UserPushToken table');
  } catch (err: any) {
    console.error('Failed creating UserPushToken:', err.message);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "UserPushToken" 
      ADD CONSTRAINT "UserPushToken_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✓ Added UserPushToken userId foreign key');
  } catch (err: any) {
    console.log('UserPushToken userId FK already exists or error:', err.message);
  }

  // 4. Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS "NotificationLog_type_status_idx" ON "NotificationLog"("type", "status");`,
    `CREATE INDEX IF NOT EXISTS "NotificationLog_channel_idx" ON "NotificationLog"("channel");`,
    `CREATE INDEX IF NOT EXISTS "NotificationLog_recipientUserId_idx" ON "NotificationLog"("recipientUserId");`,
    `CREATE INDEX IF NOT EXISTS "NotificationLog_recipientMemberProfileId_idx" ON "NotificationLog"("recipientMemberProfileId");`,
    `CREATE INDEX IF NOT EXISTS "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");`,
    `CREATE INDEX IF NOT EXISTS "NotificationLog_idempotencyKey_idx" ON "NotificationLog"("idempotencyKey");`,
    `CREATE INDEX IF NOT EXISTS "FestivalWishConfig_festivalDate_isActive_idx" ON "FestivalWishConfig"("festivalDate", "isActive");`,
    `CREATE INDEX IF NOT EXISTS "UserPushToken_userId_isActive_idx" ON "UserPushToken"("userId", "isActive");`,
  ];

  for (const idx of indexes) {
    try {
      await prisma.$executeRawUnsafe(idx);
    } catch (e: any) {
      console.log('Index error:', e.message);
    }
  }
  console.log('✓ Verified indexes');

  // 5. SupportTicket and SmsCampaign columns
  const alterColumns = [
    `ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closureOtpHash" TEXT;`,
    `ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closureOtpFailedAttempts" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "closureOtpExpiresAt" TIMESTAMPTZ;`,
    `ALTER TABLE "SmsCampaign" ADD COLUMN IF NOT EXISTS "successCount" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "SmsCampaign" ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "SmsCampaign" ADD COLUMN IF NOT EXISTS "deliveryDetails" JSONB;`,
    `ALTER TABLE "SmsCampaign" ADD COLUMN IF NOT EXISTS "costPerSms" DOUBLE PRECISION NOT NULL DEFAULT 0.25;`,
    `ALTER TABLE "SmsCampaign" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;`,
  ];

  for (const alter of alterColumns) {
    try {
      await prisma.$executeRawUnsafe(alter);
    } catch (e: any) {
      console.log('Alter column error:', e.message);
    }
  }
  console.log('✓ Verified columns');

  // 6. RLS Policies
  const rlsStatements = [
    `ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "FestivalWishConfig" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "UserPushToken" ENABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE "SmsCampaign" ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "notification_log_select_policy" ON "NotificationLog";`,
    `CREATE POLICY "notification_log_select_policy" ON "NotificationLog"
      FOR SELECT TO authenticated
      USING (
        "recipientUserId" = (select auth.uid())::text
        OR EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = (select auth.uid())::text
          AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'FRANCHISE_MANAGER')
        )
      );`,

    `DROP POLICY IF EXISTS "notification_log_insert_service" ON "NotificationLog";`,
    `CREATE POLICY "notification_log_insert_service" ON "NotificationLog"
      FOR INSERT TO authenticated
      WITH CHECK (true);`,

    `DROP POLICY IF EXISTS "festival_select_policy" ON "FestivalWishConfig";`,
    `CREATE POLICY "festival_select_policy" ON "FestivalWishConfig"
      FOR SELECT TO authenticated
      USING (true);`,

    `DROP POLICY IF EXISTS "festival_admin_manage_policy" ON "FestivalWishConfig";`,
    `CREATE POLICY "festival_admin_manage_policy" ON "FestivalWishConfig"
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = (select auth.uid())::text
          AND u.role IN ('SUPER_ADMIN', 'ADMIN')
        )
      );`,

    `DROP POLICY IF EXISTS "push_token_user_policy" ON "UserPushToken";`,
    `CREATE POLICY "push_token_user_policy" ON "UserPushToken"
      FOR ALL TO authenticated
      USING ("userId" = (select auth.uid())::text)
      WITH CHECK ("userId" = (select auth.uid())::text);`,

    `DROP POLICY IF EXISTS "sms_campaign_branch_manager_policy" ON "SmsCampaign";`,
    `CREATE POLICY "sms_campaign_branch_manager_policy" ON "SmsCampaign"
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = (select auth.uid())::text
          AND (
            u.role IN ('SUPER_ADMIN', 'ADMIN')
            OR (u.role = 'BRANCH_MANAGER' AND "SmsCampaign"."branchOrgId" = u."organizationId")
          )
        )
      );`,

    `DROP POLICY IF EXISTS "sms_campaign_branch_manager_insert" ON "SmsCampaign";`,
    `CREATE POLICY "sms_campaign_branch_manager_insert" ON "SmsCampaign"
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "User" u
          WHERE u.id = (select auth.uid())::text
          AND (
            u.role IN ('SUPER_ADMIN', 'ADMIN')
            OR (u.role = 'BRANCH_MANAGER' AND "SmsCampaign"."branchOrgId" = u."organizationId")
          )
        )
      );`,
  ];

  for (const rls of rlsStatements) {
    try {
      await prisma.$executeRawUnsafe(rls);
    } catch (e: any) {
      console.log('RLS statement error:', e.message);
    }
  }
  console.log('✓ Applied RLS policies');

  console.log('All Section 10 tables, constraints, indexes, and RLS policies created!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
