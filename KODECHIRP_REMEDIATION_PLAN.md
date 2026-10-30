# KodeChirp – Production Readiness Remediation Plan
**Target Release:** Pre-Testing Phase Technical Remediation  
**Status:** Comprehensive Blueprint (Updated with Security & Operational Requirements)  
**Author:** Security & Infrastructure Architecture Team  
**Date:** October 30, 2026  
**Reference Document:** `KODECHIRP_PRODUCTION_READINESS_AUDIT.md`  

---

## 1. Executive Summary & Scope

This remediation plan defines the exact implementation sequence, code adjustments, security mitigations, database migration controls, and operational verification procedures required to transition KodeChirp from its current state (**READY AFTER FIXES**) to a stable, secure platform ready for its initial testing phase (5–10 users, scaling to 25–50 users).

### Core Principles
- **No Rewrite:** Preserves existing architecture (Next.js frontend, Node.js API Gateway, Python worker, Redis BullMQ, Docker sandboxes).
- **Zero Regressions:** Preserves Monaco editor workflows, assessment authoring, student examination experience, and multi-tenant college features.
- **Evidence-Based:** Every finding has been re-examined and verified against active repository code.
- **Phase-by-Phase Discipline:** No premature multi-phase execution. Git checkpoints established before every phase.

---

## 2. Issue Re-Examination & Validation Matrix

Every finding from `KODECHIRP_PRODUCTION_READINESS_AUDIT.md` was re-verified against the active codebase.

| Audit ID | Issue Title | Severity | Re-Examination Result | Notes / Current Code State |
| :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | Unbalanced parenthesis in `schema.sql` | **Critical** | **Confirmed Active** | `database/schema.sql:21` has `VARCHAR(400)),`. User staged correction in buffer; must be finalized on disk and validated against fresh DB container. |
| **ISS-02** | Assessment grade tampering via arbitrary submission IDs | **Critical** | **Confirmed Active** | `gateway/src/controllers/assessmentStudentController.js:740-785` accepts any `code_submission_id`; lines `1196-1215` grade it without checking user or problem ownership. |
| **ISS-03** | Judging engine masks SIGSEGV/SIGABRT/MLE as Wrong Answer | **Critical** | **Confirmed Active** | `workers/src/worker/evaluator.py:142-225` pipes STDIN batch execution without `set -e`. Crashed processes still echo batch separator, causing 12 of 30 tests in `test_verdicts.py` to fail. |
| **ISS-04** | Email verification black hole prevents all user logins | **High** | **Confirmed Active** | `gateway/src/services/emailService.js:11-26` only implements `console` logger. `authService.js:83-90` blocks unverified users. No SMTP or testing bypass exists. |
| **ISS-05** | Docker socket proxy on shared container network | **Critical** | **Confirmed Active** | `docker-compose.yml:122-149` connects `docker-proxy` to `kodechirp-net` where `gateway` and `frontend` live. |
| **ISS-06** | Insecure CORS wildcard reflection with credentials | **Critical** | **Confirmed Active** | `gateway/src/server.js:56` returns `callback(null, true)` unconditionally with `credentials: true`. |
| **ISS-07** | Cross-tenant assessment deletion and hijacking | **High** | **Confirmed Active** | `gateway/src/controllers/assessmentAdminController.js:27` returns `true` for null org; line `684` permits deletion of global assessments by college admins. |
| **ISS-08** | Question bank lack of organization scoping | **High** | **Confirmed Active** | `database/migrations/009_assessment_engine.sql` table `assessment_questions` lacks `organization_id`. `assessmentQuestionController.js` allows any admin to modify/delete any question. |
| **ISS-09** | Unauthenticated monitoring endpoints exposing system events | **High** | **Confirmed Active** | `gateway/src/routes/monitoring.js:17-92` has zero authentication middleware. |
| **ISS-10** | Frontend container running in development mode | **High** | **Confirmed Active** | `frontend/Dockerfile:13` runs `CMD ["npm", "run", "dev"]` with live source bind mounts. |
| **ISS-11** | Gateway `codeRunner.js` fallback attempts to execute nonexistent Docker | **Medium** | **Confirmed Active** | `gateway/src/services/submissionService.js:233-234` calls `codeRunner.js:95` which runs `spawn('docker')` in a container lacking Docker CLI. |
| **ISS-12** | Container removal race condition in worker sandbox teardown | **Medium** | **Confirmed Active** | `workers/src/services/docker_service.py:250` starts container with `--rm`; line `493` explicitly executes `docker rm -f`, causing daemon race conditions on every run. |
| **ISS-13** | Database and Redis ports exposed publicly on host | **Medium** | **Confirmed Active** | `docker-compose.yml:19-20, 42-43` maps `5433:5432` and `6380:6379` to `0.0.0.0`. |
| **ISS-14** | Absence of automated database backup and restore tooling | **Medium** | **Confirmed Active** | `database/backups` is empty; `scripts/` contains no backup or restore utilities. |
| **ISS-15** | Insecure default passwords and secret fallbacks | **Medium** | **Confirmed Active** | `docker-compose.yml:12, 68-69` contains fallbacks (`kodechirp_dev`, `dev-jwt-secret...`). |
| **ISS-16** | Unit test failure in `problemNavigationAndSerial.test.js` | **Low** | **Confirmed Active** | Hardcoded port 5432 causes 17 tests to fail when Postgres is on host port 5433. |
| **ISS-17** | Worker test dependencies missing from container | **Low** | **Confirmed Active** | `workers/requirements.txt` lacks `pytest` and `pytest-asyncio`. |
| **ISS-18** | Lack of Migration Idempotency & Version Tracking | **High** | **Identified Gap** | `database/init-migrations.sh` and `scripts/init-db.sh` re-execute all SQL files on every run without recording applied versions, risking crashes or corruption. |

