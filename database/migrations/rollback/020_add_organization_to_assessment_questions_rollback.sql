-- ─────────────────────────────────────────────────────────────────────────────
-- Rollback Migration: 020_add_organization_to_assessment_questions_rollback.sql
-- Description: Reverts migration 020 by dropping index and organization_id column.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

DROP INDEX IF EXISTS idx_assessment_questions_org;
ALTER TABLE assessment_questions DROP COLUMN IF EXISTS organization_id;

COMMIT;
