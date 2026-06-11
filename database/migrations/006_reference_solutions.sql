-- ============================================================================
-- Migration 006: Reference Solutions & Test Generation
-- ============================================================================
-- Adds reference_solutions table, extends test_cases with generation metadata,
-- and adds reference_solution_id FK to problems.
-- ============================================================================

-- ── Reference Solutions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reference_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(20) NOT NULL,
    source_code TEXT NOT NULL,
    compile_status VARCHAR(50) DEFAULT 'pending',
    verification_result JSONB,
    last_verified_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_solutions_problem ON reference_solutions(problem_id);

-- ── Link problem → reference solution ───────────────────────────────────────

ALTER TABLE problems ADD COLUMN IF NOT EXISTS reference_solution_id UUID
    REFERENCES reference_solutions(id) ON DELETE SET NULL;

-- ── Extend test_cases with generation metadata ─────────────────────────────

ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS generated_by VARCHAR(50);
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT TRUE;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── Updated at trigger for reference solutions ─────────────────────────────

DO $$ BEGIN
    CREATE TRIGGER update_ref_solutions_updated_at BEFORE UPDATE ON reference_solutions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