---

## 3. Prioritized Issue Classification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ P0: TESTING BLOCKERS (Must be resolved before ANY user touches the system)  │
│ ├── ISS-01: Fix syntax error in database/schema.sql                         │
│ ├── ISS-02: Enforce submission ownership and problem matching in scoring   │
│ ├── ISS-03: Add `set -e` / error detection in worker batch judge execution  │
│ ├── ISS-04: Add SMTP provider and optional verification bypass flag         │
│ └── ISS-18: Implement schema_migrations tracking in migration scripts       │
├─────────────────────────────────────────────────────────────────────────────┤
│ P1: MANDATORY PRE-DEPLOYMENT SECURITY (Must be resolved before server launch)│
│ ├── ISS-05: Isolate docker-proxy on private internal worker network         │
│ ├── ISS-06: Restrict CORS origin reflection in API Gateway                  │
│ ├── ISS-07: Restrict null-organization assessment mutation to Super Admins  │
│ ├── ISS-08: Add organization scoping migration to assessment_questions      │
│ ├── ISS-09: Protect all /monitoring routes with Super Admin authentication  │
│ └── ISS-10: Create multi-stage production Dockerfile for frontend           │
├─────────────────────────────────────────────────────────────────────────────┤
│ P2: DEPLOYMENT RELIABILITY & OPERATIONS (Operational stability)             │
│ ├── ISS-11: Remove broken codeRunner fallback in Gateway; return 503 cleanly │
│ ├── ISS-12: Resolve Docker container removal race condition in worker       │
│ ├── ISS-13: Bind Postgres and Redis ports to 127.0.0.1 in docker-compose    │
│ ├── ISS-14: Implement automated backup and restore scripts with rotation   │
│ └── ISS-15: Enforce strict environment variables without insecure fallbacks │
├─────────────────────────────────────────────────────────────────────────────┤
│ P3: LONGER-TERM QUALITY & TESTS (Continuous Improvement)                     │
│ ├── ISS-16: Fix database test environment configuration in gateway tests    │
│ └── ISS-17: Add pytest to worker dependencies and setup automated test run  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Special Architectural & Security Requirements

### 4.1 Assessment Integrity Architecture
1. **Four-Point Ownership Validation:**
   - Candidate ownership: `submissions.user_id === req.user.id`.
   - Problem association: `submissions.problem_id === assessment_section_questions.problem_id`.
   - Attempt association: `submissions.created_at >= attempt.started_at` AND `submissions.created_at <= attempt.expires_at`.
   - Eligibility enforcement: Student must be in `organization_members` or matched `student_rosters` for private/college assessments before starting an attempt.
2. **Atomic & Idempotent Scoring:**
   - `finalizeAndScoreAttempt` uses `SELECT ... FOR UPDATE` on `assessment_attempts` to prevent duplicate finalization or double-scoring races.
   - If `attempt.is_finalized` is already `TRUE`, the function immediately returns the existing finalized score without re-calculating or modifying scores.
3. **Pure Server-Side Score Authority:**
   - Client endpoints (`saveResponse`, `submitAttempt`) are completely stripped of any client-supplied `score`, `marks`, `is_correct`, or `pass_status` payload attributes.
   - Marks are derived solely from database records: objective questions via database answer key comparison; coding questions via `submissions` test case execution ratios.

### 4.2 Database Migration Safety Architecture
1. **Migration Version Tracking:**
   - Create and maintain a persistent `schema_migrations` table:
     ```sql
     CREATE TABLE IF NOT EXISTS schema_migrations (
         version VARCHAR(255) PRIMARY KEY,
         applied_at TIMESTAMPTZ DEFAULT NOW()
     );
     ```
   - Before executing any migration file (`*.sql`), check if `version` exists in `schema_migrations`. If present, skip execution with a log message.
2. **Transaction Isolation & Safe Failure Handling:**
   - Execute all migrations using `psql -v ON_ERROR_STOP=1`.
   - Wrap migration scripts in explicit transactions (`BEGIN; ... COMMIT;`) where DDL permits.
   - On error, `set -e` immediately halts execution; the failed migration is NOT registered in `schema_migrations`.
