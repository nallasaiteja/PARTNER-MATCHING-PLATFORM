-- ==============================================================================
-- SECTION 11.1: SUCCESS STORIES SCHEMA & RLS POLICIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS "SuccessStory" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "partner1MemberId" TEXT NOT NULL,
    "partner2MemberId" TEXT NOT NULL,
    "partner1ProfileId" TEXT,
    "partner2ProfileId" TEXT,
    "partner1Name" TEXT,
    "partner2Name" TEXT,
    "title" TEXT,
    "story" TEXT,
    "engagementDate" TIMESTAMP(3),
    "marriageDate" TIMESTAMP(3) NOT NULL,
    "couplePhotos" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "youtubeVideoUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SuccessStory_isPublished_idx" ON "SuccessStory"("isPublished");
CREATE INDEX IF NOT EXISTS "SuccessStory_marriageDate_idx" ON "SuccessStory"("marriageDate");
CREATE INDEX IF NOT EXISTS "SuccessStory_partner1MemberId_idx" ON "SuccessStory"("partner1MemberId");
CREATE INDEX IF NOT EXISTS "SuccessStory_partner2MemberId_idx" ON "SuccessStory"("partner2MemberId");
CREATE INDEX IF NOT EXISTS "SuccessStory_createdAt_idx" ON "SuccessStory"("createdAt");

-- Enable Row Level Security
ALTER TABLE "SuccessStory" ENABLE ROW LEVEL SECURITY;

-- 1. Public can read published success stories
DROP POLICY IF EXISTS "Public can view published success stories" ON "SuccessStory";
CREATE POLICY "Public can view published success stories" ON "SuccessStory"
    FOR SELECT
    USING ("isPublished" = true);

-- 2. Staff / Admin can view all success stories (including drafts)
DROP POLICY IF EXISTS "Staff and Admin can view all success stories" ON "SuccessStory";
CREATE POLICY "Staff and Admin can view all success stories" ON "SuccessStory"
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN', 'HQ_SERVICE_TEAM')
    );

-- 3. Only Admins can insert, update, or delete success stories
DROP POLICY IF EXISTS "Admins can manage success stories" ON "SuccessStory";
CREATE POLICY "Admins can manage success stories" ON "SuccessStory"
    FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'ADMIN')
    );
