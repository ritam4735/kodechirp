-- Migration 008: Remove CLASS and CUSTOM judge modes
-- These modes were never implemented in the execution backend.

-- Migrate any existing problems using removed modes to FUNCTION
UPDATE problems SET judge_mode = 'FUNCTION' WHERE judge_mode IN ('CLASS', 'CUSTOM');

-- Replace the CHECK constraint
ALTER TABLE problems DROP CONSTRAINT IF EXISTS problems_judge_mode_check;
ALTER TABLE problems ADD CONSTRAINT problems_judge_mode_check
  CHECK (judge_mode IN ('STDIN_STDOUT', 'FUNCTION'));
