<div align="center">

# 🐦 KodeChirp

### Production-Grade Distributed Code Execution Platform

A scalable online judge built with a hybrid microservices architecture — featuring async execution pipelines, Docker-sandboxed code isolation, Redis-backed job queues, and real-time WebSocket updates.

[![Node.js](https://img.shields.io/badge/Gateway-Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/Workers-FastAPI_0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Redis](https://img.shields.io/badge/Queue-Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Sandbox-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)

</div>

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Execution Pipeline](#-execution-pipeline)
- [Tech Stack](#-tech-stack)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Docker Compose Services](#-docker-compose-services)
- [API Reference](#-api-reference)
- [Security Model](#-security-model)
- [Key Features](#-key-features)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)

---

## 🏗 Architecture Overview

KodeChirp follows a **gateway-worker architecture** — separating API routing, authentication, and real-time delivery (Node.js) from compute-heavy code execution (Python/FastAPI). Redis serves as the async message broker between the two layers.

![KodeChirp System Architecture](./docs/assets/architecture.png)

### Component Responsibilities

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 + React | Monaco editor, problem UI, contest dashboard, admin console |
| **API Gateway** | Node.js 20 + Express 4 | Auth, routing, request validation, BullMQ job dispatch, WebSocket hub |
| **Execution Workers** | Python 3.12 + FastAPI | Queue consumer, Docker SDK orchestration, test case evaluation, result publishing |
| **Job Queue** | Redis 7 + BullMQ | FIFO submission queue, Pub/Sub event bus, rate-limit counters |
| **Sandboxes** | Docker + Alpine Linux | Isolated, ephemeral, hardened containers per code execution |
| **Database** | PostgreSQL 16 | Users, problems, submissions, test cases, contests, metrics |
| **Reverse Proxy** | Nginx | SSL termination, rate limiting, WebSocket upgrade, load balancing |

---

## 🔁 Execution Pipeline

The submission pipeline is fully asynchronous. The frontend polls for results while the worker processes jobs independently.

```
 User               Frontend            Gateway             Redis              Worker             Docker
  │                    │                   │                   │                  │                  │
  │   Submit Code      │                   │                   │                  │                  │
  ├──────────────────► │                   │                   │                  │                  │
  │                    │  POST /submit     │                   │                  │                  │
  │                    ├──────────────────►│                   │                  │                  │
  │                    │                   │  Validate + Store │                  │                  │
  │                    │                   │  (PostgreSQL)     │                  │                  │
  │                    │                   │                   │                  │                  │
  │                    │                   │  BullMQ.add()     │                  │                  │
  │                    │                   ├──────────────────►│                  │                  │
  │                    │  { submissionId,  │                   │                  │                  │
  │                    │  status: queued } │                   │                  │                  │
  │                    │◄──────────────────┤                   │                  │                  │
  │                    │                   │                   │  BRPOP/dequeue   │                  │
  │                    │                   │                   │◄─────────────────┤                  │
  │                    │  GET /poll        │                   │                  │                  │
  │                    ├──────────────────►│  PUB processing   │                  │                  │
  │                    │◄──────────────────┤◄──────────────────┤                  │                  │
  │                    │  { processing }   │                   │                  │  docker.run()    │
  │                    │                   │                   │                  ├─────────────────►│
  │                    │                   │                   │                  │                  │
  │                    │                   │                   │                  │ stdout/stderr    │
  │                    │                   │                   │                  │◄─────────────────┤
  │                    │                   │                   │  PUB completed   │                  │
  │                    │  GET /poll        │                   │◄─────────────────┤                  │
  │                    ├──────────────────►│◄──────────────────┤                  │                  │
  │  Result Display    │◄──────────────────┤                   │                  │                  │
  │◄───────────────────┤  { accepted }     │                   │                  │                  │
```

### Submission Status Lifecycle

| Status | Description |
| :--- | :--- |
| `queued` | Stored in DB, job dispatched to BullMQ |
| `processing` | Worker dequeued job, preparing execution |
| `running` | Code executing inside Docker sandbox |
| `accepted` | All test cases passed ✅ |
| `wrong_answer` | Output mismatch on one or more test cases |
| `time_limit_exceeded` | Execution exceeded configured timeout |
| `runtime_error` | Non-zero exit code or crash |
| `compilation_error` | Failed to compile (C / C++ / Java) |

### Judge Modes

KodeChirp supports two distinct execution modes controlled by the `judge_mode` field on each problem:

| Mode | Description |
| :--- | :--- |
| `STDIN_STDOUT` | Classic competitive programming — code reads from stdin, writes to stdout |
| `FUNCTION` | LeetCode-style — worker auto-generates multi-language wrappers from `signature_metadata` |

---

## 🧰 Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js + React | 16 / 18 | App Router SSR, responsive UI |
| **Code Editor** | Monaco Editor | latest | VS Code-grade in-browser editing |
| **Styling** | Tailwind CSS | 3 | Utility-first component styling |
| **State** | Zustand | 4 | Lightweight global state management |
| **API Gateway** | Node.js + Express | 20 / 4 | Routing, auth, middleware, Socket.IO |
| **Job Queue** | BullMQ | 5 | Reliable async job dispatch over Redis |
| **Message Broker** | Redis | 7 | BullMQ queue + Pub/Sub event bus |
| **Workers** | Python + FastAPI | 3.12 / 0.115 | Async queue consumer + Docker SDK |
| **Sandboxing** | Docker + Alpine | Engine 24+ | Isolated, resource-limited execution |
| **Database** | PostgreSQL | 16 | Relational schema, UUID PKs, triggers |
| **Realtime** | Socket.IO | 4 | WebSocket hub for live updates |
| **Auth** | JWT + bcryptjs | — | Token rotation, RBAC, httpOnly cookies |
| **Proxy** | Nginx | latest | Reverse proxy, SSL, rate limiting |
| **Logging** | Pino (Node) + python-json-logger | — | Structured JSON logs across services |
| **Testing** | Jest + Supertest | — | Gateway integration tests |
| **Infra** | Docker Compose | v2 | Single-command full-stack orchestration |

---

## 🗄 Database Schema

13-table PostgreSQL schema with UUID primary keys, GIN indexes for JSONB, and `updated_at` auto-triggers.

![KodeChirp Database Schema](./docs/assets/db-schema.png)

### Entity Relationship Summary

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

### Key Tables

<details>
<summary><strong>users</strong> — Platform accounts with RBAC</summary>

```sql
id UUID PK, username, email, password_hash,
role CHECK ('user','admin','moderator'),
rating INT DEFAULT 1200,
preferences_json JSONB,
email_verified BOOL, last_login_at, created_at
```
</details>

<details>
<summary><strong>problems</strong> — Problem definitions with pipeline metadata</summary>

```sql
id UUID PK, slug UNIQUE, title, description, difficulty,
time_limit_ms, memory_limit_mb, status, tags JSONB,
judge_mode CHECK ('STDIN_STDOUT','FUNCTION','CLASS','CUSTOM'),
signature_metadata JSONB,   -- function signature for wrapper gen
reference_solution_id FK,   -- source-of-truth solution
execution_version INT
```
</details>

<details>
<summary><strong>submissions</strong> — Full execution audit record</summary>

```sql
id UUID PK, user_id FK, problem_id FK, language, code,
status, runtime_ms, memory_kb,
test_cases_passed, test_cases_total,
failed_test_input, failed_test_expected, failed_test_actual,
judge_mode, signature_snapshot JSONB, template_snapshot JSONB,
queued_at, started_at, completed_at
```
</details>

<details>
<summary><strong>execution_metrics</strong> — Per-test-case metrics</summary>

```sql
id UUID PK, submission_id FK, test_case_id FK,
test_index, runtime_ms, memory_kb,
exit_code, status, stdout_preview, stderr_preview
```
</details>

<details>
<summary><strong>test_cases</strong> — Dual-format test data</summary>

```sql
id UUID PK, problem_id FK,
input TEXT, expected_output TEXT,   -- STDIN_STDOUT mode
input_json JSONB, expected_json JSONB,  -- FUNCTION mode
is_sample BOOL, category, verified BOOL
```
</details>

---

## 📁 Project Structure

```
kodechirp/
│
├── frontend/                    # Next.js 16 React Frontend
│   ├── app/                     # App Router pages & layouts
│   │   ├── (main)/              # Public-facing pages
│   │   ├── admin/               # Admin console (RBAC protected)
│   │   └── auth/                # Login, signup, forgot-password
│   ├── components/              # Reusable UI + Monaco editor
│   ├── hooks/                   # useAuth, useEditor, useSubmission
│   ├── lib/                     # API clients, socket.io connection
│   ├── store/                   # Zustand slices (auth, editor)
│   └── Dockerfile
│
├── gateway/                     # Node.js API Gateway
│   ├── src/
│   │   ├── config/              # DB pool, Redis client, app config
│   │   ├── controllers/         # authController, submissionsController…
│   │   ├── middleware/          # JWT auth, rate limiter, error handler
│   │   ├── models/              # DB query models
│   │   ├── queue/               # BullMQ producer + Redis Pub/Sub listener
│   │   ├── routes/              # Express routers
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # Pino logger, helpers
│   │   ├── websocket/           # Socket.IO init + event handlers
│   │   └── server.js            # HTTP server + graceful shutdown
│   ├── tests/                   # Jest + Supertest integration tests
│   └── Dockerfile
│
├── workers/                     # Python FastAPI Execution Workers
│   ├── src/
│   │   ├── api/                 # Health + metrics endpoints
│   │   ├── models/              # Pydantic schemas
│   │   ├── services/            # Redis, PostgreSQL, Docker SDK
│   │   ├── utils/               # Logger, language configs, constants
│   │   ├── worker/              # Queue consumer + evaluator
│   │   ├── config.py            # Pydantic settings (env-driven)
│   │   └── main.py              # FastAPI app + lifespan management
│   ├── requirements.txt
│   └── Dockerfile
│
├── sandboxes/                   # Hardened Docker sandbox images
│   ├── c/                       # GCC 13 Alpine
│   ├── cpp/                     # G++ 13 Alpine
│   ├── python/                  # Python 3.12 Alpine
│   ├── node/                    # Node.js 20 Alpine
│   └── java/                    # OpenJDK 21 Alpine
│
├── database/
│   ├── schema.sql               # Production schema (13 tables, triggers)
│   ├── migrations/              # Incremental migration scripts
│   └── seeds/                   # Development seed data
│
├── nginx/
│   └── nginx.conf               # Rate limit zones, WebSocket proxy, headers
│
├── monitoring/
│   └── grafana/                 # Grafana dashboard configs
│
├── scripts/
│   ├── build-sandboxes.sh       # Build all 5 sandbox images
│   ├── init-db.sh               # DB init + seed
│   └── health-check.sh          # Service health verification
│
├── docs/
│   └── assets/                  # Architecture & schema diagrams
│
├── docker-compose.yml           # Full 6-service stack
├── .env.example                 # Environment variable template
└── package.json                 # Root npm scripts
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
| :--- | :--- |
| Docker Engine | 24+ |
| Docker Compose | v2+ |
| Node.js | 20+ |
| Python | 3.11+ |
| Git | any |

### Quick Start — Docker Compose

The fastest way to run the complete platform:

```bash
# 1. Clone the repository
git clone https://github.com/ritam4735/kodechirp.git
cd kodechirp

# 2. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD

# 3. Build hardened sandbox images (one-time)
npm run build:sandboxes

# 4. Launch the full stack
npm run dev
```

**Services start on:**

| Service | URL |
| :--- | :--- |
| Frontend | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| PostgreSQL | localhost:5433 |
| Redis | localhost:6380 |
| Worker (health) | http://localhost:8000 |

### Local Development (Without Docker Compose)

For rapid iteration on individual services:

```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — PostgreSQL + Schema
npm run init:db

# Terminal 3 — API Gateway
npm run dev:gateway

# Terminal 4 — FastAPI Worker
npm run dev:worker

# Terminal 5 — Frontend
npm run dev:frontend
```

### Building Sandbox Images

```bash
npm run build:sandboxes
# Builds: kodechirp-c-sandbox
#         kodechirp-cpp-sandbox
#         kodechirp-python-sandbox
#         kodechirp-node-sandbox
#         kodechirp-java-sandbox
```

### Health Check

```bash
npm run health
# Verifies: DB connectivity, Redis ping, Worker API, all sandbox images
```

---

## 🐳 Docker Compose Services

```
┌─────────────────────────────────────────────────────────┐
│  kodechirp-net (bridge)                                 │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐                   │
│  │  frontend    │   │   gateway    │                   │
│  │  :3000       │──►│  :4000       │                   │
│  └──────────────┘   └──────┬───────┘                   │
│                            │                            │
│          ┌─────────────────┼──────────────┐             │
│          ▼                 ▼              ▼             │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐   │
│  │  postgres    │ │    redis     │ │    worker     │   │
│  │  :5432       │ │  :6379       │ │  :8000        │   │
│  └──────────────┘ └──────────────┘ └───────┬───────┘   │
│                                            │            │
│                                   ┌────────▼──────┐     │
│                                   │ docker-proxy  │     │
│                                   │ (socket proxy)│     │
│                                   └───────────────┘     │
└─────────────────────────────────────────────────────────┘
```

| Service | Image | Resources | Notes |
| :--- | :--- | :--- | :--- |
| `postgres` | `postgres:16-alpine` | Default | Persistent volume, health-checked |
| `redis` | `redis:7-alpine` | 256 MB cap | AOF persistence, noeviction policy |
| `gateway` | Custom (Node 20) | Default | Hot-reload in dev via volume mount |
| `worker` | Custom (Python 3.12) | 2 CPU / 1 GB | Scalable via `--scale worker=N` |
| `docker-proxy` | `tecnativa/docker-socket-proxy` | — | Scoped Docker API (CONTAINERS + IMAGES + POST only) |
| `frontend` | Custom (Next.js) | Default | Volume-mounted for hot-reload |

### Scaling Workers

```bash
# Scale to 4 parallel worker instances
docker compose up -d --scale worker=4
```

---

## 📡 API Reference

### Authentication

```http
POST   /api/auth/signup          # Register new user
POST   /api/auth/login           # Login → access + refresh tokens
POST   /api/auth/refresh         # Rotate token pair
POST   /api/auth/logout          # Revoke refresh token family
GET    /api/auth/me              # Current user profile  [Bearer]
POST   /api/auth/forgot-password # Request password reset
POST   /api/auth/reset-password  # Apply reset token
```

### Problems

```http
GET    /api/problems             # Paginated problem list
GET    /api/problems/:id         # Problem detail + sample test cases
GET    /api/problems/:id/templates/:lang  # Starter code template
```

### Submissions

```http
POST   /api/submissions/run      # Synchronous run (Run ▶ button)
POST   /api/submissions/submit   # Async judge (Submit button)
GET    /api/submissions/:id      # Submission detail + metrics
GET    /api/submissions/user     # Current user history  [Bearer]
```

### Admin (Role: admin)

```http
GET    /api/admin/users          # User management list
PATCH  /api/admin/users/:id      # Update user role / status
GET    /api/admin/submissions    # All submissions overview
GET    /api/admin/problems       # Problem management
POST   /api/admin/problems       # Create problem
PATCH  /api/admin/problems/:id   # Update problem metadata
```

### Contests

```http
GET    /api/contests             # List contests
GET    /api/contests/:id         # Contest details + problems
POST   /api/contests/:id/join    # Register participation  [Bearer]
```

### Leaderboard

```http
GET    /api/leaderboard          # Global leaderboard
GET    /api/leaderboard/:contestId  # Contest-specific rankings
```

### Health

```http
GET    /health                   # Gateway health (DB + Redis)
GET    /api/execute              # Worker health endpoint
```

---

## 🛡 Security Model

KodeChirp treats every code submission as **untrusted input** and implements defense-in-depth across multiple layers.

### Sandbox Isolation (Per Execution)

| Control | Implementation |
| :--- | :--- |
| **Non-root execution** | All code runs as unprivileged `runner` user |
| **Network disabled** | `--network=none` — no inbound or outbound connections |
| **Read-only filesystem** | Container FS mounted read-only |
| **Capability dropping** | `--cap-drop=ALL` — every Linux capability removed |
| **Memory limits** | Configurable ceiling (default 256 MB) |
| **CPU limits** | Restricted CPU shares to prevent resource starvation |
| **PID limits** | `--pids-limit` prevents fork bombs |
| **Execution timeout** | Hard timeout enforced by worker (default 10s) |
| **Ephemeral storage** | Unique `/tmp` mount per execution, wiped after |
| **Docker Socket Proxy** | Worker accesses Docker via scoped proxy (no admin APIs) |

### Application Security

| Control | Implementation |
| :--- | :--- |
| **JWT authentication** | Short-lived access tokens + rotating refresh tokens |
| **Refresh token families** | Compromise detection → full family revocation |
| **Password hashing** | bcryptjs with configurable salt rounds |
| **Rate limiting** | Nginx zone-based (20 req/s API, 3 req/s auth) |
| **Input validation** | express-validator on all gateway routes |
| **CORS enforcement** | Allowlisted origins, credentials enabled |
| **Security headers** | Helmet.js (X-Frame-Options, CSP, HSTS, XSS) |
| **Audit logging** | Rate-limit violations tracked in PostgreSQL |

---

## ⚡ Key Features

### Execution Engine
- 🔄 **Async Pipeline** — BullMQ queues decouple submission intake from execution
- 🐳 **Docker Sandboxing** — Hardened Alpine containers with strict resource limits
- ⚙️ **Dual Judge Modes** — `STDIN_STDOUT` and `FUNCTION` (auto-wrapper generation from `signature_metadata`)
- 🌐 **5 Languages** — C, C++, Python 3, Node.js 20, Java 21
- 📊 **Per-Test-Case Metrics** — Runtime, memory, exit code, stdout/stderr preview

### Real-Time Updates
- 📡 **Redis Pub/Sub** — Workers publish results to channels; gateway relays to clients
- 🔄 **Resilient Polling** — Frontend polls REST endpoint as a reliable fallback

### Admin Console
- 🛡️ **RBAC** — `user`, `moderator`, `admin` roles with route-level enforcement
- 🚦 **Problem Lifecycle** — `Draft → Review → Published → Archived` states
- 🧠 **AI Normalization Pipeline** — Auto-generates and validates test cases against reference solutions
- 📥 **LeetCode Ingestion** — Built-in pipelines to import and normalize external problem sets

### Community
- 🐦 **Chirps** — Peer explanations with upvoting (the social layer)
- 🏆 **Contests** — Rated contests with penalty time and live leaderboards

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in production values:

```bash
cp .env.example .env
```

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `POSTGRES_PASSWORD` | postgres | `kodechirp_dev` | Database password |
| `DATABASE_URL` | gateway, worker | — | Full PostgreSQL connection string |
| `REDIS_URL` | gateway, worker | `redis://redis:6379` | Redis connection string |
| `JWT_SECRET` | gateway | ⚠️ change me | Access token signing key (32+ chars) |
| `JWT_REFRESH_SECRET` | gateway | ⚠️ change me | Refresh token signing key (32+ chars) |
| `FRONTEND_URL` | gateway | `http://localhost:3000` | CORS allowed origin |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` | API base URL for browser |
| `NEXT_PUBLIC_WS_URL` | frontend | `ws://localhost:4000` | WebSocket server URL |
| `WORKER_CONCURRENCY` | worker | `4` | Parallel job processing slots |
| `EXECUTION_TIMEOUT` | worker | `10` | Max execution time in seconds |
| `MAX_RETRIES` | worker | `3` | Job retry attempts on failure |
| `NODE_ENV` | gateway | `development` | `production` disables verbose logs |

> **⚠️ Production:** Always generate strong random values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. Never commit your `.env` file.

---

## 🗺 Roadmap

### In Progress
- [ ] Distributed worker deployment across multiple hosts
- [ ] Contest mode with live standings and timed submissions

### Planned
- [ ] Kubernetes manifests + Helm charts
- [ ] Prometheus + Grafana monitoring stack integration
- [ ] Execution analytics dashboard (runtime distributions, language stats)
- [ ] AI-assisted debugging ("Explain My Mistake" via LLM API)
- [ ] Plagiarism detection (MOSS / token-based similarity)
- [ ] GitHub OAuth + social login
- [ ] Problem difficulty voting (community-rated)
- [ ] Discussion threads on Chirps
- [ ] Horizontal auto-scaling based on queue depth
- [ ] Service mesh with mutual TLS between gateway and workers
- [ ] CDN-backed static asset delivery

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run tests: `cd gateway && npm test`
4. Commit: `git commit -m 'feat: your feature description'`
5. Push and open a Pull Request

---

<div align="center">

**Built with ♥ by [Ritam](https://github.com/ritam4735)**

*KodeChirp — Where developers learn together.*

</div>
