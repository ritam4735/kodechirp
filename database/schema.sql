-- ============================================================================
-- KodeChirp — Production Database Schema
-- ============================================================================
-- Run: psql -U kodechirp -d kodechirp -f schema.sql
-- Or auto-applied via Docker Compose init script
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    avatar_url TEXT,
    bio TEXT,
    rating INTEGER DEFAULT 1200,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Refresh Tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    family_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ── Problems ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    time_limit_ms INTEGER DEFAULT 2000,
    memory_limit_mb INTEGER DEFAULT 256,
    acceptance_rate REAL DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Test Cases ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_test_cases_problem ON test_cases(problem_id);

-- ── Submissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    runtime_ms INTEGER,
    memory_kb INTEGER,
    test_cases_passed INTEGER DEFAULT 0,
    test_cases_total INTEGER DEFAULT 0,
    failed_test_input TEXT,
    failed_test_expected TEXT,
    failed_test_actual TEXT,
    error_message TEXT,
    queue_id VARCHAR(100),
    worker_id VARCHAR(100),
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_problem ON submissions(problem_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_queue ON submissions(queue_id);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(created_at DESC);

-- ── Execution Metrics (per test case) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    test_index INTEGER DEFAULT 0,
    runtime_ms INTEGER,
    memory_kb INTEGER,
    exit_code INTEGER,
    status VARCHAR(50),
    stdout_preview TEXT,
    stderr_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exec_metrics_submission ON execution_metrics(submission_id);

-- ── Chirps (Peer Explanations) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chirps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    code_snippet TEXT,
    approach_tag VARCHAR(50),
    upvote_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chirps_problem ON chirps(problem_id);
CREATE INDEX IF NOT EXISTS idx_chirps_upvotes ON chirps(upvote_count DESC);

-- ── Chirp Upvotes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chirp_upvotes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chirp_id UUID REFERENCES chirps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, chirp_id)
);

-- ── Contests ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_rated BOOLEAN DEFAULT TRUE,
    max_participants INTEGER,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contests_starts ON contests(starts_at);

-- ── Contest Problems ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_problems (
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    points INTEGER DEFAULT 100,
    PRIMARY KEY (contest_id, problem_id)
);

-- ── Contest Participants ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contest_participants (
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    penalty_time INTEGER DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (contest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contest_participants_score
    ON contest_participants(contest_id, score DESC, penalty_time ASC);

-- ── Rate Limit Violations (audit log) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    endpoint VARCHAR(255),
    violation_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Updated At Trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_chirps_updated_at BEFORE UPDATE ON chirps
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
