-- ============================================================================
-- Migration 009: Assessment Engine Foundation
-- Unified Question Bank, Multi-Section Assessments, Attempts & Grading
-- ============================================================================

-- ── 1. Import Batches Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    source_file VARCHAR(255) NOT NULL,
    file_format VARCHAR(50) NOT NULL,
    total_discovered INTEGER DEFAULT 0,
    total_inserted INTEGER DEFAULT 0,
    total_skipped INTEGER DEFAULT 0,
    total_updated INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed', 'dry_run')),
    error_report JSONB DEFAULT '[]'::jsonb,
    summary_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_batch_id ON import_batches(batch_id);

-- ── 2. Assessment Questions Bank ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    subtopic VARCHAR(100),
    difficulty VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    question_type VARCHAR(50) NOT NULL DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'true_false', 'passage', 'short_answer', 'descriptive')),
    question_text TEXT NOT NULL,
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer JSONB DEFAULT NULL,
    explanation TEXT,
    default_marks NUMERIC(6, 2) DEFAULT 1.00,
    default_negative_marks NUMERIC(6, 2) DEFAULT 0.00,
    tags JSONB DEFAULT '[]'::jsonb,
    source_file VARCHAR(255),
    import_batch VARCHAR(100),
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_category ON assessment_questions(category);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_topic ON assessment_questions(topic);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_difficulty ON assessment_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON assessment_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_active ON assessment_questions(is_active);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_hash ON assessment_questions(content_hash);

-- ── 3. Assessments ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    instructions TEXT,
    category VARCHAR(100) DEFAULT 'Placement',
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Archived')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    max_attempts INTEGER DEFAULT 1,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    default_negative_marking BOOLEAN DEFAULT TRUE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    show_answers_mode VARCHAR(30) DEFAULT 'after_submission' CHECK (show_answers_mode IN ('immediate', 'after_submission', 'after_assessment_end', 'never')),
    total_marks NUMERIC(8, 2) DEFAULT 0.00,
    pass_percentage NUMERIC(5, 2) DEFAULT 40.00,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_slug ON assessments(slug);
CREATE INDEX IF NOT EXISTS idx_assessments_created ON assessments(created_at DESC);

-- ── 4. Assessment Sections ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    section_order INTEGER NOT NULL DEFAULT 0,
    section_type VARCHAR(50) NOT NULL DEFAULT 'objective' CHECK (section_type IN ('objective', 'coding', 'mixed')),
    duration_minutes INTEGER,
    marks_per_question NUMERIC(6, 2) DEFAULT 1.00,
    negative_marks_per_question NUMERIC(6, 2) DEFAULT 0.00,
    selection_mode VARCHAR(30) DEFAULT 'manual' CHECK (selection_mode IN ('manual', 'random')),
    selection_rules JSONB DEFAULT '{}'::jsonb,
    total_questions INTEGER DEFAULT 0,
    total_marks NUMERIC(8, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment ON assessment_sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_order ON assessment_sections(assessment_id, section_order);

-- ── 5. Assessment Section Questions Mappings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_section_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    marks_override NUMERIC(6, 2) DEFAULT NULL,
    negative_marks_override NUMERIC(6, 2) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_question_or_problem CHECK (
        (question_id IS NOT NULL AND problem_id IS NULL) OR
        (question_id IS NULL AND problem_id IS NOT NULL)
    ),
    CONSTRAINT uq_section_question UNIQUE (section_id, question_id),
    CONSTRAINT uq_section_problem UNIQUE (section_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_asq_section ON assessment_section_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_asq_question ON assessment_section_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_asq_problem ON assessment_section_questions(problem_id);

-- ── 6. Assessment Attempts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'evaluated', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    total_score NUMERIC(8, 2) DEFAULT 0.00,
    max_marks NUMERIC(8, 2) DEFAULT 0.00,
    percentage NUMERIC(5, 2) DEFAULT 0.00,
    total_questions INTEGER DEFAULT 0,
    answered_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    incorrect_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    section_scores JSONB DEFAULT '[]'::jsonb,
    is_finalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status ON assessment_attempts(status);

-- ── 7. Assessment Responses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    selected_options JSONB DEFAULT NULL,
    text_response TEXT,
    code_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    is_flagged_for_review BOOLEAN DEFAULT FALSE,
    is_evaluated BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN DEFAULT NULL,
    score_awarded NUMERIC(6, 2) DEFAULT 0.00,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_resp_question_or_problem CHECK (
        (question_id IS NOT NULL AND problem_id IS NULL) OR
        (question_id IS NULL AND problem_id IS NOT NULL)
    ),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id),
    CONSTRAINT uq_attempt_problem UNIQUE (attempt_id, problem_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_attempt ON assessment_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_section ON assessment_responses(section_id);

-- ── 8. Triggers for updated_at ──────────────────────────────────────────────
DO $$ BEGIN
    CREATE TRIGGER update_assessment_questions_updated_at BEFORE UPDATE ON assessment_questions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_assessment_sections_updated_at BEFORE UPDATE ON assessment_sections
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_assessment_attempts_updated_at BEFORE UPDATE ON assessment_attempts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_assessment_responses_updated_at BEFORE UPDATE ON assessment_responses
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
