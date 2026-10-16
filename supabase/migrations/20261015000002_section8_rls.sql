-- ==============================================================================
-- SECTION 8: BRANCH MANAGER DASHBOARD, ATTENDANCE & LEAVES - RLS POLICIES
-- ==============================================================================

-- 1. Enable RLS on Section 8 tables
ALTER TABLE "StaffAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffLeaveApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AlertNotificationLog" ENABLE ROW LEVEL SECURITY;

-- 2. StaffAttendance Policies
DROP POLICY IF EXISTS "branch_attendance_select" ON "StaffAttendance";
CREATE POLICY "branch_attendance_select"
  ON "StaffAttendance"
  FOR SELECT
  USING (
    "staffId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'BRANCH_MANAGER' AND u."organizationId" = "StaffAttendance"."branchOrgId")
      )
    )
  );

DROP POLICY IF EXISTS "branch_attendance_insert" ON "StaffAttendance";
CREATE POLICY "branch_attendance_insert"
  ON "StaffAttendance"
  FOR INSERT
  WITH CHECK (
    "staffId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'BRANCH_MANAGER' AND u."organizationId" = "StaffAttendance"."branchOrgId")
      )
    )
  );

DROP POLICY IF EXISTS "branch_attendance_update" ON "StaffAttendance";
CREATE POLICY "branch_attendance_update"
  ON "StaffAttendance"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'BRANCH_MANAGER' AND u."organizationId" = "StaffAttendance"."branchOrgId")
      )
    )
  );

-- 3. StaffLeaveApplication Policies
DROP POLICY IF EXISTS "staff_leave_select" ON "StaffLeaveApplication";
CREATE POLICY "staff_leave_select"
  ON "StaffLeaveApplication"
  FOR SELECT
  USING (
    "staffId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'BRANCH_MANAGER' AND u."organizationId" = "StaffLeaveApplication"."branchOrgId")
      )
    )
  );

DROP POLICY IF EXISTS "staff_leave_insert" ON "StaffLeaveApplication";
CREATE POLICY "staff_leave_insert"
  ON "StaffLeaveApplication"
  FOR INSERT
  WITH CHECK (
    "staffId" = auth.uid()::text
  );

DROP POLICY IF EXISTS "staff_leave_review" ON "StaffLeaveApplication";
CREATE POLICY "staff_leave_review"
  ON "StaffLeaveApplication"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND (
        u.role IN ('SUPER_ADMIN', 'ADMIN')
        OR (u.role = 'BRANCH_MANAGER' AND u."organizationId" = "StaffLeaveApplication"."branchOrgId")
      )
    )
  );

-- 4. AlertNotificationLog Policies
DROP POLICY IF EXISTS "alert_notification_select" ON "AlertNotificationLog";
CREATE POLICY "alert_notification_select"
  ON "AlertNotificationLog"
  FOR SELECT
  USING (
    "recipientId" = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM "User" u
      WHERE u.id = auth.uid()::text
      AND u.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER')
    )
  );
