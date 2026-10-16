-- ============================================================================
-- Section 6: Supabase Row Level Security (RLS) & Access Policies
-- Approvals, Invoices & Financial Flows
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL SECTION 6 TABLES
ALTER TABLE IF EXISTS "MemberInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FranchiseWallet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FranchiseWalletTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FinancialLedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CommissionConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "CommissionTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FinancialAuditLog" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. MEMBER INVOICE POLICIES
-- ----------------------------------------------------------------------------
-- Member can view their own invoices
DROP POLICY IF EXISTS "member_invoice_select_own" ON "MemberInvoice";
CREATE POLICY "member_invoice_select_own" ON "MemberInvoice"
  FOR SELECT
  TO authenticated
  USING (
    "memberProfileId" IN (
      SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text
    )
    OR "raisedById" = (select auth.uid())::text
    OR "saleStaffId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role IN ('BRANCH_MANAGER', 'BRANCH_STAFF', 'BRANCH_AGENT') AND u."organizationId" = "MemberInvoice"."orgId")
        OR (u.role IN ('FRANCHISE_MANAGER', 'FRANCHISE_STAFF', 'FRANCHISE_AGENT') AND u."organizationId" = "MemberInvoice"."orgId")
      )
    )
  );

-- Authorized Staff can insert invoice requests for their own organization
DROP POLICY IF EXISTS "member_invoice_insert_authorized" ON "MemberInvoice";
CREATE POLICY "member_invoice_insert_authorized" ON "MemberInvoice"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role IN ('BRANCH_MANAGER', 'BRANCH_STAFF', 'BRANCH_AGENT') AND u."organizationId" = "MemberInvoice"."orgId")
        OR (u.role IN ('FRANCHISE_MANAGER', 'FRANCHISE_STAFF', 'FRANCHISE_AGENT') AND u."organizationId" = "MemberInvoice"."orgId")
        OR (u.role = 'MEMBER' AND "MemberInvoice"."memberProfileId" IN (
          SELECT id FROM "MemberProfile" WHERE "userId" = u.id
        ))
      )
    )
  );

-- Admins and Franchise Managers (for their franchise) can update invoice status
DROP POLICY IF EXISTS "member_invoice_update_authorized" ON "MemberInvoice";
CREATE POLICY "member_invoice_update_authorized" ON "MemberInvoice"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND u."organizationId" = "MemberInvoice"."orgId")
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND u."organizationId" = "MemberInvoice"."orgId")
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. FRANCHISE WALLET POLICIES
-- ----------------------------------------------------------------------------
-- Franchise Manager views own wallet; Super Admin / Admin view all
DROP POLICY IF EXISTS "franchise_wallet_select" ON "FranchiseWallet";
CREATE POLICY "franchise_wallet_select" ON "FranchiseWallet"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND u."organizationId" = "FranchiseWallet"."franchiseOrgId")
      )
    )
  );

-- Only Super Admin can directly manage wallet limits / top-ups
DROP POLICY IF EXISTS "franchise_wallet_admin_modify" ON "FranchiseWallet";
CREATE POLICY "franchise_wallet_admin_modify" ON "FranchiseWallet"
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
-- 4. FRANCHISE WALLET TRANSACTIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "franchise_wallet_tx_select" ON "FranchiseWalletTransaction";
CREATE POLICY "franchise_wallet_tx_select" ON "FranchiseWalletTransaction"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND u."organizationId" = "FranchiseWalletTransaction"."franchiseOrgId")
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 5. FINANCIAL LEDGER POLICIES
-- ----------------------------------------------------------------------------
-- HQ ledger viewable by Admin/Super Admin; Franchise ledger by Franchise Manager; Agent ledger by Agent
DROP POLICY IF EXISTS "financial_ledger_select" ON "FinancialLedgerEntry";
CREATE POLICY "financial_ledger_select" ON "FinancialLedgerEntry"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "FinancialLedgerEntry"."ledgerType" = 'FRANCHISE' AND "FinancialLedgerEntry"."ownerOrgId" = u."organizationId")
        OR ("FinancialLedgerEntry"."ledgerType" = 'AGENT' AND "FinancialLedgerEntry"."agentUserId" = u.id)
      )
    )
  );

DROP POLICY IF EXISTS "financial_ledger_admin_all" ON "FinancialLedgerEntry";
CREATE POLICY "financial_ledger_admin_all" ON "FinancialLedgerEntry"
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
-- 6. COMMISSION CONFIGURATION POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "commission_config_select" ON "CommissionConfig";
CREATE POLICY "commission_config_select" ON "CommissionConfig"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "CommissionConfig"."orgId" = u."organizationId")
        OR "CommissionConfig"."agentUserId" = u.id
      )
    )
  );

DROP POLICY IF EXISTS "commission_config_modify" ON "CommissionConfig";
CREATE POLICY "commission_config_modify" ON "CommissionConfig"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "CommissionConfig"."orgId" = u."organizationId")
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "CommissionConfig"."orgId" = u."organizationId")
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 7. COMMISSION TRANSACTIONS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "commission_tx_select" ON "CommissionTransaction";
CREATE POLICY "commission_tx_select" ON "CommissionTransaction"
  FOR SELECT
  TO authenticated
  USING (
    "agentUserId" = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'FRANCHISE_MANAGER' AND "CommissionTransaction"."orgId" = u."organizationId")
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 8. FINANCIAL AUDIT LOGS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "financial_audit_select_admin" ON "FinancialAuditLog";
CREATE POLICY "financial_audit_select_admin" ON "FinancialAuditLog"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = (select auth.uid())::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "financial_audit_insert_all" ON "FinancialAuditLog";
CREATE POLICY "financial_audit_insert_all" ON "FinancialAuditLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
