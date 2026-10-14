-- ============================================================================
-- Section 5: Supabase Row Level Security (RLS) & Access Policies
-- HQ Admin Panel, Staff, Master Data, Ads, Wedding Services
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL SECTION 5 TABLES
ALTER TABLE IF EXISTS "StaffPaymentHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "StaffAccessRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProfileUpdateRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberInternalNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PaymentAlert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SmsCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MasterData" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Advertisement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "WeddingService" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. STAFF PAYMENT HISTORY POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_payment_history_select_own" ON "StaffPaymentHistory";
CREATE POLICY "staff_payment_history_select_own" ON "StaffPaymentHistory"
  FOR SELECT
  TO authenticated
  USING (
    "staffId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "staff_payment_history_admin_all" ON "StaffPaymentHistory";
CREATE POLICY "staff_payment_history_admin_all" ON "StaffPaymentHistory"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ----------------------------------------------------------------------------
-- 3. STAFF ACCESS RULES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_access_rules_select" ON "StaffAccessRule";
CREATE POLICY "staff_access_rules_select" ON "StaffAccessRule"
  FOR SELECT
  TO authenticated
  USING (
    "staffId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "staff_access_rules_admin_all" ON "StaffAccessRule";
CREATE POLICY "staff_access_rules_admin_all" ON "StaffAccessRule"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- ----------------------------------------------------------------------------
-- 4. PROFILE UPDATE REQUESTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profile_update_request_member_select" ON "ProfileUpdateRequest";
CREATE POLICY "profile_update_request_member_select" ON "ProfileUpdateRequest"
  FOR SELECT
  TO authenticated
  USING (
    "memberProfileId" IN (
      SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text
    )
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role NOT IN ('MEMBER')
    )
  );

DROP POLICY IF EXISTS "profile_update_request_member_insert" ON "ProfileUpdateRequest";
CREATE POLICY "profile_update_request_member_insert" ON "ProfileUpdateRequest"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "memberProfileId" IN (
      SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text
    )
  );

DROP POLICY IF EXISTS "profile_update_request_staff_update" ON "ProfileUpdateRequest";
CREATE POLICY "profile_update_request_staff_update" ON "ProfileUpdateRequest"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'BRANCH_STAFF')
    )
  );

-- ----------------------------------------------------------------------------
-- 5. MEMBER INTERNAL NOTES POLICIES (STRICTLY FORBIDDEN FOR MEMBERS)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "internal_notes_staff_select" ON "MemberInternalNote";
CREATE POLICY "internal_notes_staff_select" ON "MemberInternalNote"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER', 'FRANCHISE_STAFF')
    )
  );

DROP POLICY IF EXISTS "internal_notes_staff_insert" ON "MemberInternalNote";
CREATE POLICY "internal_notes_staff_insert" ON "MemberInternalNote"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER', 'FRANCHISE_STAFF')
    )
  );

-- ----------------------------------------------------------------------------
-- 6. PAYMENT ALERTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "payment_alerts_staff_all" ON "PaymentAlert";
CREATE POLICY "payment_alerts_staff_all" ON "PaymentAlert"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER', 'FRANCHISE_STAFF')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER', 'FRANCHISE_STAFF')
    )
  );

-- ----------------------------------------------------------------------------
-- 7. SMS CAMPAIGNS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "sms_campaigns_staff_all" ON "SmsCampaign";
CREATE POLICY "sms_campaigns_staff_all" ON "SmsCampaign"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'FRANCHISE_MANAGER')
    )
  );

-- ----------------------------------------------------------------------------
-- 8. MASTER DATA POLICIES (Public read for active items, Super Admin write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "master_data_select_all" ON "MasterData";
CREATE POLICY "master_data_select_all" ON "MasterData"
  FOR SELECT
  TO authenticated, anon
  USING ( "isActive" = true );

DROP POLICY IF EXISTS "master_data_super_admin_all" ON "MasterData";
CREATE POLICY "master_data_super_admin_all" ON "MasterData"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  );

-- ----------------------------------------------------------------------------
-- 9. ADVERTISEMENT POLICIES (Public read for active items, Super Admin write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "advertisement_select_active" ON "Advertisement";
CREATE POLICY "advertisement_select_active" ON "Advertisement"
  FOR SELECT
  TO authenticated, anon
  USING ( "isActive" = true AND "status" = 'ACTIVE' );

DROP POLICY IF EXISTS "advertisement_super_admin_all" ON "Advertisement";
CREATE POLICY "advertisement_super_admin_all" ON "Advertisement"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  );

-- ----------------------------------------------------------------------------
-- 10. WEDDING SERVICES POLICIES (Public read for active items, Super Admin write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "wedding_service_select_active" ON "WeddingService";
CREATE POLICY "wedding_service_select_active" ON "WeddingService"
  FOR SELECT
  TO authenticated, anon
  USING ( "isActive" = true );

DROP POLICY IF EXISTS "wedding_service_super_admin_all" ON "WeddingService";
CREATE POLICY "wedding_service_super_admin_all" ON "WeddingService"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role = 'SUPER_ADMIN'
    )
  );
