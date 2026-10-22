<div align="center">

# 🐦 KodeChirp

### Enterprise Distributed Online Judge, Assessment Engine & Peer-Learning Platform

**Solve. Assess. Learn. Compete.** — The unified competitive programming and institutional evaluation ecosystem powered by isolated Docker sandboxes, AI-assisted problem authoring, multi-tenant university administration, and community-driven knowledge sharing.

[![Version](https://img.shields.io/badge/Version-2.0.0-6366f1?style=for-the-badge&logo=semver&logoColor=white)](./package.json)
[![Gateway](https://img.shields.io/badge/Gateway-Node.js_20_%7C_Express_4-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Workers](https://img.shields.io/badge/Workers-Python_3.12_%7C_FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_16_%7C_React_18-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_16_(29_Tables)-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Queue](https://img.shields.io/badge/Queue-Redis_7_%7C_BullMQ_5-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Sandbox](https://img.shields.io/badge/Sandbox-Hardened_Alpine_Containers-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.IO_4-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)

[📖 Documentation Hub](./docs/) · [🏗 Architecture Deep Dive](./docs/architecture.md) · [🗄 Database Design](./docs/database.md) · [🚀 Quick Start](#-quick-start) · [🛡 Security Model](#-security-model)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
  - [Core Pillars](#core-pillars)
  - [What Makes KodeChirp Unique?](#what-makes-kodechirp-unique)
- [Product Showcase](#-product-showcase)
- [System Architecture](#-system-architecture)
  - [Service Topology](#service-topology)
  - [Technology Stack Matrix](#technology-stack-matrix)
- [Execution & Evaluation Pipeline](#-execution--evaluation-pipeline)
  - [Submission Lifecycle](#submission-lifecycle)
  - [Dual Judge Execution Modes](#dual-judge-execution-modes)
  - [Sandbox Hardening & Security Isolation](#sandbox-hardening--security-isolation)
- [Assessment & Examination Engine](#-assessment--examination-engine)
  - [Question Bank & Taxonomy](#question-bank--taxonomy)
  - [Multi-Section Assessment Builder](#multi-section-assessment-builder)
  - [Student Examination Experience & Proctoring](#student-examination-experience--proctoring)
  - [Automated Grading & Analytics Export](#automated-grading--analytics-export)
- [Institutional Tier & Multi-Tenancy](#-institutional-tier--multi-tenancy)
  - [College Self-Registration & Approval Workflow](#college-self-registration--approval-workflow)
  - [Student Roster Management & Synchronization](#student-roster-management--synchronization)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Enterprise Audit Logging](#enterprise-audit-logging)
- [Community Learning & Competitive Arena](#-community-learning--competitive-arena)
  - [Chirps Peer Explanation Engine](#chirps-peer-explanation-engine)
  - [Live Rated Contests & Standings](#live-rated-contests--standings)
  - [Problem Navigation & Stable Serial Numbering](#problem-navigation--stable-serial-numbering)
- [Problem Authoring & AI Normalization](#-problem-authoring--ai-normalization)
- [Database Architecture](#-database-architecture)
- [Repository Structure](#-repository-structure)
- [Quick Start & Deployment](#-quick-start--deployment)
  - [Prerequisites](#prerequisites)
  - [One-Command Stack Launch](#one-command-stack-launch)
  - [Local Development Setup](#local-development-setup)
  - [Port Allocation Map](#port-allocation-map)
  - [Environment Configuration Guide](#environment-configuration-guide)
  - [NPM Scripts Reference](#npm-scripts-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Documentation Hub](#-documentation-hub)

---

## 🐦 Overview

**KodeChirp** is a distributed, full-stack online judge, enterprise assessment engine, and collaborative peer-learning platform built from the ground up. It bridges competitive programming, university recruitment drives, and deep pedagogical learning by pairing high-performance sandboxed code execution with structured explanations, automated test generation, and institutional cohort management.

### Core Pillars

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   KODECHIRP                                      │
├─────────────────┬──────────────────┬───────────────────┬─────────────────────────┤
│    1. JUDGE     │  2. ASSESSMENTS  │  3. INSTITUTIONS  │      4. COMMUNITY       │
├─────────────────┼──────────────────┼───────────────────┼─────────────────────────┤
│ • 5 Languages   │ • Question Bank  │ • College Sign-up │ • Chirps (Explanations) │
│ • Dual Modes    │ • Section Builder│ • Admin Review    │ • Timed Rated Contests  │
│ • Docker Alpine │ • Mixed/Coding   │ • Bulk Rosters    │ • ELO Leaderboards      │
│ • BullMQ Queues │ • Anti-Cheat     │ • Multi-Tenant    │ • Problem Serial Matrix │
│ • Memory Wrappr │ • XLSX Reports   │ • Audit Logging   │ • Interactive Profiles  │
└─────────────────┴──────────────────┴───────────────────┴─────────────────────────┘
```

### What Makes KodeChirp Unique?

Traditional online judges operate as black-box validation tools: you write code, get a verdict, and move on. KodeChirp expands the paradigm into a complete technical education and recruitment ecosystem:

1. **Understanding Over Memorization ("Chirps")**: Solve a problem, then read and contribute community-authored intuition breakdowns, edge-case analyses, and algorithmic walkthroughs.
2. **Turnkey Institutional Testing**: Colleges and enterprises can self-register, import student rosters from CSV/Excel spreadsheets, configure multi-section timed examinations (Aptitude, Core CS, Coding), proctor sessions with tab-switch detection, and export granular scorecards.
3. **Dual Judge Engine with Auto-Wrappers**: Execute classic competitive programming tasks (`STDIN_STDOUT`) or modern LeetCode-style signature problems (`FUNCTION`) with automated type-safe wrapper generation across C, C++, Python 3, Node.js, and Java.
4. **Hardened Defense-in-Depth Execution**: Every line of code runs in an unprivileged, network-isolated, read-only Docker container with PID and memory caps, managed through a scoped Docker socket proxy.

---

## 🖼 Product Showcase

<table>
  <tr>
    <td align="center"><img src="./docs/assets/screenshots/home-hero.png" width="400" /><br /><strong>Algorithmic Hero & Landing</strong><br />Interactive dark-mode interface with dynamic visuals</td>
    <td align="center"><img src="./docs/assets/screenshots/problems-list.png" width="400" /><br /><strong>Problem Catalog & Drawer</strong><br />Stable sequence numbering (#1..N) with topic filters</td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/assets/screenshots/code-editor.png" width="400" /><br /><strong>Monaco Code Editor</strong><br />Dual-pane workspace with live runner, test results & diffs</td>
    <td align="center"><img src="./docs/assets/screenshots/admin-dashboard.png" width="400" /><br /><strong>Admin Operations Hub</strong><br />Platform metrics, review queues, and service telemetry</td>
  </tr>
  <tr>
    <td align="center"><img src="./docs/assets/screenshots/admin-analytics.png" width="400" /><br /><strong>Analytics & Submission Console</strong><br />Acceptance rates, queue latency, and language distributions</td>
    <td align="center"><img src="./docs/assets/screenshots/admin-problems.png" width="400" /><br /><strong>Problem Management Lifecycle</strong><br />Draft → Review → Published → Archived workflows</td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="./docs/assets/screenshots/problem-authoring.png" width="520" /><br /><strong>Problem Authoring & Type System</strong><br />Function signature builder, constraint generator & reference solution verification</td>
  </tr>
</table>

> 📸 Visual artifacts and diagrams are indexed in [`docs/assets/`](./docs/assets/).

---

## 🏗 System Architecture

KodeChirp employs a **polyglot microservices topology** orchestrated via Docker Compose. High-concurrency I/O (routing, authentication, WebSocket events, job dispatching) is handled by Node.js, while compute-intensive container orchestration and execution evaluation are handled by an asynchronous Python/FastAPI worker pool.

### Service Topology

```
                                  ┌────────────────────────┐
                                  │      Client Browser    │
                                  │   (Next.js 16 / React) │
                                  └───────────┬────────────┘
                                              │ HTTP / WebSocket
                                              ▼
                                  ┌────────────────────────┐
                                  │   API Gateway (Port 4000)│
                                  │ Node.js 20 + Express 4 │
                                  │   Socket.IO + BullMQ   │
                                  └─────┬──────────────┬───┘
                       ┌────────────────┘              └────────────────┐
                       │                                                │
                       ▼                                                ▼
         ┌───────────────────────────┐                    ┌───────────────────────────┐
         │     PostgreSQL 16 (5433)  │                    │      Redis 7 (Port 6380)  │
         │  29 Relational Tables     │                    │  BullMQ Queue & Pub/Sub   │
         │  UUID PKs, JSONB, GIN     │                    │  Rate Limiting Counters   │
         └───────────────────────────┘                    └─────────────┬─────────────┘
                                                                        │ BRPOP / Job Stream
                                                                        ▼
                                                          ┌───────────────────────────┐
                                                          │   Workers (Python 3.12)   │
                                                          │  FastAPI + Docker SDK     │
                                                          │  Asyncio Queue Consumer   │
                                                          └─────────────┬─────────────┘
                                                                        │ Docker API
                                                                        ▼
                                                          ┌───────────────────────────┐
                                                          │    Docker Socket Proxy    │
                                                          │  (tecnativa/docker-proxy) │
                                                          │  POST /containers, RO Sock│
                                                          └─────────────┬─────────────┘
                                                                        │ run --rm
                                                                        ▼
                                         ┌────────────────────────────────────────────────────────┐
                                         │            Hardened Sandbox Containers (Alpine)        │
                                         │  • C (GCC 13)       • C++ (G++ 13)    • Python 3.12    │
                                         │  • Node.js 20       • Java 21 OpenJDK                  │
                                         │  Flags: --net=none, --cap-drop=ALL, --read-only, 256MB │
                                         └────────────────────────────────────────────────────────┘
```

### Technology Stack Matrix

| Domain | Technology | Key Capabilities & Justification |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16.4, React 18, Tailwind CSS, Zustand | App Router architecture, Monaco Editor integration, Framer Motion animations, responsive split-pane consoles. |
| **API Gateway** | Node.js 20 LTS, Express 4, Socket.IO 4 | Non-blocking asynchronous I/O, JWT token rotation, BullMQ producer, WebSocket push updates, multi-tenant RBAC routing. |
| **Workers** | Python 3.12, FastAPI 0.115, Docker SDK | Asyncio queue consumer, batch test dispatch, custom C memory-wrapper integration, testcase evaluation. |
| **Job Queue & Cache**| Redis 7 Alpine, BullMQ 5 | FIFO reliable queues with exponential backoff, Redis Pub/Sub cross-service event bus, sliding-window rate limiters. |
| **Primary Database** | PostgreSQL 16 Alpine | 29 relational tables with UUID PKs, GIN indexed JSONB columns, 15 versioned migrations, sequence-backed serials. |
| **Docker Proxy** | `tecnativa/docker-socket-proxy` | Least-privilege API gateway to the Docker daemon. Blocks dangerous endpoints while permitting isolated container execution. |
| **Code Sandboxes** | 5× Custom Alpine Linux Images | Pre-compiled sandboxes with custom C memory-wrapper (`mem_wrapper.c`), non-root execution (`runner`), dropped capabilities. |
| **Security & Auth** | JWT, bcryptjs, Helmet.js, Express-Validator | Double-token rotation families (15m access / 7d refresh), audit log tracking, strict CSP, CORS configuration. |
| **Test Suites** | Jest 29, Supertest 6, Pytest | End-to-end API testing, role simulation, execution lifecycle validation, and assessment builder workflows. |

---

## 🔁 Execution & Evaluation Pipeline

### Submission Lifecycle

The submission pipeline is completely decoupled and asynchronous, guaranteeing sub-second response times for clients even under heavy platform load:

```
 User (Browser)            API Gateway               Redis BullMQ            Worker Pool            Docker Daemon
      │                         │                         │                       │                       │
      │── 1. POST /submit ─────►│                         │                       │                       │
      │   (code, lang, probId)  │── 2. Validate & Insert ─│                       │                       │
      │                         │      (PostgreSQL)       │                       │                       │
      │                         │── 3. Queue Job ────────►│                       │                       │
      │◄── 4. { submissionId, ──│      (BullMQ FIFO)      │                       │                       │
      │       status: queued }  │                         │                       │                       │
      │                         │                         │── 5. BRPOP Job ──────►│                       │
      │                         │                         │                       │── 6. Prep Sandbox ───►│
      │                         │                         │                       │      (Mount files)    │
      │                         │                         │                       │── 7. Run Code ───────►│
      │                         │                         │                       │      (--net=none)     │
      │                         │                         │                       │◄── 8. Stdout/Stderr ──│
      │                         │                         │                       │      (Metrics/Code)   │
      │                         │                         │◄── 9. Publish Result ─│                       │
      │                         │◄── 10. PubSub Receive ──│                       │                       │
      │◄── 11. WS Push Event ───│    (Status: Accepted)   │                       │                       │
      │    (or GET /status)     │── 12. Update Database ──│                       │                       │
      ▼                         ▼                         ▼                       ▼                       ▼
```

**Submission Status Progression:**  
`queued` ➔ `processing` ➔ `running` ➔ `accepted` | `wrong_answer` | `time_limit_exceeded` | `memory_limit_exceeded` | `runtime_error` | `compilation_error`

### Dual Judge Execution Modes

KodeChirp supports two distinct judging paradigms:

#### 1. Standard Input / Standard Output (`STDIN_STDOUT`)
- Traditional competitive programming standard (Codeforces / CSES).
- The user's code reads from standard input and prints answers directly to standard output.
- Handled via direct stream piping through the sandbox runner.

#### 2. Function Signature Mode (`FUNCTION`)
- Modern platform standard (LeetCode / InterviewBit).
- The user writes an algorithmic function inside a template class or standalone signature without worrying about I/O parsing.
- **Dynamic Wrapper Generation**: The engine parses `signature_metadata` JSONB schemas and injects type-safe code wrappers across all 5 supported languages:
  - Supports: `Int`, `Float`, `String`, `Boolean`, `Array<T>`, `Matrix<T>`, `LinkedList`, `TreeNode`, and custom objects.
  - Automatically serializes JSON test inputs into native language types and serializes the function return value back into JSON for comparison.

### Sandbox Hardening & Security Isolation

Every untrusted submission executes inside a secure multi-layer sandbox:

```bash
docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --memory 256m \
  --memory-swap 256m \
  --cpus 1.0 \
  --pids-limit 64 \
  --user 10001:10001 \
  --volume /tmp/run_xyz:/sandbox:ro \
  kodechirp-python-sandbox:latest
```

- **Network Lockdown**: `--network=none` prevents SSRF, port scanning, data exfiltration, or reverse shells.
- **User Demotion**: Runs as unprivileged user `runner` (UID 10001) — root privileges inside the container are strictly disallowed.
- **Read-Only Root Filesystem**: The entire container root filesystem is read-only. Temporary scratch spaces are ephemeral and mounted with `noexec` / strict size limits.
- **Strict Resource Constraints**: Hard caps on memory (256 MB), swap (zero over-allocation), CPU quota, and execution duration (default 10s hard timeout).
- **Fork Bomb Defense**: `--pids-limit=64` stops thread bombs and unbounded process spawning.
- **Docker Socket Isolation**: The worker does not access `/var/run/docker.sock` directly. It communicates through `tecnativa/docker-socket-proxy`, which denies build, network, volume, node, and swarm commands.

---

## 📝 Assessment & Examination Engine

KodeChirp includes a full-featured campus recruitment and assessment engine designed for universities, colleges, and hiring teams.

### Question Bank & Taxonomy

- **Universal Question Store**: Multi-format question bank supporting Single Choice (`single_choice`), Multiple Choice (`multiple_choice`), True/False (`true_false`), Coding (`coding`), and Short Answer questions.
- **Taxonomy Structure**: Hierarchical classification by Category (e.g., *Quantitative Aptitude*, *Verbal Ability*, *Computer Fundamentals*, *Data Structures*), Topic, Subtopic, and Difficulty (`Easy`, `Medium`, `Hard`).
- **Batch Importers**: Built-in parsers for importing question dumps from structured CSV, JSON, and external question repositories (`npm run import:aptitude`).
- **Content Deduplication**: SHA-256 content hashing (`content_hash`) prevents duplicate question ingestion across repeated imports.

### Multi-Section Assessment Builder

- **Modular Exam Sections**: Configure tests with independent sections (e.g., Section 1: Objective Aptitude, Section 2: Technical Knowledge, Section 3: DSA Coding Challenge).
- **Flexible Section Modes**:
  - `manual`: Handpick specific questions from the Question Bank or Problem Catalog.
  - `random`: Dynamically sample $N$ questions matching difficulty, category, or topic rules.
- **Configurable Marking Schemes**:
  - Custom marks per question and granular negative marking (e.g., $+1.00$ / $-0.25$).
  - Section-level durations or platform-level countdown timer.
  - Option and question randomization per candidate.

### Student Examination Experience & Proctoring

- **Candidate Examination Interface**: Distraction-free, full-screen examination environment (`/assessments/take/[attemptId]`).
- **Dynamic Question Palette**: Live visual state matrix tracking *Answered*, *Not Answered*, *Marked for Review*, and *Unvisited* questions.
- **Real-Time Autosave**: Answer state changes are persisted automatically via debounced HTTP transactions.
- **Anti-Cheat & Tab-Switch Tracking**: Browser visibility listener logs candidate tab switches and window unfocus events to the attempt payload.
- **Integrated Coding Workspace**: Full Monaco Editor embedded within coding sections with multi-language execution and console feedback.

### Automated Grading & Analytics Export

- **Instant Evaluation Engine**: Immediate deterministic grading of objective answers alongside recorded test case verdicts for coding questions.
- **Flexible Results Release**: Configurable disclosure policies (`immediate`, `after_submission`, `after_assessment_end`, `never`).
- **Excel / CSV Scorecard Export**: College administrators can download comprehensive performance reports with candidate ranks, section breakdowns, negative marking adjustments, and attempt durations.

---

## 🏛 Institutional Tier & Multi-Tenancy

KodeChirp provides multi-tenant organizational isolation tailored for higher education institutions and enterprise training centers.

```
       Super Admin (Platform Level)
                    │
   ┌────────────────┴────────────────┐
   ▼                                 ▼
Organization: IIT Delhi         Organization: BITS Pilani
   ├── College Admin                ├── College Admin
   ├── Faculty / Moderators         ├── Faculty / Moderators
   └── Student Roster Cohorts       └── Student Roster Cohorts
       ├── CSE 2026                     ├── EEE 2025
       └── IT 2025                      └── Mech 2026
```

### College Self-Registration & Approval Workflow

1. **Self-Registration Portal (`/register-college`)**: Prospective partner institutions submit applications detailing college name, accreditation, institutional domain, campus location, and primary administrator candidate info.
2. **Email Verification**: Cryptographic token email verification ensures applicant domain authenticity.
3. **Super Admin Review Desk (`/admin/college-applications`)**: Super Administrators evaluate pending applications, inspect applicant credentials, and click **Approve** or **Reject** with written feedback.
4. **Automated Tenant Provisioning**: Approval automatically creates an `organizations` record, provisions the administrator user account with `college_admin` privileges, and assigns tenant scoping.

### Student Roster Management & Synchronization

- **Bulk Roster Import (`/admin/roster`)**: Upload `.xlsx` or `.csv` spreadsheets containing hundreds of student records (Roll Number, College Email, Student Name, Department, Academic Year).
- **Smart Validation & Preview**: Validates columns, flags duplicates, reports malformed records, and previews delta statistics before committing.
- **Automatic Account Linking**: Matches imported roster entries against existing or future student signups by university email or student ID.
- **Roster Deactivation Policies**: Options to keep unlisted records active or automatically deactivate students who have graduated or unenrolled.

### Role-Based Access Control (RBAC)

Hierarchical permissions enforced across routes and database triggers:

| Logical Role | Database Key | Scope & Privileges |
| :--- | :--- | :--- |
| **Super Admin** | `super_admin`, `admin` | Full platform authority. Manage all organizations, review college applications, approve problem normalizations, manage system users, view all audit logs. |
| **College Admin**| `college_admin` | Scoped to own institution. Manage student rosters, build and publish institutional assessments, view candidate scorecards, export reports. |
| **Faculty / Mod**| `moderator` | Assist with problem curation, review chirps, manage assessment question pools. |
| **Student** | `student`, `user` | Solve catalog problems, participate in public contests, sit for assigned institutional assessments, view performance scorecards. |

### Enterprise Audit Logging

Dedicated administrative audit trail (`admin_audit_logs`) tracking:
- **Actor Identity**: User ID, email, and assigned role.
- **Action Footprint**: Action name (e.g., `APPROVE_COLLEGE_APPLICATION`, `IMPORT_ROSTER`, `PUBLISH_ASSESSMENT`), target entity type, and ID.
- **Security Context**: Client IP address, timestamp, and detailed before/after JSON payload metadata.

---

## 💬 Community Learning & Competitive Arena

### Chirps Peer Explanation Engine

Code without context limits learning. KodeChirp introduces **Chirps**: peer-crafted explanations attached directly to problem pages:
- **Intuition-First Breakdown**: Authors articulate the conceptual leap behind an algorithm (e.g., *"Why a monotonic stack beats two pointers for this problem"*).
- **Complexity Analysis**: Space and time complexity breakdowns with edge case commentary.
- **Community Upvotes**: Helpful chirps rise to the top through upvoting.

### Live Rated Contests & Standings

- **Scheduled & Live Contests**: Timed competitions featuring curated problem sets.
- **ACM-ICPC Style Penalties**: Point accumulation based on problem difficulties with elapsed-time and wrong-submission penalty tracking.
- **Real-Time Leaderboard**: Live ranking powered by Redis and WebSocket updates.
- **Rating Engine**: Default 1200 base rating recalculated post-contest based on participant field performance.

### Problem Navigation & Stable Serial Numbering

- **Permanent Sequence Numbers (`serial_number`)**: Problems maintain stable, sequence-backed serial numbers (`#1`, `#2`, `#3`, ...) that never shift when filters, tags, pagination, or sorting are adjusted.
- **Question Navigator Drawer**: Quick-jump drawer allowing developers to navigate between problems seamlessly during practice sessions.

---

## ⚙️ Problem Authoring & AI Normalization

KodeChirp contains a full pipeline for authoring and validating programming problems:

1. **Problem Lifecycle States**: `Draft` ➔ `Review` ➔ `Published` ➔ `Archived`.
2. **Type System Builder**: Visual signature creator defining function names, parameter types, and return values.
3. **Automated Test Generation**: Constraint-based test generator (`testGen/`) parses problem boundaries to synthesize edge-case inputs (empty arrays, max integers, boundary strings).
4. **Reference Solution Pre-Flight Verification**: Validates reference solutions against generated test cases inside Docker sandboxes before a problem can be published.
5. **Catalog Importers**: Import and normalize reference solutions from standard competitive programming sets (`extendedCatalog.js`, `referenceCatalog.js`).

---

## 🗄 Database Architecture

PostgreSQL 16 serves as the persistent system of record across **29 relational tables** structured into distinct modular domains:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              POSTGRESQL 16 SCHEMA                               │
├──────────────────────────────────┬──────────────────────────────────────────────┤
│ Domain                           │ Tables Included                              │
├──────────────────────────────────┼──────────────────────────────────────────────┤
│ 1. Identity & Auth               │ users, refresh_tokens                        │
│ 2. Core Judge & Execution        │ problems, reference_solutions,               │
│                                  │ problem_templates, test_cases, submissions,  │
│                                  │ execution_metrics                            │
│ 3. Community & Contests          │ chirps, chirp_upvotes, contests,             │
│                                  │ contest_problems, contest_participants       │
│ 4. Assessment Engine             │ import_batches, assessment_questions,        │
│                                  │ assessments, assessment_sections,            │
│                                  │ assessment_section_questions,                │
│                                  │ assessment_section_problems,                 │
│                                  │ assessment_attempts,                         │
│                                  │ assessment_attempt_answers                   │
│ 5. Organizations & Roster        │ organizations, organization_members,         │
│                                  │ student_rosters, roster_imports,             │
│                                  │ assessment_assignments, college_applications │
│ 6. Enterprise Audit & Exports    │ admin_audit_logs, assessment_export_logs     │
└──────────────────────────────────┴──────────────────────────────────────────────┘
```

- **UUID Primary Keys**: All operational tables use `gen_random_uuid()` to prevent ID enumeration and streamline distributed sharding.
- **GIN Indexing on JSONB**: High-speed indexing over problem metadata, function signatures, test configurations, and tags.
- **Automatic Triggers**: All mutable tables leverage `update_updated_at_column()` triggers to maintain exact modification timestamps.

---

## 📁 Repository Structure

```
kodechirp/
├── .env.example                       # Canonical environment configuration template
├── docker-compose.yml                 # 6-service production-grade orchestration
├── package.json                       # Root script automation & workspace definitions
├── decisions.md                       # Architectural decision records (ADRs)
│
├── frontend/                          # Next.js 16 (App Router) + React 18 UI
│   ├── app/
│   │   ├── admin/                     # Super Admin & College Admin dashboard
│   │   │   ├── analytics/             # System telemetry & submission insights
│   │   │   ├── assessments/           # Multi-section assessment builder
│   │   │   ├── audit-logs/            # Administrative audit trail viewer
│   │   │   ├── college-applications/  # College onboarding review console
│   │   │   ├── organizations/         # Multi-tenant organization manager
│   │   │   ├── question-bank/         # Universal question repository
│   │   │   ├── roster/                # Student roster Excel/CSV import tool
│   │   │   └── users/                 # Role assignments & account status
│   │   ├── assessments/               # Candidate assessment portal
│   │   │   ├── take/[attemptId]/      # Fullscreen test taking interface
│   │   │   └── result/[attemptId]/    # Candidate scorecards & performance
│   │   ├── auth/                      # Authentication & password recovery
│   │   ├── compete/                   # Live contests & leaderboards
│   │   ├── problems/                  # Problem catalog & Monaco coding IDE
│   │   └── register-college/          # Institutional self-registration form
│   ├── components/                    # Reusable React components
│   ├── hooks/                         # useAuth, useProblem, useEditor hooks
│   └── store/                         # Zustand global state slices
│
├── gateway/                           # Node.js 20 + Express 4 API Gateway
│   ├── src/
│   │   ├── config/                    # Database (pg pool) & Redis clients
│   │   ├── controllers/               # Route controllers (Judge, Auth, Admin, Roster)
│   │   ├── middleware/                # JWT auth, rate limiter, RBAC verification
│   │   ├── queue/                     # BullMQ queue producer & Redis Pub/Sub listener
│   │   ├── routes/                    # API route declarations
│   │   ├── services/                  # Business logic, roster sync, test generator
│   │   ├── websocket/                 # Socket.IO connection hub
│   │   └── server.js                  # Gateway entrypoint & lifecycle hooks
│   └── tests/                         # Jest & Supertest integration test suite
│
├── workers/                           # Python 3.12 + FastAPI Async Worker Pool
│   ├── src/
│   │   ├── services/                  # Docker SDK, Redis consumer, PostgreSQL connection
│   │   ├── worker/                    # Queue evaluator, sandbox runner & wrapper generator
│   │   └── main.py                    # Worker FastAPI application entrypoint
│   └── tests/                         # Pytest test cases & verdict matrix validation
│
├── sandboxes/                         # Hardened Alpine Sandbox Images
│   ├── c/                             # GCC 13 + custom C memory wrapper
│   ├── cpp/                           # G++ 13 + custom C memory wrapper
│   ├── python/                        # Python 3.12 Alpine
│   ├── node/                          # Node.js 20 Alpine
│   └── java/                          # OpenJDK 21 Alpine
│
├── database/                          # Database Schemas & Migrations
│   ├── schema.sql                     # Base relational database schema
│   ├── init-migrations.sh             # Container auto-migration orchestrator
│   ├── migrations/                    # 15 Versioned SQL migrations (001-015)
│   └── seeds/                         # Seed catalog data for local development
│
├── scripts/                           # Operational Automation Scripts
│   ├── build-sandboxes.sh             # Builds all 5 Docker sandbox images
│   ├── dev-setup.sh                   # Initial setup script for new environments
│   ├── health-check.sh                # Stack-wide healthcheck verification
│   └── init-db.sh                     # Standalone database initialization script
│
└── docs/                              # In-Depth Engineering Documentation
    ├── architecture.md                # System topology & design rationale
    ├── execution-pipeline.md          # Sandbox execution & wrapper mechanics
    ├── database.md                    # Detailed table relationships & data dictionary
    ├── security.md                    # Threat model & container security specs
    ├── deployment.md                  # Scaling & production deployment instructions
    └── api-reference.md               # Complete REST API endpoint reference
```

---

## 🚀 Quick Start & Deployment

### Prerequisites

| Tool | Minimum Version | Purpose |
| :--- | :--- | :--- |
| **Docker Engine** | `24.0+` | Container runtime |
| **Docker Compose**| `v2.20+` | Multi-container stack orchestration |
| **Node.js** | `20.x LTS` | Gateway and frontend environments |
| **Python** | `3.11+` | Worker service environment |

---

### One-Command Stack Launch

Clone the repository and launch the full 6-service stack in Docker:

```bash
# 1. Clone the repository
git clone https://github.com/ritam4735/kodechirp.git
cd kodechirp

# 2. Configure environment variables
cp .env.example .env
# Edit .env to set your JWT secrets and passwords

# 3. Build sandbox execution images (one-time requirement)
npm run build:sandboxes

# 4. Launch the entire platform
npm start
```

---

### Local Development Setup

If developing services locally with hot reload while hosting PostgreSQL and Redis in Docker:

```bash
# 1. Run environment setup script
npm run setup

# 2. Start PostgreSQL and Redis in the background
docker compose up -d postgres redis docker-proxy

# 3. In Terminal 1 — Start the API Gateway
npm run dev:gateway

# 4. In Terminal 2 — Start the Python Worker
npm run dev:worker

# 5. In Terminal 3 — Start the Next.js Frontend
npm run dev:frontend
```

---

### Port Allocation Map

| Service | Container / Process | Local Port | Target URL |
| :--- | :--- | :--- | :--- |
| **Frontend** | `kodechirp-frontend` | `3000` | [http://localhost:3000](http://localhost:3000) |
| **API Gateway** | `kodechirp-gateway` | `4000` | [http://localhost:4000](http://localhost:4000) |
| **Worker API** | `kodechirp-worker` | `8000` | Internal / [http://localhost:8000](http://localhost:8000) |
| **PostgreSQL** | `kodechirp-postgres` | `5433` | `localhost:5433` (maps to internal `5432`) |
| **Redis** | `kodechirp-redis` | `6380` | `localhost:6380` (maps to internal `6379`) |
| **Docker Proxy**| `kodechirp-docker-proxy` | `2375` | Internal docker network (`tcp://docker-proxy:2375`) |

---

### Environment Configuration Guide

Key environment variables in `.env`:

```ini
# ── PostgreSQL Database ───────────────────────────────────────────────────────
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://kodechirp:${POSTGRES_PASSWORD}@postgres:5432/kodechirp

# ── Redis & Queue ─────────────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ── JWT Authentication Secrets ────────────────────────────────────────────────
JWT_SECRET=super-secret-access-token-min-32-chars
JWT_REFRESH_SECRET=super-secret-refresh-token-min-32-chars

# ── Gateway Configuration ─────────────────────────────────────────────────────
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# ── Worker Configuration ──────────────────────────────────────────────────────
WORKER_CONCURRENCY=4
EXECUTION_TIMEOUT=10
MAX_RETRIES=3

# ── Frontend Public Variables ─────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

---

### NPM Scripts Reference

All primary developer operations are accessible via the root `package.json`:

```bash
# Stack Management
npm run dev              # Build and start all services via Docker Compose with logs
npm start                # Start all services in detached mode
npm stop                 # Gracefully shut down and remove stack containers
npm run logs             # Follow logs across all containers
npm run logs:gateway     # Follow Gateway container logs
npm run logs:worker      # Follow Worker container logs

# Setup & Build
npm run setup            # Automated developer environment setup
npm run install:all      # Install node dependencies across gateway and frontend
npm run build:sandboxes  # Build all 5 Alpine execution sandbox images
npm run init:db          # Apply schema, seeds, and migrations to target PostgreSQL
npm run health           # Perform stack-wide health checks

# Data Management
npm run import:aptitude  # Import standardized aptitude and assessment questions
```

---

## 🧪 Testing & Quality Assurance

KodeChirp contains automated test suites spanning both unit execution and complex end-to-end multi-tenant workflows.

### Running Gateway & RBAC Tests

```bash
cd gateway
npm test
```

Test suites cover:
- **`rbacRosterCompete.test.js`**: Validates organizational tenancy, role boundaries, and access constraints.
- **`assessmentPipeline.test.js`**: Tests complete student examination lifecycles from start to grading and scorecard calculation.
- **`assessmentBuilderWorkflow.test.js`**: Validates section creation, question mapping, and reordering.
- **`collegeOnboarding.test.js`**: Tests college self-registration, email verification, and Super Admin approval.
- **`problemNavigationAndSerial.test.js`**: Verifies stable problem serial numbering and pagination persistence.
- **`auth.test.js`**: Verifies double-token JWT issuance, refresh rotation, and rate-limiting.

### Running Worker Execution Tests

```bash
cd workers
pytest -v
```

Worker test suites cover:
- Docker container creation, command execution, and timeout enforcement.
- Custom C memory measurement wrapper validation.
- Output formatting, diff detection, and verdict assignment (`AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`).

---

## 🗺 Roadmap

- [x] Distributed Docker execution sandbox with dual judge modes (`STDIN_STDOUT` & `FUNCTION`)
- [x] Automated wrapper generator across 5 languages (C, C++, Python 3, Node 20, Java 21)
- [x] Question Bank & Multi-Section Assessment Engine with automated grading
- [x] Institutional Multi-Tenancy, College Self-Registration & Super Admin Review Desk
- [x] Student Roster CSV/Excel bulk upload and automated account linking
- [x] Role-Based Access Control (`super_admin`, `college_admin`, `moderator`, `student`)
- [x] Candidate Proctoring & Tab-Switch event logging
- [x] Excel/CSV Assessment Performance and Scorecard Export
- [x] Permanent problem sequence numbering (#1..N) and quick navigation drawer
- [ ] Kubernetes Helm charts for distributed cluster worker autoscaling
- [ ] AI-Powered Code Explainer & Mistake Diagnosis ("Explain My Bug" via LLM)
- [ ] Plagiarism & Similarity Detection Engine (MOSS token-based comparison)
- [ ] GitHub & Google OAuth SSO Integration
- [ ] Nested threaded discussions on Chirps

---

## 🤝 Contributing

We welcome contributions from competitive programmers, developers, and educators!

1. **Fork the Repository**
2. **Create a Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Your Changes**: `git commit -m 'feat: add amazing feature'`
4. **Run Test Suites**: Ensure `cd gateway && npm test` passes cleanly
5. **Push to Branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

---

## 📖 Documentation Hub

For in-depth architectural and operational guides, visit the documentation directory:

| Document | Description |
| :--- | :--- |
| [🏗 Architecture Guide](./docs/architecture.md) | Polyglot service design, component responsibilities, and topology |
| [🔁 Execution Pipeline](./docs/execution-pipeline.md) | Queue lifecycle, worker processing, and wrapper generation |
| [🗄 Database Design](./docs/database.md) | 29-table schema dictionary, foreign keys, and indexing strategy |
| [🛡 Security Design](./docs/security.md) | Container hardening flags, proxy isolation, and threat model |
| [🚀 Deployment Guide](./docs/deployment.md) | Production setup, scaling strategies, and environment variables |
| [📡 API Reference](./docs/api-reference.md) | Comprehensive REST API endpoints and request schemas |
| [💡 Decisions Record](./decisions.md) | 20 Architectural Decision Records (ADRs) with rationale |

---

<div align="center">

**Built with ❤️ by [Ritam](https://github.com/ritam4735)**

*KodeChirp — Where developers solve, learn, and grow together.*

</div>