3. **Rollback & Forward-Recovery Procedures:**
   - **Rollback Procedure:** If a newly applied migration introduces an operational issue:
     1. Stop incoming write traffic / freeze worker queues.
     2. Execute the corresponding reverse migration script (e.g., `migrations/rollback/XXX_revert.sql`) inside a transaction.
     3. Remove the migration record: `DELETE FROM schema_migrations WHERE version = 'XXX_name.sql';`.
     4. Verify database consistency against the previous schema snapshot.
   - **Forward-Recovery Procedure (Recommended):**
     1. When a migration failure occurs mid-development, inspect Postgres logs to determine the exact failure point.
     2. Fix syntax or schema conflicts by authoring a new sequential forward migration (`021_...sql`) rather than mutating past applied scripts.
     3. If a migration rolled back cleanly in a transaction, address the root cause and re-run the runner.
4. **Safe Verification Rule:**
   - Never run destructive migration operations or rollback experiments against the active/production database.
   - All migration tests must be conducted against an isolated, disposable container or temporary test database.

### 4.3 Operational Monitoring Architecture
1. **Metrics Collection:**
   - Monitor Redis queue depth (`kodechirp-submissions`), worker concurrency and health, execution failure counts, execution duration percentiles (p50, p95), active PostgreSQL connections, CPU, memory, and disk usage.
2. **Strict Authorization:**
   - All monitoring dashboards and API endpoints (`/monitoring/*`, `/api/admin/system/*`) are strictly guarded by `requireAuth` and `requireSuperAdmin`.
   - Unauthorized access attempts log a security alert to `system_events`.
3. **Log Sanitization:**
   - Prohibit logging of passwords, plaintext JWTs, refresh token hashes, database credentials, PII, or hidden test cases in `system_events` and gateway/worker standard output logs.
   - Sanitize all error logs in gateway middleware to prevent stack traces from leaking server paths or DB credentials to clients.

### 4.4 Docker Security & Sandbox Isolation
1. **Least-Privilege Docker Proxy:**
   - Verify `tecnativa/docker-socket-proxy` environment: `CONTAINERS: 1`, `POST: 1`, `EXEC: 1`, with `VOLUMES: 0`, `NETWORKS: 0`, `NODES: 0`, `SERVICES: 0`, `SWARM: 0`, `SYSTEM: 0`.
   - The proxy is assigned exclusively to `kodechirp-sandbox-net`, an internal Docker bridge with `internal: true`.
   - Ensure gateway, frontend, and database have no network routes to the docker proxy.
2. **Sandbox Hardening:**
   - Sandbox containers run with `--network=none`, `--read-only`, `--tmpfs /tmp:size=16m,exec`, `--user sandbox`, `--pids-limit=64`, `--cap-drop=ALL`, and `--security-opt=no-new-privileges`.
   - Zero application environment variables or host mounts are passed to the sandbox container.

### 4.5 Backup, Recovery & Non-Destructive Testing
1. **Backup Tooling (`scripts/backup-db.sh`):**
   - Automated backup using `pg_dump -Fc` with MD5 checksum verification and 14-day rolling local retention.
   - Off-site backup strategy: Encrypted uploads (`gpg --symmetric` or AWS KMS) to remote object storage (S3/GCS bucket with lifecycle expiration policies).
2. **Restoration Drill Tooling (`scripts/restore-db.sh`):**
   - Recovery tests are performed exclusively into a temporary test database (e.g. `kodechirp_recovery_test`).
   - Automated restoration verification:
     1. Creates a temporary database `kodechirp_recovery_test`.
     2. Runs `pg_restore -d kodechirp_recovery_test <backup_file>`.
     3. Runs table count and integrity validation queries.
     4. Drops `kodechirp_recovery_test`.
   - Under no circumstances is the active/production database overwritten during recovery drills.

---

## 5. Detailed Remediation Specifications

---

### P0-01: Fix Syntax Error in `database/schema.sql` (ISS-01)
- **Affected File:** `database/schema.sql` (Line 21)
- **Root Cause:** Extra closing parenthesis `github_url VARCHAR(400)),` fails `psql` table creation on clean databases.
- **Proposed Implementation:**
  ```sql
  -- database/schema.sql Line 21
  -    github_url VARCHAR(400)),
  +    github_url VARCHAR(400),
  ```
- **Database Implications:** Zero schema change relative to existing initialized volumes. Enables successful execution of `01-schema.sql` on fresh databases.
- **Potential Regressions:** None.
- **Test Plan:**
  1. Validate SQL syntax with `python3 -c "import psycopg2..."` or `psql` in a temporary test container.
- **Acceptance Criteria:** `CREATE TABLE IF NOT EXISTS users` parses and executes cleanly with zero syntax errors.

