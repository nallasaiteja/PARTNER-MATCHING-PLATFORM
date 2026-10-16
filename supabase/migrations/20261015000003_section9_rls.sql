-- ==============================================================================
-- SECTION 9: AGENT PORTAL (BRANCH AGENT & FRANCHISE AGENT) - RLS POLICIES
-- ==============================================================================

-- 1. Ensure RLS is active on core tables
ALTER TABLE IF EXISTS "MemberProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CommissionConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CommissionTransaction" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. MEMBER PROFILE POLICIES FOR AGENTS
-- Rules:
-- - An agent can access ONLY profiles they personally created.
-- - One agent must never see another agent's profiles.
-- - Branch Agents must not gain access to all profiles belonging to their branch unless created by them.
-- - Agents cannot permanently delete member profiles.
-- ------------------------------------------------------------------------------

-- Allow Branch & Franchise Agents to view ONLY profiles they personally created
DROP POLICY IF EXISTS "agent_member_profile_select_own" ON "MemberProfile";
CREATE POLICY "agent_member_profile_select_own"
  ON "MemberProfile"
  FOR SELECT
  TO authenticated
  USING (
    "createdByStaffId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
    )
  );

-- Allow Branch & Franchise Agents to insert profiles they personally create
DROP POLICY IF EXISTS "agent_member_profile_insert_own" ON "MemberProfile";
CREATE POLICY "agent_member_profile_insert_own"
  ON "MemberProfile"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "createdByStaffId" = (select auth.uid())::text
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        (u.role = 'BRANCH_AGENT' AND "MemberProfile"."ownershipType" = 'BRANCH' AND "MemberProfile"."ownerOrgId" = u."organizationId")
        OR (u.role = 'FRANCHISE_AGENT' AND "MemberProfile"."ownershipType" = 'FRANCHISE' AND "MemberProfile"."ownerOrgId" = u."organizationId")
        OR u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
      )
    )
  );

-- Allow Branch & Franchise Agents to update ONLY their own created profiles
DROP POLICY IF EXISTS "agent_member_profile_update_own" ON "MemberProfile";
CREATE POLICY "agent_member_profile_update_own"
  ON "MemberProfile"
  FOR UPDATE
  TO authenticated
  USING (
    (
      "createdByStaffId" = (select auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = (select auth.uid())::text
        AND u.role IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
      )
    )
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
    )
  )
  WITH CHECK (
    (
      "createdByStaffId" = (select auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u.id = (select auth.uid())::text
        AND u.role IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
      )
    )
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
    )
  );

-- STRICTLY FORBID DELETE: No DELETE policy for agents on MemberProfile
DROP POLICY IF EXISTS "agent_member_profile_delete_deny" ON "MemberProfile";
-- Member profiles are permanent; agents have no DELETE grant.

-- ------------------------------------------------------------------------------
-- 3. MEMBER INVOICE POLICIES FOR AGENTS
-- Rules:
-- - Branch Agent: raises invoice request to HQ (status = PENDING)
-- - Franchise Agent: raises invoice request to Franchise Manager (status = PENDING)
-- - Agents cannot approve invoice requests or directly mark members as Paid.
-- - Agents can view their own invoice requests.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "agent_invoice_select_own" ON "MemberInvoice";
CREATE POLICY "agent_invoice_select_own"
  ON "MemberInvoice"
  FOR SELECT
  TO authenticated
  USING (
    "raisedById" = (select auth.uid())::text
    OR "saleStaffId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
    )
  );

DROP POLICY IF EXISTS "agent_invoice_insert_own" ON "MemberInvoice";
CREATE POLICY "agent_invoice_insert_own"
  ON "MemberInvoice"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "raisedById" = (select auth.uid())::text
    AND "status" = 'PENDING'
    AND EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        (u.role IN ('BRANCH_AGENT', 'FRANCHISE_AGENT') AND "MemberInvoice"."orgId" = u."organizationId")
        OR u.role NOT IN ('BRANCH_AGENT', 'FRANCHISE_AGENT')
      )
    )
  );

-- Agents are NOT allowed to update invoices (status changes / approvals)
-- Update remains restricted to Super Admin, Admin, and Franchise Manager (for their own franchise)

-- ------------------------------------------------------------------------------
-- 4. COMMISSION POLICIES FOR AGENTS
-- Rules:
-- - Branch Agents and Franchise Agents can view only their own assigned commission configuration and transactions.
-- - Agents cannot create, modify, or delete commission configs.
-- - Branch Agents have NO independent wallets.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "agent_commission_config_select_own" ON "CommissionConfig";
CREATE POLICY "agent_commission_config_select_own"
  ON "CommissionConfig"
  FOR SELECT
  TO authenticated
  USING (
    "agentUserId" = (select auth.uid())::text
    OR "scope" = 'GLOBAL_BRANCH'
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "CommissionConfig"."orgId" = u."organizationId")
        OR (u.role = 'FRANCHISE_AGENT' AND "CommissionConfig"."orgId" = u."organizationId")
      )
    )
  );

DROP POLICY IF EXISTS "agent_commission_tx_select_own" ON "CommissionTransaction";
CREATE POLICY "agent_commission_tx_select_own"
  ON "CommissionTransaction"
  FOR SELECT
  TO authenticated
  USING (
    "agentUserId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'FRANCHISE_MANAGER')
    )
  );

-- ------------------------------------------------------------------------------
-- 5. AGENT WALLET RESTRICTION
-- Branch Agents must NOT have independent wallets.
-- Franchise Agents must NOT access Franchise Wallets.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "agent_wallet_deny" ON "FranchiseWallet";
-- Agents have no access to FranchiseWallet; only Franchise Manager & Admin have access.
