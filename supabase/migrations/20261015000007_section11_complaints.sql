-- ====================================================================
-- SECTION 11.4: INTERNAL COMPLAINTS MODULE MIGRATION & RLS POLICIES
-- ====================================================================

-- 1. Enable RLS on InternalComplaint table
ALTER TABLE "InternalComplaint" ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy policies if present
DROP POLICY IF EXISTS "Complaints admin access only" ON "InternalComplaint";
DROP POLICY IF EXISTS "Complaints full admin manage" ON "InternalComplaint";

-- 3. Policy: Strictly Admin/Super Admin only
-- Denies access to members, ordinary staff, agents, and public
CREATE POLICY "Complaints full admin manage"
ON "InternalComplaint"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "User" u
    WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
  )
);