---

### P0-02: Prevent Assessment Grade Tampering via Submission & Problem Verification (ISS-02)
- **Affected Files:**
  - `gateway/src/controllers/assessmentStudentController.js` (`saveResponse`, `finalizeAndScoreAttempt`)
- **Root Cause:** `saveResponse` inserts `code_submission_id` into `assessment_responses` without verifying that the submission was created by `req.user.id` or matches the section problem. `finalizeAndScoreAttempt` subsequently reads the submission verdict and awards marks blindly.
- **Proposed Implementation:**
  1. In `saveResponse`:
     ```javascript
     if (code_submission_id) {
       const subCheck = await db.query(
         `SELECT id, user_id, problem_id, created_at FROM submissions WHERE id = $1;`,
         [code_submission_id]
       );
       if (subCheck.rowCount === 0) {
         return res.status(400).json({ success: false, error: 'Referenced submission not found' });
       }
       const sub = subCheck.rows[0];
       if (sub.user_id !== userId) {
         return res.status(403).json({ success: false, error: 'Unauthorized submission assignment' });
       }
       if (problem_id && sub.problem_id !== problem_id) {
         return res.status(400).json({ success: false, error: 'Submission does not match question problem' });
       }
     }
     ```
  2. In `finalizeAndScoreAttempt`:
     ```javascript
     if (response.code_submission_id) {
       const subRes = await db.query(
         `SELECT status, test_cases_passed, test_cases_total 
          FROM submissions 
          WHERE id = $1 AND user_id = $2 AND problem_id = $3;`,
         [response.code_submission_id, attempt.user_id, item.problem_id]
       );
       if (subRes.rowCount > 0) {
         const sub = subRes.rows[0];
         if (sub.status === 'Accepted' && sub.test_cases_passed === sub.test_cases_total && sub.test_cases_total > 0) {
           isCorrect = true;
           scoreAwarded = marks;
         } else if (sub.test_cases_passed > 0 && sub.test_cases_total > 0) {
           const fraction = sub.test_cases_passed / sub.test_cases_total;
           scoreAwarded = parseFloat((fraction * marks).toFixed(2));
           isCorrect = fraction >= 0.5;
         }
       }
     }
     ```
  3. Ensure idempotency via transaction lock:
     ```javascript
     const attRes = await db.query(
       `SELECT * FROM assessment_attempts WHERE id = $1 FOR UPDATE;`, 
       [attemptId]
     );
     if (attRes.rows[0].is_finalized) return attRes.rows[0];
     ```
- **Database Implications:** None. Operates entirely on existing foreign keys and columns.
- **Potential Regressions:** None for legitimate students submitting code through the UI.
- **Test Plan:**
  1. Unit test: Student A attempts to save Student B's submission ID in `saveResponse` -> expects HTTP 403.
  2. Unit test: Student A submits a submission ID from Problem Y for Problem X -> expects HTTP 400.
  3. Integration test: Student completes coding assessment legitimately -> marks correctly awarded.
- **Acceptance Criteria:** Foreign submission IDs are rejected with HTTP 403; cross-problem submissions rejected with HTTP 400; only verified submissions earn marks.

---

### P0-03: Trap Crashes and Memory Limits in Batch Judging Execution (ISS-03)
- **Affected Files:**
  - `workers/src/worker/evaluator.py` (lines 142–225)
- **Root Cause:** Batch execution script piped to `docker exec container sh` does not set `set -e`. When user code aborts (SIGABRT, segfault, or MLE exit 137), `sh` continues to the next command and executes `echo "___KC_BATCH_SEP___"`. The evaluator sees the delimiter, assumes execution succeeded, compares empty stdout to expected output, and incorrectly returns `Wrong Answer`.
- **Proposed Implementation:**
  1. Add `set -e` at the start of the batch shell script:
     ```python
     sh_lines = ["set -e"]
     for tc in job.testCases:
         marker = f"EOF_KC_{uuid.uuid4().hex}"
         sh_lines.append(f"{run_cmd} << '{marker}'")
         sh_lines.append(tc.input)
         if tc.input and not tc.input.endswith('\n'):
             sh_lines.append("")
         sh_lines.append(marker)
         sh_lines.append("echo \"\"")
         sh_lines.append("echo \"___KC_BATCH_SEP___\"")
     ```
  2. When a command fails with non-zero exit code:
     - `sh` terminates immediately.
     - The delimiter for that test case is NOT printed.
     - `is_completed` is `False`.
     - `evaluator.py` line 184 enters the error handler.
     - Evaluator reads `result.exitCode` (e.g. 137 for OOM -> `Verdict.MLE`; 134/139 -> `Verdict.RUNTIME_ERROR`).
- **Database Implications:** None.
- **Potential Regressions:** None. Standard competitive programming judging behavior.
- **Test Plan:**
  1. Run `workers/tests/test_verdicts.py` across all 5 languages (C, C++, Python, Java, JavaScript) for AC, WA, TLE, MLE, RE, CE.
