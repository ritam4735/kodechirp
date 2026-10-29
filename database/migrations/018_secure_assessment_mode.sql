-- ============================================================================
-- Migration 018: Secure Full-Screen Assessment Mode & Violation Audit Trail
-- ============================================================================

-- 1. Add security policy configuration to assessments
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS is_secure_mode BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS security_policy JSONB DEFAULT '{
        "require_fullscreen": true,
        "prevent_tab_switch": true,
        "prevent_clipboard": true,
        "prevent_navigation": true,
        "auto_submit_on_violation": true
    }'::jsonb;

CREATE INDEX IF NOT EXISTS idx_assessments_secure_mode ON assessments(is_secure_mode);

-- 2. Add violation tracking and submission metadata to assessment_attempts
ALTER TABLE assessment_attempts
    ADD COLUMN IF NOT EXISTS submission_reason VARCHAR(50) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS is_terminated_by_violation BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS terminated_reason TEXT,
    ADD COLUMN IF NOT EXISTS violations JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_submission_reason ON assessment_attempts(submission_reason);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_violation ON assessment_attempts(is_terminated_by_violation);

-- 3. Create dedicated assessment_violation_logs table for granular audit trail
CREATE TABLE IF NOT EXISTS assessment_violation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violation_logs_attempt ON assessment_violation_logs(attempt_id);
CREATE INDEX IF NOT EXISTS idx_violation_logs_assessment ON assessment_violation_logs(assessment_id);
CREATE INDEX IF NOT EXISTS idx_violation_logs_user ON assessment_violation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_violation_logs_type ON assessment_violation_logs(event_type);
