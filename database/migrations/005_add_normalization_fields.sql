-- ============================================================================
-- Migration 005: Add Problem Normalization Pipeline Fields
-- ============================================================================
-- Adds structured fields for parsed problem data, parser confidence,
-- AI quality flags, and review workflow status.
-- Original raw text is preserved via raw_statement column.
-- ============================================================================

-- ── New columns for normalization pipeline ──────────────────────────────────

-- Preserve original imported text (source of truth)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS raw_statement TEXT;

-- Parsed/normalized structured fields
ALTER TABLE problems ADD COLUMN IF NOT EXISTS description_md TEXT;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS examples_json JSONB;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS constraints_json JSONB;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS notes_json JSONB;

-- Parser confidence score (0.0 – 1.0)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS parser_confidence NUMERIC;

-- AI quality flags (missing_constraints, malformed_examples, etc.)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS ai_quality_flags JSONB;

-- AI-generated constraints (stored separately, never auto-published)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS generated_constraints JSONB;

-- Source of constraints: 'parsed' or 'ai_generated'
ALTER TABLE problems ADD COLUMN IF NOT EXISTS constraint_source VARCHAR(20);

-- Normalization pipeline review status
ALTER TABLE problems ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'imported';
ALTER TABLE problems ALTER COLUMN review_status SET DEFAULT 'imported';

-- ── Expand status CHECK to include new pipeline states ──────────────────────

-- Drop existing CHECK constraint and recreate with new values
ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_status_check;
ALTER TABLE problems ADD CONSTRAINT problems_status_check
  CHECK (status IN ('Draft', 'Review', 'Published', 'Archived', 'Imported', 'Parsed', 'AI_Normalized', 'Review_Required', 'Ready'));

-- ── Index for review queue queries ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_problems_review_status ON problems(review_status);
CREATE INDEX IF NOT EXISTS idx_problems_parser_confidence ON problems(parser_confidence);

-- Backfill existing unreviewed rows into the imported queue.
UPDATE problems
SET review_status = 'imported'
WHERE review_status IS NULL OR review_status = 'pending';
