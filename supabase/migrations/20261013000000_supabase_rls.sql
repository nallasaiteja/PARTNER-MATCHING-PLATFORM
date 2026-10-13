-- ============================================================================
-- Section 4: Supabase Row Level Security (RLS) & Access Policies
-- Partner Matching Platform (Telugu Matrimony)
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL SECTION 4 TABLES
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberInterest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ContactRevealRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberShortlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberBlocklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ProfileViewLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MemberInvoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PackageMaster" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. USER TABLE POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_select_self" ON "User";
CREATE POLICY "user_select_self" ON "User"
  FOR SELECT
  TO authenticated
  USING ( (select auth.uid())::text = id );

DROP POLICY IF EXISTS "user_update_self" ON "User";
CREATE POLICY "user_update_self" ON "User"
  FOR UPDATE
  TO authenticated
  USING ( (select auth.uid())::text = id )
  WITH CHECK ( (select auth.uid())::text = id );

-- ----------------------------------------------------------------------------
-- 3. MEMBER PROFILE POLICIES
-- ----------------------------------------------------------------------------
-- Members can view their own profile completely
DROP POLICY IF EXISTS "member_profile_select_own" ON "MemberProfile";
CREATE POLICY "member_profile_select_own" ON "MemberProfile"
  FOR SELECT
  TO authenticated
  USING ( (select auth.uid())::text = "userId" );

-- Members can view other active, unblocked member profiles
DROP POLICY IF EXISTS "member_profile_select_browse" ON "MemberProfile";
CREATE POLICY "member_profile_select_browse" ON "MemberProfile"
  FOR SELECT
  TO authenticated
  USING (
    "isBlocked" = false
    AND "userId" != (select auth.uid())::text
  );

-- Members can update only their own profile
DROP POLICY IF EXISTS "member_profile_update_own" ON "MemberProfile";
CREATE POLICY "member_profile_update_own" ON "MemberProfile"
  FOR UPDATE
  TO authenticated
  USING ( (select auth.uid())::text = "userId" )
  WITH CHECK ( (select auth.uid())::text = "userId" );

-- ----------------------------------------------------------------------------
-- 4. IMMUTABLE FIELDS ENFORCEMENT TRIGGER (Section 3 & 4)
-- Immutable fields: firstName, lastName, dateOfBirth, gender
-- Cannot be updated directly once set by member.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_immutable_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoked by authenticated member updating their own record
  IF (select auth.uid()) IS NOT NULL THEN
    IF OLD."firstName" IS NOT NULL AND NEW."firstName" IS DISTINCT FROM OLD."firstName" THEN
      RAISE EXCEPTION 'First Name is immutable and cannot be updated.';
    END IF;
    IF OLD."lastName" IS NOT NULL AND NEW."lastName" IS DISTINCT FROM OLD."lastName" THEN
      RAISE EXCEPTION 'Last Name is immutable and cannot be updated.';
    END IF;
    IF OLD."dateOfBirth" IS NOT NULL AND NEW."dateOfBirth" IS DISTINCT FROM OLD."dateOfBirth" THEN
      RAISE EXCEPTION 'Date of Birth is immutable and cannot be updated.';
    END IF;
    IF OLD."gender" IS NOT NULL AND NEW."gender" IS DISTINCT FROM OLD."gender" THEN
      RAISE EXCEPTION 'Gender is immutable and cannot be updated.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trigger_check_immutable_profile_fields ON "MemberProfile";
CREATE TRIGGER trigger_check_immutable_profile_fields
  BEFORE UPDATE ON "MemberProfile"
  FOR EACH ROW
  EXECUTE FUNCTION check_immutable_profile_fields();

-- ----------------------------------------------------------------------------
-- 5. MEMBER INTEREST POLICIES (Section 4.5)
-- ----------------------------------------------------------------------------
-- Members can only see interests where they are sender or receiver
DROP POLICY IF EXISTS "member_interest_select" ON "MemberInterest";
CREATE POLICY "member_interest_select" ON "MemberInterest"
  FOR SELECT
  TO authenticated
  USING (
    "senderProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
    OR
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- Members can only send interests from their own profile
DROP POLICY IF EXISTS "member_interest_insert" ON "MemberInterest";
CREATE POLICY "member_interest_insert" ON "MemberInterest"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "senderProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- Only receiver can update interest (to accept or reject)
DROP POLICY IF EXISTS "member_interest_update" ON "MemberInterest";
CREATE POLICY "member_interest_update" ON "MemberInterest"
  FOR UPDATE
  TO authenticated
  USING (
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  )
  WITH CHECK (
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 6. CONTACT REVEAL REQUEST POLICIES (Section 4.8)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "reveal_request_select" ON "ContactRevealRequest";
CREATE POLICY "reveal_request_select" ON "ContactRevealRequest"
  FOR SELECT
  TO authenticated
  USING (
    "senderProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
    OR
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "reveal_request_insert" ON "ContactRevealRequest";
CREATE POLICY "reveal_request_insert" ON "ContactRevealRequest"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "senderProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "reveal_request_update" ON "ContactRevealRequest";
CREATE POLICY "reveal_request_update" ON "ContactRevealRequest"
  FOR UPDATE
  TO authenticated
  USING (
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  )
  WITH CHECK (
    "receiverProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 7. SHORTLIST & BLOCKLIST POLICIES (Section 4.4)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "shortlist_owner_all" ON "MemberShortlist";
CREATE POLICY "shortlist_owner_all" ON "MemberShortlist"
  FOR ALL
  TO authenticated
  USING (
    "memberProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  )
  WITH CHECK (
    "memberProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "blocklist_owner_all" ON "MemberBlocklist";
CREATE POLICY "blocklist_owner_all" ON "MemberBlocklist"
  FOR ALL
  TO authenticated
  USING (
    "memberProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  )
  WITH CHECK (
    "memberProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 8. PROFILE VIEW LOG POLICIES (Section 4.7)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "view_log_select" ON "ProfileViewLog";
CREATE POLICY "view_log_select" ON "ProfileViewLog"
  FOR SELECT
  TO authenticated
  USING (
    "viewerProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
    OR
    "viewedProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

DROP POLICY IF EXISTS "view_log_insert" ON "ProfileViewLog";
CREATE POLICY "view_log_insert" ON "ProfileViewLog"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "viewerProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );

-- ----------------------------------------------------------------------------
-- 9. PACKAGE MASTER & INVOICE POLICIES (Section 4.10)
-- ----------------------------------------------------------------------------
-- Packages are readable by everyone (active packages)
DROP POLICY IF EXISTS "package_master_select_all" ON "PackageMaster";
CREATE POLICY "package_master_select_all" ON "PackageMaster"
  FOR SELECT
  TO authenticated, anon
  USING ( "isActive" = true );

-- Invoices can only be viewed by the member who owns them
DROP POLICY IF EXISTS "member_invoice_select_own" ON "MemberInvoice";
CREATE POLICY "member_invoice_select_own" ON "MemberInvoice"
  FOR SELECT
  TO authenticated
  USING (
    "memberProfileId" IN (SELECT id FROM "MemberProfile" WHERE "userId" = (select auth.uid())::text)
  );
