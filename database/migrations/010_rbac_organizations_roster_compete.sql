-- ============================================================================
-- Migration 010: Role-Based Access Control, Organizations, Roster & Compete
-- Supporting SUPER_ADMIN, COLLEGE_ADMIN, and STUDENT with Organization Scoping
-- ============================================================================

-- ── 1. Role Constraints Extension ───────────────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('user', 'admin', 'moderator', 'super_admin', 'college_admin', 'student'));

-- ── 2. Organizations / Colleges ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE,
    domain VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);

-- ── 3. Organization Memberships ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('college_admin', 'faculty', 'student')),
    department VARCHAR(100),
    academic_year VARCHAR(50),
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive', 'graduated', 'suspended')),
    student_id_number VARCHAR(100),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_dept ON organization_members(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_org_members_year ON organization_members(organization_id, academic_year);

-- ── 4. Student Rosters (Imported Eligibility Records) ────────────────────────
CREATE TABLE IF NOT EXISTS student_rosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    student_id_number VARCHAR(100) NOT NULL,
    college_email VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    academic_year VARCHAR(50),
    enrollment_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'inactive', 'graduated', 'suspended')),
    matched_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_roster_org_student_id UNIQUE (organization_id, student_id_number),
    CONSTRAINT uq_roster_org_email UNIQUE (organization_id, college_email)
);

CREATE INDEX IF NOT EXISTS idx_student_rosters_org ON student_rosters(organization_id);
CREATE INDEX IF NOT EXISTS idx_student_rosters_email ON student_rosters(college_email);
CREATE INDEX IF NOT EXISTS idx_student_rosters_dept ON student_rosters(organization_id, department);
CREATE INDEX IF NOT EXISTS idx_student_rosters_year ON student_rosters(organization_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_rosters_matched_user ON student_rosters(matched_user_id);

-- ── 5. Roster Imports Log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roster_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    imported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(20) NOT NULL CHECK (file_format IN ('xlsx', 'csv')),
    total_rows INTEGER DEFAULT 0,
    valid_new INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    unchanged_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    invalid_count INTEGER DEFAULT 0,
    deactivated_count INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('preview', 'completed', 'failed', 'partial')),
    validation_errors JSONB DEFAULT '[]'::jsonb,
    column_mapping JSONB DEFAULT '{}'::jsonb,
    deactivation_policy VARCHAR(50) DEFAULT 'deactivate_missing' CHECK (deactivation_policy IN ('deactivate_missing', 'keep_active', 'none')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_imports_org ON roster_imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_roster_imports_created ON roster_imports(created_at DESC);

-- ── 6. Assessments Organization & Audience Extension ─────────────────────────
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS target_audience VARCHAR(100) DEFAULT 'organization' CHECK (target_audience IN ('public', 'organization', 'assigned_only'));

CREATE INDEX IF NOT EXISTS idx_assessments_org ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_public ON assessments(is_public);

-- ── 7. Assessment Assignments (Cohorts / Target Audience) ────────────────────
CREATE TABLE IF NOT EXISTS assessment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assignment_type VARCHAR(50) NOT NULL DEFAULT 'all_organization' CHECK (assignment_type IN ('all_organization', 'departments', 'academic_years', 'specific_students', 'rule_based')),
    target_departments JSONB DEFAULT '[]'::jsonb,
    target_academic_years JSONB DEFAULT '[]'::jsonb,
    target_student_ids JSONB DEFAULT '[]'::jsonb,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    max_attempts_override INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment ON assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_org ON assessment_assignments(organization_id);

-- ── 8. Dedicated Administrative Audit Logs ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON admin_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

-- ── 9. Assessment Export Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_export_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    exported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(10) NOT NULL CHECK (format IN ('xlsx', 'csv')),
    filters JSONB DEFAULT '{}'::jsonb,
    records_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_org ON assessment_export_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_assessment ON assessment_export_logs(assessment_id);

-- ── 10. Triggers for updated_at ──────────────────────────────────────────────
DO $$ BEGIN
    CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_student_rosters_updated_at BEFORE UPDATE ON student_rosters
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_assessment_assignments_updated_at BEFORE UPDATE ON assessment_assignments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