- **Acceptance Criteria:** `test_verdicts.py` passes with **30/30 (100%)** verdicts matching expectations.

---

### P0-04: Add SMTP Email Provider & Optional Testing Verification Bypass (ISS-04)
- **Affected Files:**
  - `gateway/src/services/emailService.js`
  - `gateway/src/services/authService.js`
  - `.env.example`
- **Root Cause:** `emailService.js` only implements a console logger. When real users register, `email_verified` remains `false` and users cannot log in.
- **Proposed Implementation:**
  1. In `emailService.js`, add `nodemailer` SMTP provider support when environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are configured.
  2. In `authService.js` (`signup`):
     ```javascript
     const requireVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
     
     if (!requireVerification) {
       // Testing Phase Bypass
       await db.query(
         `UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = $1;`,
         [user.id]
       );
       user.email_verified = true;
       const tokens = await generateTokenPair(user);
       return { user, ...tokens, verificationRequired: false };
     }
     ```
  3. In `.env.example`, document `REQUIRE_EMAIL_VERIFICATION=false` for closed testing environments and SMTP credentials for production.
- **Database Implications:** Uses existing `email_verified` and `email_verified_at` columns.
- **Potential Regressions:** None. In production (`REQUIRE_EMAIL_VERIFICATION=true`), full verification flow remains active.
- **Test Plan:**
  1. Test signup with `REQUIRE_EMAIL_VERIFICATION=false`: user receives access token immediately and can log in without verification error.
  2. Test signup with `REQUIRE_EMAIL_VERIFICATION=true`: user receives verification email and cannot log in until verified.
- **Acceptance Criteria:** Real users can register and immediately log in during testing; verification required in production.

---

### P0-18: Implement Schema Migrations Version Tracking (ISS-18)
- **Affected Files:**
  - `database/init-migrations.sh`
  - `scripts/init-db.sh`
- **Root Cause:** Shell migration runners apply all `*.sql` files blindly without tracking which migrations have already succeeded, risking errors and state corruption on restart.
- **Proposed Implementation:**
  Update `database/init-migrations.sh` and `scripts/init-db.sh`:
  ```bash
  # Ensure schema_migrations exists
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );"

  for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort -V); do
    if [ -f "$migration_file" ]; then
      filename=$(basename "$migration_file")
      already_applied=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$filename'")
      if [ "$already_applied" = "1" ]; then
        echo "  ⏭️  Skipping already-applied migration: $filename"
      else
        echo "  Applying $filename..."
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration_file"
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "INSERT INTO schema_migrations (version) VALUES ('$filename')"
      fi
    fi
  done
  ```
- **Database Implications:** Creates `schema_migrations` table.
- **Potential Regressions:** None. Completely backward-compatible.
- **Test Plan:**
  1. Run `init-migrations.sh` twice: first run applies files; second run safely skips all files.
- **Acceptance Criteria:** Migrations run once, record their versions, and are safely skipped on subsequent invocations.

---

### P1-05: Isolate Docker Socket Proxy onto Private Internal Network (ISS-05)
- **Affected Files:**
  - `docker-compose.yml`
- **Root Cause:** `docker-proxy` is attached to `kodechirp-net`, exposing port 2375 without authentication to the `gateway` and `frontend` containers.
- **Proposed Implementation:**
  1. Define two networks in `docker-compose.yml`:
     ```yaml
     networks:
       kodechirp-app-net:
         driver: bridge
       kodechirp-sandbox-net:
         driver: bridge
         internal: true
     ```
  2. Assign services:
     - `docker-proxy`: attached ONLY to `kodechirp-sandbox-net`.
     - `worker`: attached to BOTH `kodechirp-app-net` (for DB/Redis) and `kodechirp-sandbox-net` (for Docker proxy).
     - `gateway`, `frontend`, `postgres`, `redis`: attached ONLY to `kodechirp-app-net`.
- **Database Implications:** None.
- **Potential Regressions:** Worker must continue reaching Redis and Postgres on `kodechirp-app-net`.
- **Test Plan:**
  1. From `gateway` container: `curl http://docker-proxy:2375/version` -> must timeout or fail to resolve.
  2. From `worker` container: `curl http://docker-proxy:2375/version` -> returns 200 OK with Docker version.
- **Acceptance Criteria:** Docker socket proxy is unreachable by any container other than `worker`.

---

### P1-06: Restrict CORS Origin Reflection in API Gateway (ISS-06)
- **Affected Files:**
  - `gateway/src/server.js` (lines 45–61)
- **Root Cause:** Fallback `return callback(null, true)` unconditionally permits any requesting origin to send credentialed cross-origin requests.
- **Proposed Implementation:**
  ```javascript
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        (config.env === 'development' && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')))
      ) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'X-Requested-With'],
  }));
  ```
