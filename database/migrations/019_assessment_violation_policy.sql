-- ============================================================================
-- Migration 019: Configurable Violation Policy & Max Violations Limit
-- ============================================================================

-- Ensure security_policy default in assessments includes max_violations
ALTER TABLE assessments
    ALTER COLUMN security_policy SET DEFAULT '{
        "require_fullscreen": true,
        "prevent_tab_switch": true,
        "prevent_clipboard": true,
        "prevent_navigation": true,
        "auto_submit_on_violation": true,
        "max_violations": 1
    }'::jsonb;

-- Backfill existing assessments that have security_policy without max_violations
UPDATE assessments
SET security_policy = security_policy || '{"max_violations": 1}'::jsonb
WHERE security_policy IS NOT NULL AND NOT (security_policy ? 'max_violations');
