-- ==============================================================================
-- SECTION 7: REPORTS & ANALYTICS - ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. Enable RLS on newly introduced tables
ALTER TABLE "StaffProfileVisit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffMessageLog" ENABLE ROW LEVEL SECURITY;

-- 2. StaffProfileVisit Policies
DROP POLICY IF EXISTS "HQ Admins can view all staff visits" ON "StaffProfileVisit";
CREATE POLICY "HQ Admins can view all staff visits"
  ON "StaffProfileVisit"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Staff can insert their own visits" ON "StaffProfileVisit";
CREATE POLICY "Staff can insert their own visits"
  ON "StaffProfileVisit"
  FOR INSERT
  WITH CHECK (
    "staffId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff can view their own visits" ON "StaffProfileVisit";
CREATE POLICY "Staff can view their own visits"
  ON "StaffProfileVisit"
  FOR SELECT
  USING (
    "staffId" = auth.uid()::text
  );

-- 3. StaffMessageLog Policies
DROP POLICY IF EXISTS "HQ Admins can view all staff messages" ON "StaffMessageLog";
CREATE POLICY "HQ Admins can view all staff messages"
  ON "StaffMessageLog"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

DROP POLICY IF EXISTS "Staff can view their own messages" ON "StaffMessageLog";
CREATE POLICY "Staff can view their own messages"
  ON "StaffMessageLog"
  FOR SELECT
  USING (
    "staffId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff can record their messages" ON "StaffMessageLog";
CREATE POLICY "Staff can record their messages"
  ON "StaffMessageLog"
  FOR INSERT
  WITH CHECK (
    "staffId" = auth.uid()::text
  );