- **Database Implications:** None.
- **Potential Regressions:** Ensure `FRONTEND_URL` environment variable includes the deployment domain.
- **Test Plan:**
  1. Request with `Origin: http://localhost:3000` -> allowed.
  2. Request with `Origin: https://evil-domain.com` -> rejected with CORS error.
- **Acceptance Criteria:** Unapproved origins are rejected by CORS middleware.

---

### P1-07: Restrict Null-Organization Assessment Mutation to Super Admins (ISS-07)
- **Affected Files:**
  - `gateway/src/controllers/assessmentAdminController.js` (lines 24–30, 410, 684)
- **Root Cause:** `canModifyAssessment` returns `true` when `assessmentOrgId` is null, enabling College Admins to update or delete platform-level assessments.
- **Proposed Implementation:**
  ```javascript
  function canModifyAssessment(user, assessmentOrgId, userOrgId) {
    if (isSuperAdmin(user)) return true;
    // If assessment has no org assigned, only Super Admins may modify or delete it
    if (!assessmentOrgId) return false;
    return assessmentOrgId === userOrgId;
  }
  ```
  In `updateAssessment` (line 410), restrict `ensureAssessmentOrg` so that non-super admins cannot reassign organization ownership of null-org assessments.
- **Database Implications:** None.
- **Potential Regressions:** Super Admins retain full management rights across all assessments.
- **Test Plan:**
  1. College Admin issues `DELETE /api/admin/assessments/:id` on an assessment with `organization_id = NULL` -> expects HTTP 403.
  2. Super Admin issues the same request -> expects HTTP 200.
- **Acceptance Criteria:** Only Super Admins can modify or delete global/template assessments.

---

### P1-08: Add Organization Scoping Migration for Assessment Questions (ISS-08)
- **Affected Files:**
  - `database/migrations/020_add_organization_to_assessment_questions.sql` (New Migration)
  - `gateway/src/controllers/assessmentQuestionController.js`
- **Root Cause:** `assessment_questions` is a flat global table without organization scoping. Any College Admin can modify or delete any question.
- **Proposed Implementation:**
  1. Create migration `020_add_organization_to_assessment_questions.sql`:
     ```sql
     ALTER TABLE assessment_questions 
       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
     CREATE INDEX IF NOT EXISTS idx_assessment_questions_org ON assessment_questions(organization_id);
     ```
  2. In `assessmentQuestionController.js`:
     - `getQuestions`: Filter by `(q.organization_id = $1 OR q.organization_id IS NULL)` for college admins.
     - `createQuestion`: Populate `organization_id = req.organizationId || null`.
     - `updateQuestion` & `deleteQuestion`: Verify `isSuperAdmin(req.user) || (current.organization_id === req.organizationId && current.organization_id !== null)`.
- **Database Implications:** Fully additive migration. Existing questions default to `NULL` (global library).
- **Rollback:** `ALTER TABLE assessment_questions DROP COLUMN IF EXISTS organization_id;`
- **Potential Regressions:** Existing assessments referencing global questions continue to function.
- **Test Plan:**
  1. College Admin A cannot edit a question where `organization_id` belongs to College B or is `NULL`.
  2. College Admin A can edit their own questions.
- **Acceptance Criteria:** Cross-tenant question tampering is blocked with HTTP 403.

---

### P1-09: Protect Monitoring Endpoints with Super Admin Authentication (ISS-09)
- **Affected Files:**
  - `gateway/src/routes/monitoring.js`
- **Root Cause:** Routes in `monitoring.js` lack authentication middleware, exposing internal system traces, container events, and client IP addresses.
- **Proposed Implementation:**
  ```javascript
  const { requireAuth } = require('../middleware/auth');
  const { requireSuperAdmin } = require('../middleware/rbac');

  // Enforce Super Admin on all monitoring routes
  router.use(requireAuth, requireSuperAdmin);
  ```
- **Database Implications:** None.
- **Potential Regressions:** External uptime checkers should point to `/health` (which is public and returns basic status) rather than `/monitoring/events`.
- **Test Plan:**
  1. Unauthenticated `GET /monitoring/events` -> returns HTTP 401.
  2. Student/College Admin `GET /monitoring/events` -> returns HTTP 403.
  3. Super Admin `GET /monitoring/events` -> returns HTTP 200 with event data.
- **Acceptance Criteria:** Monitoring routes require Super Admin authentication.

---

### P1-10: Multi-Stage Production Dockerfile for Frontend (ISS-10)
- **Affected Files:**
  - `frontend/Dockerfile`
  - `docker-compose.yml`
