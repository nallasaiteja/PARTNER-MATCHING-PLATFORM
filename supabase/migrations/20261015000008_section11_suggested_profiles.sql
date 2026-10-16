-- ====================================================================
-- SECTION 11.5: SUGGESTED PROFILES MODULE MIGRATION & RLS POLICIES
-- ====================================================================

-- 1. Enable RLS on ProfileSuggestion table
ALTER TABLE "ProfileSuggestion" ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy policies if present
DROP POLICY IF EXISTS "Staff manage suggestions" ON "ProfileSuggestion";
DROP POLICY IF EXISTS "Members view own suggestions" ON "ProfileSuggestion";
DROP POLICY IF EXISTS "Members update own suggestion status" ON "ProfileSuggestion";

-- 3. Policy: Staff and Admins can create and view suggestions
CREATE POLICY "Staff manage suggestions"
ON "ProfileSuggestion"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'HQ_SERVICE_TEAM')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'HQ_SERVICE_TEAM')
  )
);

-- 4. Policy: Receiving members can SELECT suggestions directed to them
CREATE POLICY "Members view own suggestions"
ON "ProfileSuggestion"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "MemberProfile" mp
    WHERE mp.id = "ProfileSuggestion"."receivingMemberProfileId"
      AND mp."userId" = auth.uid()::text
  )
);

-- 5. Policy: Receiving members can update status (VIEWED, INTERESTED, DECLINED)
CREATE POLICY "Members update own suggestion status"
ON "ProfileSuggestion"
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "MemberProfile" mp
    WHERE mp.id = "ProfileSuggestion"."receivingMemberProfileId"
      AND mp."userId" = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "MemberProfile" mp
    WHERE mp.id = "ProfileSuggestion"."receivingMemberProfileId"
      AND mp."userId" = auth.uid()::text
  )
);
