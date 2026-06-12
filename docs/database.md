# 🗄 Database Design

> Full schema definitions, relationships, constraints, index strategy, and migration patterns.

[← Back to README](../README.md)

---

## Overview

KodeChirp uses a **13-table PostgreSQL 16 schema** with:

- **UUID primary keys** via `pgcrypto` extension
- **JSONB columns** for flexible metadata (tags, signatures, test case I/O)
- **GIN indexes** on JSONB columns for efficient querying
- **Auto-triggers** for `updated_at` timestamps
- **CHECK constraints** for enum-like fields

![KodeChirp Database Schema](./assets/db-schema.png)

---

## Entity Relationship Diagram

```
users ──────────────────┬── refresh_tokens
  │                     ├── problems (created_by)
  │                     ├── submissions
  │                     ├── chirps
  │                     ├── chirp_upvotes
  │                     ├── contests (created_by)
  │                     └── contest_participants

problems ───────────────┬── reference_solutions  ◄── problems.reference_solution_id
  │                     ├── problem_templates (per language)
  │                     ├── test_cases
  │                     ├── submissions
  │                     ├── chirps
  │                     └── contest_problems

submissions ────────────└── execution_metrics (per test case)
```

---

## Table Definitions

### `users` — Platform Accounts with RBAC

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    github_url VARCHAR(255),
    linkedin_url VARCHAR(255),
    website_url VARCHAR(255),
    preferences_json JSONB DEFAULT '{}'::jsonb,
    rating INTEGER DEFAULT 1200,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    verification_token_hash VARCHAR(255),
    verification_expires_at TIMESTAMPTZ,
    password_reset_token_hash VARCHAR(255),
    password_reset_expires_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key design decisions:**
- `rating` starts at 1200 (ELO-based) for contest scoring
- `preferences_json` stores UI preferences (theme, language defaults)
- Password reset uses hashed tokens with expiry for security

---

### `refresh_tokens` — JWT Token Rotation

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    family_id UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

**Key design decisions:**
- `family_id` groups tokens for **rotation detection** — if a revoked token is reused, the entire family is revoked (compromise detection)
- Tokens are stored as hashes, never plaintext

---

### `problems` — Problem Definitions with Pipeline Metadata