- **Root Cause:** `frontend/Dockerfile` runs `npm run dev` with host volume mounts, resulting in ~500MB+ memory consumption, compilation lag, and dev-mode overhead.
- **Proposed Implementation:**
  Create a production multi-stage build:
  ```dockerfile
  FROM node:20-alpine AS deps
  WORKDIR /app
  COPY package.json package-lock.json* ./
  COPY scripts/ ./scripts/
  RUN npm ci

  FROM node:20-alpine AS builder
  WORKDIR /app
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  ARG NEXT_PUBLIC_API_URL
  ARG NEXT_PUBLIC_WS_URL
  ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
  ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
  RUN npm run copy-monaco && npm run build

  FROM node:20-alpine AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  COPY --from=builder /app/public ./public
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  EXPOSE 3000
  CMD ["node", "server.js"]
  ```
- **Database Implications:** None.
- **Potential Regressions:** Requires environment arguments at build time for `NEXT_PUBLIC_*` variables.
- **Test Plan:**
  1. Build container and run on port 3000.
  2. Confirm memory footprint is < 150MB and pages load immediately without runtime compilation.
- **Acceptance Criteria:** Frontend runs compiled production bundle via `node server.js`.

---

### P2-11: Remove Broken `codeRunner.js` Fallback in Gateway (ISS-11)
- **Affected Files:**
  - `gateway/src/services/submissionService.js` (lines 225–246)
  - `gateway/src/services/codeRunner.js`
- **Root Cause:** When the worker is unreachable, Gateway attempts `require('./codeRunner').executeLocal(...)`, which spawns `docker` inside an Alpine container that lacks the Docker binary, causing an uncaught `ENOENT` error.
- **Proposed Implementation:**
  Remove the fallback to `codeRunner.js`. Return a structured service unavailable error:
  ```javascript
  if (isNetworkError) {
    logger.warn({ err: err.message }, '[Submission] Worker service unreachable');
    recordWorkerUnreachable(err.message);
    return {
      stdout: '',
      stderr: 'Code execution service is temporarily unavailable. Please try again in a few moments.',
      exitCode: -1,
      timedOut: false,
      serviceUnavailable: true,
    };
  }
  ```
- **Database Implications:** None.
- **Potential Regressions:** Eliminates unexpected server crash when worker is rebooting.
- **Test Plan:**
  1. Stop worker container; click "Run Code" in frontend -> receives clean user-facing error message without gateway crash.
- **Acceptance Criteria:** Gateway gracefully handles worker downtime.

---

### P2-12: Resolve Container Cleanup Race Condition in Worker (ISS-12)
- **Affected Files:**
  - `workers/src/services/docker_service.py` (line 250)
- **Root Cause:** Starting containers with `--rm` triggers Docker's internal auto-removal upon container kill. The subsequent `docker rm -f` command in `stop_sandbox` races with the daemon, logging `removal of container is already in progress`.
- **Proposed Implementation:**
  Remove `--rm` from `docker_service.py:start_sandbox` (line 250). Allow `stop_sandbox` to deterministically kill and remove the container via `docker rm -f`.
- **Database Implications:** None.
- **Potential Regressions:** None. Explicit cleanup ensures no orphaned containers remain.
- **Test Plan:**
  1. Execute 20 submissions in worker; inspect logs -> zero `removal is already in progress` errors.
- **Acceptance Criteria:** Container teardown is deterministic with no daemon collision warnings.

---

### P2-13: Bind Postgres and Redis Ports to Localhost (ISS-13)
- **Affected Files:**
  - `docker-compose.yml` (lines 20, 43)
- **Root Cause:** Public port mappings `5433:5432` and `6380:6379` expose database and Redis to `0.0.0.0` (all host interfaces).
- **Proposed Implementation:**
  ```yaml
  postgres:
    ports:
      - "127.0.0.1:5433:5432"

  redis:
    ports:
      - "127.0.0.1:6380:6379"
  ```
- **Database Implications:** None. Internal container communication via `kodechirp-app-net` is unaffected.
- **Potential Regressions:** External database management tools must connect via SSH tunnel or from localhost.
- **Test Plan:**
  1. From external machine: `nmap -p 5433,6380 <server-ip>` -> ports reported closed/filtered.
- **Acceptance Criteria:** Data stores are inaccessible from external IP addresses.

---

### P2-14: Implement Automated Database Backup & Disaster Recovery Scripts (ISS-14)
- **Affected Files:**
  - `scripts/backup-db.sh` (New File)
  - `scripts/restore-db.sh` (New File)
- **Root Cause:** Complete absence of automated database backup scripts or disaster recovery verification.
- **Proposed Implementation:**
  1. Create `scripts/backup-db.sh`:
     - Executes `pg_dump -Fc` from `kodechirp-postgres`.
     - Compresses archive into `database/backups/kodechirp_backup_YYYYMMDD_HHMMSS.dump`.
     - Validates dump file integrity with `pg_restore -l`.
     - Prunes backups older than 14 days.
  2. Create `scripts/restore-db.sh`:
     - Restores exclusively into a specified target database (defaulting to a drill/test database).
     - Confirms target database name to prevent accidental production overwrite.
