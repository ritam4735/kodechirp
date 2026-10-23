-- ============================================================================
-- Migration 011: College Self-Registration, Approval Lifecycle & Assessment Integrity
-- ============================================================================

-- ── 1. College Registration Applications Table ─────────────────────────────
CREATE TABLE IF NOT EXISTS college_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    college_name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL DEFAULT 'University',
    website VARCHAR(255),
    domain VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    verification_info JSONB DEFAULT '{}'::jsonb,
    
    -- Applicant / Admin Candidate fields
    applicant_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL,
    applicant_designation VARCHAR(100) NOT NULL DEFAULT 'College Administrator',
    applicant_phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    
    -- Verification and Lifecycle
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token_hash VARCHAR(255),
    verification_expires_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Associated Organization and User once approved
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_college_app_status ON college_applications(status);
CREATE INDEX IF NOT EXISTS idx_college_app_applicant_email ON college_applications(applicant_email);
CREATE INDEX IF NOT EXISTS idx_college_app_college_name ON college_applications(college_name);
CREATE INDEX IF NOT EXISTS idx_college_app_domain ON college_applications(domain);
CREATE INDEX IF NOT EXISTS idx_college_app_created ON college_applications(created_at DESC);

-- Trigger for updated_at
DO $$ BEGIN
    CREATE TRIGGER update_college_applications_updated_at BEFORE UPDATE ON college_applications
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