```sql
CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'Medium'
        CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    time_limit_ms INTEGER DEFAULT 2000,
    memory_limit_mb INTEGER DEFAULT 256,
    acceptance_rate REAL DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_accepted INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Review', 'Published', 'Archived',
                          'Imported', 'Parsed', 'AI_Normalized',
                          'Review_Required', 'Ready')),
    source VARCHAR(50) DEFAULT 'kodechirp',
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Normalization pipeline fields
    raw_statement TEXT,
    description_md TEXT,
    examples_json JSONB,
    constraints_json JSONB,
    notes_json JSONB,
    parser_confidence NUMERIC,
    ai_quality_flags JSONB,
    generated_constraints JSONB,
    constraint_source VARCHAR(20),
    review_status VARCHAR(50) DEFAULT 'imported',
    reference_solution_id UUID,     -- FK to reference_solutions
    judge_mode VARCHAR(20) DEFAULT 'STDIN_STDOUT'
        CHECK (judge_mode IN ('STDIN_STDOUT', 'FUNCTION', 'CLASS', 'CUSTOM')),
    signature_metadata JSONB,       -- function signature for wrapper generation
    execution_version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key design decisions:**
- `judge_mode` determines how the worker executes code (see [Execution Pipeline](./execution-pipeline.md))
- `signature_metadata` JSONB stores function name, parameter types, and return type for FUNCTION-mode wrapper generation
- `reference_solution_id` is a deferred FK (table created after `reference_solutions`)
- `status` includes normalization pipeline states for imported problems

---

### `reference_solutions` — Source-of-Truth Solutions

```sql
CREATE TABLE reference_solutions (
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
```

---

### `problem_templates` — Per-Language Starter Code

```sql
CREATE TABLE problem_templates (
    problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
    language VARCHAR(20) NOT NULL,
    starter_code TEXT,
    hidden_wrapper TEXT,
    PRIMARY KEY (problem_id, language)
);
```

**Key design decisions:**
- Composite PK ensures one template per problem per language
- `hidden_wrapper` stores the auto-generated wrapper code for FUNCTION mode

---

### `test_cases` — Dual-Format Test Data

```sql
CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    input_json JSONB,           -- structured input for FUNCTION mode
    expected_json JSONB,        -- structured output for FUNCTION mode
    is_sample BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    order_index INTEGER DEFAULT 0,
    category VARCHAR(50),
    generated_by VARCHAR(50),
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_test_cases_problem ON test_cases(problem_id);
CREATE INDEX idx_test_cases_input_json ON test_cases USING GIN (input_json);
CREATE INDEX idx_test_cases_expected_json ON test_cases USING GIN (expected_json);
```

**Key design decisions:**
- Dual storage: `input`/`expected_output` (TEXT) for STDIN mode, `input_json`/`expected_json` (JSONB) for FUNCTION mode
- GIN indexes on JSONB for efficient querying of structured test data
- `is_sample` distinguishes user-visible examples from hidden test cases

---

### `submissions` — Full Execution Audit Record

```sql
CREATE TABLE submissions (
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
    problem_version INTEGER NOT NULL DEFAULT 1,
    judge_mode VARCHAR(20),
    signature_snapshot JSONB,       -- snapshot at submission time
    template_snapshot JSONB,        -- snapshot at submission time
    queued_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_problem ON submissions(problem_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_queue ON submissions(queue_id);
CREATE INDEX idx_submissions_created ON submissions(created_at DESC);
```

**Key design decisions:**
- `signature_snapshot` and `template_snapshot` freeze the problem's execution config at submission time — prevents retroactive invalidation when problems are updated
- `failed_test_*` fields store the first failing test case for user feedback
- Comprehensive timing fields (`queued_at`, `started_at`, `completed_at`) for pipeline observability

---

### `execution_metrics` — Per-Test-Case Metrics

```sql
CREATE TABLE execution_metrics (
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
```

---

### `chirps` — Peer Explanations

```sql
CREATE TABLE chirps (
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

CREATE INDEX idx_chirps_problem ON chirps(problem_id);
CREATE INDEX idx_chirps_upvotes ON chirps(upvote_count DESC);
```

### `chirp_upvotes` — Upvote Junction Table

```sql
CREATE TABLE chirp_upvotes (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chirp_id UUID REFERENCES chirps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, chirp_id)
);
```

---

### `contests` — Competition Events

```sql
CREATE TABLE contests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_rated BOOLEAN DEFAULT TRUE,
    max_participants INTEGER,
    status VARCHAR(20) DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'active', 'ended')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `contest_problems` — Contest-Problem Junction

```sql
CREATE TABLE contest_problems (
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    points INTEGER DEFAULT 100,
    PRIMARY KEY (contest_id, problem_id)
);
```

### `contest_participants` — Competition Enrollment

```sql
CREATE TABLE contest_participants (
    contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    penalty_time INTEGER DEFAULT 0,
    rank INTEGER,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (contest_id, user_id)
);

CREATE INDEX idx_contest_participants_score
    ON contest_participants(contest_id, score DESC, penalty_time ASC);
```

---

### `rate_limit_violations` — Audit Log

```sql
CREATE TABLE rate_limit_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    endpoint VARCHAR(255),
    violation_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Index Strategy

| Table | Index | Type | Purpose |
| :--- | :--- | :--- | :--- |
| `refresh_tokens` | `user_id`, `family_id`, `expires_at` | B-tree | Token lookup, family revocation, cleanup |
| `problems` | `review_status`, `parser_confidence` | B-tree | Normalization pipeline queries |
| `test_cases` | `problem_id` | B-tree | Test case retrieval per problem |
| `test_cases` | `input_json`, `expected_json` | GIN | JSONB containment queries |
| `submissions` | `user_id`, `problem_id`, `status`, `created_at` | B-tree | User history, problem stats, status filtering |
| `chirps` | `problem_id`, `upvote_count DESC` | B-tree | Problem chirps, top-voted sorting |
| `contest_participants` | `(contest_id, score DESC, penalty_time ASC)` | B-tree | Leaderboard queries |

---

## Auto-Triggers

All mutable tables have `updated_at` auto-triggers:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

Applied to: `users`, `problems`, `chirps`, `contests`, `reference_solutions`

---

## Schema File Location

The production schema is defined in [`database/schema.sql`](../database/schema.sql) and auto-applied via Docker Compose's init script.

---

[← Execution Pipeline](./execution-pipeline.md) · [Security Design →](./security.md)
