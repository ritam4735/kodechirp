-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 020_add_organization_to_assessment_questions.sql
-- Description: Add organization_id column to assessment_questions to support
--              college-specific questions alongside global question bank.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE assessment_questions 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_questions_org 
    ON assessment_questions(organization_id);

COMMIT;
