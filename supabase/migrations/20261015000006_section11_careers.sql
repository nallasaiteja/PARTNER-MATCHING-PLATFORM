-- ==============================================================================
-- SECTION 11.2: CAREERS MODULE SCHEMA & RLS POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "CareerApplication" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "applicationNumber" TEXT NOT NULL UNIQUE,
    "mobile" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "maritalStatus" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "religion" TEXT NOT NULL,
    "caste" TEXT NOT NULL,

    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "mandal" TEXT NOT NULL,
    "temporaryAddress" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,

    "idProofType" TEXT NOT NULL,
    "idProofNumber" TEXT NOT NULL UNIQUE,
    "idProofUrl" TEXT NOT NULL,
    "panCardUrl" TEXT NOT NULL,

    "educationDetails" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "experienceYears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fatherName" TEXT,
    "fatherProfession" TEXT,
    "motherName" TEXT,
    "motherProfession" TEXT,

    "referenceName" TEXT,
    "referenceMobile" TEXT,
    "referenceAddress" TEXT,

    "photos" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "timeTakenSeconds" INTEGER NOT NULL DEFAULT 0,

    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,

    "registeredStaffId" TEXT,
    "registeredAt" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CareerOtpVerification" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "mobile" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "CareerApplication_mobile_idx" ON "CareerApplication"("mobile");
CREATE INDEX IF NOT EXISTS "CareerApplication_status_idx" ON "CareerApplication"("status");
CREATE INDEX IF NOT EXISTS "CareerApplication_idProofNumber_idx" ON "CareerApplication"("idProofNumber");
CREATE INDEX IF NOT EXISTS "CareerApplication_createdAt_idx" ON "CareerApplication"("createdAt");
CREATE INDEX IF NOT EXISTS "CareerOtpVerification_mobile_isVerified_idx" ON "CareerOtpVerification"("mobile", "isVerified");

-- Enable Row Level Security
ALTER TABLE "CareerApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CareerOtpVerification" ENABLE ROW LEVEL SECURITY;

-- 1. Public can insert new applications
DROP POLICY IF EXISTS "Public can submit career application" ON "CareerApplication";
CREATE POLICY "Public can submit career application" ON "CareerApplication"
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 2. Only Admins can view career applications
DROP POLICY IF EXISTS "Admins can view career applications" ON "CareerApplication";
CREATE POLICY "Admins can view career applications" ON "CareerApplication"
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    );

-- 3. Only Admins can update/manage career applications
DROP POLICY IF EXISTS "Admins can manage career applications" ON "CareerApplication";
CREATE POLICY "Admins can manage career applications" ON "CareerApplication"
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    );
