<div align="center">

# 🐦 KodeChirp

### Production-Grade Distributed Code Execution Platform

A scalable online judge built with a hybrid microservices architecture — featuring async execution pipelines, Docker-sandboxed code isolation, Redis-backed job queues, and real-time WebSocket updates.

[![Node.js](https://img.shields.io/badge/Gateway-Node.js_20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/Workers-FastAPI_0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Redis](https://img.shields.io/badge/Queue-Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Sandbox-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)


</div>

---

## 📋 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Real-Time Execution Flow](#-real-time-execution-flow)
- [Security Model](#-security-model)
- [API Reference](#-api-reference)
- [Infrastructure & DevOps](#-infrastructure--devops)
- [Roadmap](#-roadmap)

---

## 🏗 Architecture Overview

KodeChirp follows a **gateway-worker architecture** — separating API routing, authentication, and real-time delivery (Node.js) from compute-heavy code execution (Python/FastAPI). Redis serves as the async message broker between the two layers.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NGINX REVERSE PROXY                           │
│                    SSL · Rate Limiting · Load Balancing                 │
└────────────────┬──────────────────────┬────────────────────┬────────────┘
                 │                      │                    │
          /api/* │               /socket.io/*          /* (static)
                 ▼                      ▼                    ▼
┌─────────────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│   NODE.JS API GATEWAY   │  │   SOCKET.IO      │  │   NEXT.JS 16       │
│                         │  │   WebSocket Hub  │  │   React Frontend   │
│  • Express 4            │  │                  │  │                    │
│  • JWT Auth + RBAC      │  │  • Real-time     │  │  • Monaco Editor   │
│  • Request Validation   │  │    updates       │  │  • Zustand State   │
│  • BullMQ Producer      │  │  • Submission    │  │  • Tailwind CSS    │
│  • Rate Limiting        │  │    tracking      │  └────────────────────┘
│  • Structured Logging   │  │  • Per-user      │
│                         │  │    channels      │
└────────┬────────────────┘  └────────▲─────────┘
         │                            │
         │  Enqueue Job               │  Publish Result
         ▼                            │
┌─────────────────────────────────────┴──────────────────────────────────┐
│                         REDIS 7 (Alpine)                               │
│                                                                        │
│   BullMQ Job Queue          Pub/Sub Events          Session Cache      │
│   ┌─────────────┐          ┌──────────────┐        ┌──────────────┐    │
│   │ submissions │   ───>   │ result:*     │        │ rate-limits  │    │
│   │ (FIFO)      │          │ channels     │        │ tokens       │    │
│   └─────────────┘          └──────────────┘        └──────────────┘    │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
                    Poll / BRPOP │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FASTAPI EXECUTION WORKERS                          │
│                                                                        │
│   • Async queue consumer (configurable concurrency)                    │
│   • Docker SDK integration for sandbox orchestration                   │
│   • Per-test-case evaluation with metrics collection                   │
│   • Result publishing to Redis Pub/Sub                                 │
│   • Health checks + Prometheus-compatible metrics endpoint             │
│                                                                        │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │              DOCKER SANDBOX CONTAINERS                          │  │
│   │                                                                 │  │
│   │   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │  │
│   │   │   C    │  │  C++   │  │ Python │  │ Node   │  │  Java  │    │  │
│   │   │ (GCC)  │  │ (G++)  │  │   3    │  │  20    │  │  21    │    │  │
│   │   └────────┘  └────────┘  └────────┘  └────────┘  └────────┘    │  │
│   │                                                                 │  │
│   │   • Non-root execution    • Read-only filesystem                │  │
│   │   • Network disabled      • Memory + CPU + PID limits           │  │
│   │   • Capabilities dropped  • Ephemeral tmpfs per execution       │  │
│   └─────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL 16 (Alpine)                          │
│                                                                        │
│   Users · Problems · Test Cases · Submissions · Execution Metrics      │
│   Chirps · Contests · Leaderboards · Refresh Tokens · Audit Logs       │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Role |
| :--- | :--- |
| **API Gateway** | Authentication, routing, request validation, job dispatch, WebSocket management |
| **FastAPI Workers** | Queue consumption, Docker/Podman sandbox orchestration, test case evaluation, result publishing |
| **Redis** | BullMQ job queue, Pub/Sub event bus, rate-limit counters, session cache |
| **Docker/Podman Sandboxes** | Isolated, ephemeral containers for untrusted code execution |
| **Nginx** | Reverse proxy, SSL termination, rate limiting, WebSocket upgrade handling |
| **PostgreSQL** | Persistent storage — users, problems, submissions, metrics, contests |

---

## ⚡ Key Features

### Execution Pipeline
- 🔄 **Async Execution Pipeline** — Submissions are queued via BullMQ and processed by independent FastAPI workers
- 🐳 **Docker/Podman Sandboxing** — Every execution runs in a hardened, ephemeral Alpine container with strict resource limits
- 🌐 **Multi-Language Support** — C, C++, Python 3, Node.js, and Java with dedicated sandbox images
- 📊 **Per-Test-Case Metrics** — Runtime, memory, exit code, and output tracked for each test case

### Submission Tracking
- 🔄 **Reliable Polling Mechanism** — Frontend actively polls the database via API for resilient, synchronous-style execution tracking
- 📡 **Redis Pub/Sub Backend** — Workers publish results to Redis channels, processed by the gateway to update database state reliably

### Admin & Platform Management
- 🛡️ **Role-Based Admin Console** — A dedicated, secure dashboard for platform management with advanced analytics and user control
- 🚦 **Multi-State Problem Lifecycle** — Robust granular problem publishing system (`Draft`, `Review`, `Published`, `Archived`)
- 📥 **LeetCode Dataset Integration** — Built-in automated ingestion pipelines to import and format external algorithmic problem sets

### Authentication & Security
- 🔐 **JWT Authentication** — Access + refresh token rotation with secure httpOnly cookies
- 👥 **Role-Based Access Control** — `user`, `admin`, `moderator` roles with route-level enforcement
- 🛡️ **Rate Limiting** — Nginx-level + application-level rate limiting with violation auditing

### Frontend & UI/UX
- 🎨 **Dark Fantasy Cyber Aesthetic** — Premium glassmorphism design with backdrop blurs, dynamic mesh gradients, and polished modern typography.
- 💻 **Professional IDE Workspace** — Integrated `react-resizable-panels` for a true VS Code / LeetCode style split-pane coding environment.
- 🎛️ **Resizable & Persistent Layouts** — Drag-and-drop horizontal and vertical panel boundaries with automatic local storage state persistence.
- 📱 **Responsive Degradation** — Multi-pane desktop workspace gracefully collapses into an optimized tabbed experience on mobile devices.

### Platform
- 🏆 **Contest Infrastructure** — Rated contests with scoring, penalty time, and live leaderboards
- 🐦 **Chirps** — Community-driven peer explanations with upvoting (the social layer)
- 📈 **Execution Analytics** — Detailed metrics for every submission and test case execution
- 🧩 **Scalable Workers** — Horizontally scale execution workers via Docker Compose replicas

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16, React, Tailwind CSS, Zustand | App Router SSR, state management, responsive UI |
| **Code Editor** | Monaco Editor | VS Code-grade in-browser editing experience |
| **API Gateway** | Node.js 20, Express 4, Helmet | Request routing, auth, validation, middleware |
| **Job Queue** | BullMQ 5, Redis 7 | Async submission dispatch, FIFO processing |
| **Workers** | Python 3.12, FastAPI, Uvicorn | Async queue consumption, Docker orchestration |
| **Sandboxing** | Docker Engine, Alpine Linux | Isolated, resource-limited code execution |
| **Database** | PostgreSQL 16, pgcrypto | UUID primary keys, relational schema, triggers |
| **Realtime** | Socket.IO 4, Redis Pub/Sub | Bidirectional WebSocket + event broadcasting |
| **Auth** | JWT, bcryptjs, cookie-parser | Token rotation, password hashing, RBAC |
| **Proxy** | Nginx | Reverse proxy, rate limiting, WebSocket upgrade |
| **Logging** | Pino (Node.js), python-json-logger | Structured JSON logging across services |
| **Infra** | Docker Compose, shell scripts | Single-command orchestration, health checks |

---

## 📁 Project Structure

```
kodechirp/
│
├── frontend/                   # Next.js 16 React Frontend
│   ├── app/                    # App Router pages and layouts
│   ├── components/             # Reusable UI components and editor
│   ├── hooks/                  # Custom React hooks (useAuth, useEditor)
│   ├── lib/                    # API clients, socket connections
│   ├── store/                  # Zustand global state
│   └── styles/                 # Tailwind global CSS
│
├── gateway/                    # Node.js API Gateway (Express + Socket.IO)
│   ├── src/
│   │   ├── config/             # App config, database pool, Redis client
│   │   ├── controllers/        # Route handlers (auth, problems, submissions)
│   │   ├── middleware/         # JWT auth, rate limiter, error handler, logger
│   │   ├── models/             # Database query models
│   │   ├── queue/              # BullMQ producer + Redis Pub/Sub event listener
│   │   ├── routes/             # Express routers (auth, problems, contests, health)
│   │   ├── services/           # Business logic layer
│   │   ├── utils/              # Logger (Pino), helpers
│   │   ├── websocket/          # Socket.IO initialization + event handlers
│   │   └── server.js           # HTTP server + graceful shutdown
│   ├── tests/                  # Jest + Supertest integration tests
│   └── Dockerfile              # Gateway container image
│
├── workers/                    # Python FastAPI Execution Workers
│   ├── src/
│   │   ├── api/                # Health check + metrics endpoints
│   │   ├── models/             # Pydantic request/response schemas
│   │   ├── services/           # Redis, PostgreSQL, Docker SDK services
│   │   ├── utils/              # Logger, constants, language configs
│   │   ├── worker/             # Queue consumer + test case evaluator
│   │   ├── config.py           # Pydantic settings (env-driven)
│   │   └── main.py             # FastAPI app + lifespan management
│   ├── tests/                  # Worker test suite
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Worker container image
│
├── sandboxes/                  # Docker Sandbox Images (per language)
│   ├── c/                      # GCC Alpine sandbox
│   ├── cpp/                    # G++ Alpine sandbox
│   ├── python/                 # Python 3 Alpine sandbox
│   ├── node/                   # Node.js Alpine sandbox
│   └── java/                   # OpenJDK 21 Alpine sandbox
│
├── nginx/                      # Reverse Proxy Configuration
│   └── nginx.conf              # Rate limiting zones, WebSocket proxy, security headers
│
├── database/                   # Database Layer
│   ├── schema.sql              # Production schema (12+ tables, indexes, triggers)
│   ├── migrations/             # Incremental migration scripts
│   └── seeds/                  # Development seed data
│
├── scripts/                    # DevOps & Automation
│   ├── dev-setup.sh            # One-command local environment setup
│   ├── build-sandboxes.sh      # Build all Docker sandbox images
│   ├── init-db.sh              # Database initialization + seeding
│   └── health-check.sh         # Service health verification
│
├── monitoring/                 # Observability
│   └── grafana/                # Grafana dashboard configurations
│
├── backend/                    # Legacy monolithic Node.js backend (Deprecated)
│   ├── controllers/            # Legacy route controllers
│   ├── executors/              # Legacy code execution logic
│   ├── models/                 # Legacy database models
│   ├── routes/                 # Legacy express routes
│   └── server.js               # Legacy server entrypoint
│
├── docker/                     # Legacy sandbox configurations (Deprecated)
│
├── docker-compose.yml          # Full-stack orchestration (5 services)
├── .env.example                # Environment variable template
└── package.json                # Root scripts (dev, build, setup, health)
```

---

## 🚀 Getting Started

### Prerequisites

- Docker Engine 24+ & Docker Compose v2
- Node.js 20+ and npm
- Python 3.11+ and pip
- Git

### Quick Start (Docker Compose)

The fastest way to run the full stack:

```bash
# 1. Clone the repository
git clone https://github.com/ritam4735/kodechirp.git
cd kodechirp

# 2. Configure environment
cp .env.example .env
# Edit .env with your secrets (JWT keys, DB password, etc.)

# 3. Build sandbox images
npm run build:sandboxes

# 4. Launch the entire stack
npm run dev
# → PostgreSQL  :5432
# → Redis       :6379
# → Gateway     :4000
# → Worker      :8000
# → Frontend    :3000
```

### Local Development (Without Docker Compose)

For rapid iteration on individual services:

```bash
# ── Terminal 1: Redis ──────────────────────────────
redis-server

# ── Terminal 2: PostgreSQL ─────────────────────────
# Ensure PostgreSQL is running, then:
npm run init:db

# ── Terminal 3: API Gateway ────────────────────────
npm run dev:gateway

# ── Terminal 4: FastAPI Worker ─────────────────────
npm run dev:worker

# ── Terminal 5: Frontend ───────────────────────────
npm run dev:frontend
```

### Building Sandbox Images

Each supported language has a dedicated, hardened Docker image:

```bash
npm run build:sandboxes
# Builds: kodechirp-c-sandbox, kodechirp-cpp-sandbox,
#         kodechirp-python-sandbox, kodechirp-node-sandbox,
#         kodechirp-java-sandbox
```

### Health Check

Verify all services are operational:

```bash
npm run health
```

---

## 🔁 Execution Flow

The submission pipeline is fully asynchronous, and the frontend polls for updates:

```
 Client                Gateway              Redis               Worker            Docker/Podman
   │                     │                    │                    │                    │
   │  POST /submit       │                    │                    │                    │
   ├────────────────────>│                    │                    │                    │
   │                     │  Validate + Store  │                    │                    │
   │                     │  (PostgreSQL)      │                    │                    │
   │                     │                    │                    │                    │
   │                     │  BullMQ.add()      │                    │                    │
   │                     ├───────────────────>│                    │                    │
   │                     │                    │                    │                    │
   │  { submissionId,    │                    │                    │                    │
   │    status: queued } │                    │                    │                    │
   │<────────────────────┤                    │                    │                    │
   │                     │                    │  BRPOP (dequeue)   │                    │
   │                     │                    │<───────────────────┤                    │
   │  GET /poll          │                    │                    │                    │
   ├────────────────────>│  PUB processing    │                    │                    │
   │<────────────────────┤<───────────────────┤                    │                    │
   │  { status:          │                    │                    │  docker.run()      │
   │    processing }     │                    │                    ├───────────────────>│
   │                     │                    │                    │                    │
   │                     │                    │                    │   {stdout, stderr, │
   │                     │                    │                    │   exitCode, time } │
   │  GET /poll          │                    │                    │<───────────────────┤
   ├────────────────────>│  PUB completed     │                    │                    │
   │<────────────────────┤<───────────────────┤                    │                    │
   │  { status:          │                    │                    │                    │
   │    accepted }       │                    │                    │                    │
```

### Status Lifecycle

| Status | Description |
| :--- | :--- |
| `queued` | Submission stored in DB, job added to BullMQ |
| `processing` | Worker dequeued the job, execution starting |
| `running` | Code is executing inside Docker sandbox |
| `accepted` | All test cases passed |
| `wrong_answer` | Output mismatch on one or more test cases |
| `time_limit_exceeded` | Execution exceeded the configured timeout |
| `runtime_error` | Non-zero exit code or crash during execution |
| `compilation_error` | Failed to compile (C/C++/Java) |

---

## 🛡 Security Model

KodeChirp treats every code submission as **untrusted input**. The security architecture implements defense-in-depth across multiple layers:

### Container Isolation

| Control | Implementation |
| :--- | :--- |
| **Non-root execution** | All code runs as an unprivileged `runner` user inside the container |
| **Network disabled** | `--network=none` — no inbound or outbound connections |
| **Read-only filesystem** | Container filesystem is mounted read-only |
| **Capability dropping** | `--cap-drop=ALL` removes every Linux capability |
| **Memory limits** | Configurable per-container memory ceiling (default 256MB) |
| **CPU limits** | Restricted CPU shares to prevent resource starvation |
| **PID limits** | `--pids-limit` prevents fork bombs |
| **Execution timeout** | Hard timeout enforced by the worker (default 10s) |
| **Ephemeral storage** | Unique tmpfs mounted per execution, securely wiped after |

### Application-Level Security

| Control | Implementation |
| :--- | :--- |
| **JWT authentication** | Short-lived access tokens + rotating refresh tokens |
| **Password hashing** | bcryptjs with configurable salt rounds |
| **Rate limiting** | Nginx zone-based limiting (20 req/s API, 3 req/s auth) |
| **Input validation** | express-validator on all gateway routes |
| **CORS enforcement** | Allowlisted origins only, credentials enabled |
| **Security headers** | Helmet.js (X-Frame-Options, CSP, XSS Protection) |
| **Audit logging** | Rate-limit violations tracked in PostgreSQL |
| **Refresh token families** | Rotation detection — compromised family revocation |

---

## 📡 API Reference

### Authentication

```http
POST /api/auth/signup       # Register → { accessToken, refreshToken, user }
POST /api/auth/login        # Login    → { accessToken, refreshToken, user }
POST /api/auth/refresh      # Rotate   → { accessToken, refreshToken }
POST /api/auth/logout       # Revoke refresh token family
GET  /api/auth/me           # Current user profile (Bearer required)
```

### Problems

```http
GET  /api/problems              # List all problems (paginated)
GET  /api/problems/:id          # Problem detail + sample test cases
```

### Submissions

```http
POST /api/submissions/run       # Synchronous code execution (Run button)
POST /api/submissions/submit    # Async judge submission (Submit button)
GET  /api/submissions/user      # User's submission history (Bearer required)
```

### Contests

```http
GET  /api/contests              # List contests
GET  /api/contests/:id          # Contest details + problems
```

### Leaderboard

```http
GET  /api/leaderboard           # Global leaderboard
GET  /api/leaderboard/:contestId # Contest-specific rankings
```

### Health

```http
GET  /health                    # Gateway health (DB + Redis connectivity)
GET  /api/execute               # Worker health (root endpoint)
```

---

## 🏗 Infrastructure & DevOps

### Docker Compose Services

```yaml
services:
  postgres       # PostgreSQL 16 Alpine — persistent data volume, health checks
  redis          # Redis 7 Alpine — AOF persistence, LRU eviction, 256MB limit
  gateway        # Node.js API Gateway — port 4000, depends on postgres + redis
  worker         # FastAPI Worker — Docker socket mount, resource limits (2 CPU, 1GB)
  frontend       # Next.js 16 — port 3000, depends on gateway
```

### Scaling Workers

```bash
# Scale to 4 worker instances
docker compose up -d --scale worker=4
```

### Networking

All services communicate over an internal `kodechirp-net` bridge network. Only the gateway (`:4000`), frontend (`:3000`), and database (`:5432`) expose ports externally.

### Environment Configuration

See [`.env.example`](.env.example) for the full configuration reference. Key variables:

| Variable | Service | Description |
| :--- | :--- | :--- |
| `POSTGRES_PASSWORD` | PostgreSQL | Database password |
| `JWT_SECRET` | Gateway | Access token signing key |
| `JWT_REFRESH_SECRET` | Gateway | Refresh token signing key |
| `REDIS_URL` | Gateway, Worker | Redis connection string |
| `WORKER_CONCURRENCY` | Worker | Parallel job processing slots |
| `EXECUTION_TIMEOUT` | Worker | Max execution time in seconds |
| `FRONTEND_URL` | Gateway | CORS allowed origin |

---

## 🗺 Roadmap

### In Progress
- [ ] Distributed worker deployment across multiple hosts
- [ ] Contest mode with live standings and timed submissions

### Planned
- [ ] Kubernetes manifests + Helm charts for production deployment
- [ ] Execution analytics dashboard (runtime distributions, language stats)
- [ ] Prometheus + Grafana monitoring stack
- [ ] Plagiarism detection (MOSS / token-based similarity)
- [ ] AI-assisted debugging ("Explain My Mistake" via LLM API)
- [ ] GitHub OAuth + social login
- [ ] Problem difficulty voting (community-rated)
- [ ] Discussion threads on Chirps
- [ ] Horizontal auto-scaling based on queue depth

### Architecture Goals
- [ ] Service mesh with mutual TLS between gateway and workers
- [ ] Event sourcing for submission lifecycle audit trail
- [ ] CDN-backed static asset delivery
- [ ] Multi-region Redis replication for low-latency WebSocket delivery

---

<div align="center">

**Built with ♥ by [Ritam](https://github.com/ritam4735)**

*KodeChirp — Where developers learn together.*

</div>