- **Database Implications:** Provides point-in-time recovery for student assessment records.
- **Potential Regressions:** None.
- **Test Plan:**
  1. Create test records in database.
  2. Run `backup-db.sh`.
  3. Run `restore-db.sh` against `kodechirp_test_restore` and verify tables and data match.
- **Acceptance Criteria:** Automated backups execute via cron and can be restored reliably into test databases.

---

### P2-15: Enforce Strict Environment Variables Without Insecure Fallbacks (ISS-15)
- **Affected Files:**
  - `docker-compose.yml`
  - `.env.example`
- **Root Cause:** Compose file contains insecure fallback defaults (`kodechirp_dev`, `dev-jwt-secret...`).
- **Proposed Implementation:**
  Remove fallback strings from `docker-compose.yml` for security-sensitive variables:
  ```yaml
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set in .env}
  JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be set in .env}
  JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET must be set in .env}
  ```
- **Database Implications:** None.
- **Potential Regressions:** Startup will fail if `.env` is missing (intended safety behavior).
- **Test Plan:**
  1. Attempt `docker compose up` without `.env` -> fails with clear error.
  2. Attempt `docker compose up` with populated `.env` -> starts cleanly.
- **Acceptance Criteria:** Containers refuse to start with empty or default security secrets.

---

### P3-16: Fix Database Test Configuration in Gateway Unit Tests (ISS-16)
- **Affected Files:**
  - `gateway/tests/problemNavigationAndSerial.test.js`
- **Root Cause:** Test connects directly to default port 5432, failing when PostgreSQL runs on port 5433 or when the test runs without a live database.
- **Proposed Implementation:**
  Update test to use `process.env.DATABASE_URL || 'postgresql://kodechirp:kodechirp_dev@localhost:5433/kodechirp'` or mock the database queries identically to other controller test suites.
- **Database Implications:** None.
- **Acceptance Criteria:** `npm test` in `gateway` runs with **18/18 test suites passing**.

---

### P3-17: Add Test Dependencies and Pytest Setup for Worker (ISS-17)
- **Affected Files:**
  - `workers/requirements.txt`
- **Root Cause:** `pytest` and `pytest-asyncio` are not installed in the worker container.
- **Proposed Implementation:**
  Add `pytest==8.3.4` and `pytest-asyncio==0.25.2` to `workers/requirements.txt`.
- **Database Implications:** None.
- **Acceptance Criteria:** `docker exec kodechirp-worker pytest` executes and runs all worker tests.

---

## 6. Implementation Phase Sequence

### Phase 1: Foundation & Migration Safety (Immediate Objective)
- [ ] Fix typo in `database/schema.sql` (Line 21).
- [ ] Implement `schema_migrations` tracking in `database/init-migrations.sh` and `scripts/init-db.sh`.
- [ ] Create additive migration `020_add_organization_to_assessment_questions.sql`.
- [ ] Verify non-destructive application of migration 020.
- [ ] Run automated fresh database initialization test in temporary DB.

### Phase 2: Engine & API Security Fixes
- [ ] Enforce submission ownership and problem matching in `assessmentStudentController.js`.
- [ ] Add `set -e` in `workers/src/worker/evaluator.py`; verify `test_verdicts.py` achieves 30/30.
- [ ] Implement SMTP email provider and `REQUIRE_EMAIL_VERIFICATION=false` testing bypass.
- [ ] Restrict null-organization assessment mutation in `assessmentAdminController.js`.
- [ ] Implement organization scoping in `assessmentQuestionController.js`.
- [ ] Tighten CORS origin validation in `gateway/src/server.js`.
- [ ] Protect `/monitoring/*` endpoints with `requireSuperAdmin` in `gateway/src/routes/monitoring.js`.
- [ ] Replace `codeRunner.js` fallback with clean 503 response in `submissionService.js`.

### Phase 3: Infrastructure, Sandbox & Secrets Hardening
- [ ] Isolate `docker-proxy` on private `kodechirp-sandbox-net`.
- [ ] Remove `--rm` in `docker_service.py:start_sandbox` to prevent daemon cleanup race.
- [ ] Bind Postgres (5433) and Redis (6380) host ports to `127.0.0.1`.
- [ ] Enforce strict environment variables in `docker-compose.yml`.

### Phase 4: Production Deployment & Backup Operations
- [ ] Create multi-stage `frontend/Dockerfile`.
- [ ] Integrate Nginx reverse proxy service with SSL and rate limiting.
- [ ] Implement `scripts/backup-db.sh` and `scripts/restore-db.sh`.
- [ ] Verify non-destructive backup and restore drill against temporary test database.

### Phase 5: Verification & Testing-Phase Gate Sign-Off
- [ ] Fix test database URL in `gateway/tests/problemNavigationAndSerial.test.js`.
- [ ] Execute full Gateway test suite (`npm test`).
- [ ] Execute full Worker verdict test suite (`test_verdicts.py`).
- [ ] Sign off on Go / No-Go checklist.
