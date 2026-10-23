-- ============================================================================
-- Migration 012: Add applicant_username to college_applications
-- ============================================================================

ALTER TABLE college_applications ADD COLUMN IF NOT EXISTS applicant_username VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_college_app_applicant_username ON college_applications(applicant_username);

-- Backfill existing applications with username derived from applicant email
UPDATE college_applications 
SET applicant_username = split_part(applicant_email, '@', 1) 
WHERE applicant_username IS NULL;
