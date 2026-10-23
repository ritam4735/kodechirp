-- 007_v3_architecture_foundation.sql

-- 1. Updates to problems table
ALTER TABLE problems 
ADD COLUMN IF NOT EXISTS judge_mode VARCHAR(20) DEFAULT 'STDIN_STDOUT' CHECK (judge_mode IN ('STDIN_STDOUT', 'FUNCTION', 'CLASS', 'CUSTOM')),
ADD COLUMN IF NOT EXISTS signature_metadata JSONB,
ADD COLUMN IF NOT EXISTS execution_version INTEGER DEFAULT 1;

-- 2. New table: problem_templates
CREATE TABLE IF NOT EXISTS problem_templates (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(20) NOT NULL,
    starter_code TEXT,
    hidden_wrapper TEXT,
    PRIMARY KEY (problem_id, language)
);

-- 3. Updates to test_cases table
ALTER TABLE test_cases
ADD COLUMN IF NOT EXISTS input_json JSONB,
ADD COLUMN IF NOT EXISTS expected_json JSONB;

CREATE INDEX IF NOT EXISTS idx_test_cases_input_json ON test_cases USING GIN (input_json);
CREATE INDEX IF NOT EXISTS idx_test_cases_expected_json ON test_cases USING GIN (expected_json);

-- 4. Updates to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS problem_version INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS judge_mode VARCHAR(20),
ADD COLUMN IF NOT EXISTS signature_snapshot JSONB,
ADD COLUMN IF NOT EXISTS template_snapshot JSONB;
