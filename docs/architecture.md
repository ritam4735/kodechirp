# 🏗 Architecture Guide

> Detailed system design, component responsibilities, service interactions, and deployment topology for KodeChirp.

[← Back to README](../README.md)

---

## Overview

KodeChirp follows a **gateway-worker architecture** — a hybrid microservices pattern that separates concerns cleanly:

- **API Gateway** (Node.js) handles routing, authentication, real-time delivery, and job dispatch
- **Execution Workers** (Python/FastAPI) handle compute-heavy, security-sensitive code execution
- **Redis** serves as the async message broker between the two layers

This design enables **independent scaling** — you can scale workers horizontally without touching the gateway, and vice versa.

---

## Architecture Diagram

![KodeChirp System Architecture](./assets/architecture.png)

---

## Component Responsibilities

### Frontend — Next.js 16 + React

| Responsibility | Implementation |
| :--- | :--- |
| Problem rendering | Markdown + constraint display |
| Code editing | Monaco Editor (VS Code engine) with language-specific themes |
| Submission flow | POST to gateway → poll for results |
| Real-time updates | Socket.IO client with polling fallback |
| Admin console | RBAC-protected routes for problem management, analytics |
| State management | Zustand slices (auth, editor, submission) |
| Routing | Next.js App Router with `(main)/`, `admin/`, `auth/` groups |

### API Gateway — Node.js 20 + Express 4

| Responsibility | Implementation |
| :--- | :--- |
| Authentication | JWT access + refresh tokens, bcryptjs hashing |
| Request validation | express-validator on all routes |
| Job dispatch | BullMQ producer → Redis queue |
| Result relay | Redis Pub/Sub subscriber → Socket.IO emitter |
| Rate limiting | Nginx zone-based + in-app middleware |
| Health monitoring | `/health` endpoint (DB + Redis connectivity) |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options, XSS) |

### Execution Workers — Python 3.12 + FastAPI

| Responsibility | Implementation |
| :--- | :--- |
| Queue consumption | Async Redis BRPOP loop |
| Test case retrieval | PostgreSQL query for problem test cases |
| Wrapper generation | FUNCTION-mode: generate language-specific wrappers from `signature_metadata` |
| Docker orchestration | Docker SDK → create, start, wait, remove containers |
| Output evaluation | Compare stdout against expected output per test case |
| Metrics collection | Runtime, memory, exit code per test case |
| Result publishing | PostgreSQL update + Redis Pub/Sub publish |

### Redis 7

| Responsibility | Implementation |
| :--- | :--- |
| Job queue | BullMQ FIFO queue (`kodechirp-submissions`) |
| Event bus | Pub/Sub channels for submission status updates |
| Rate limiting | Counter-based rate limit state |

### PostgreSQL 16

| Responsibility | Implementation |
| :--- | :--- |
| Data persistence | 13-table schema with UUID PKs |
| JSONB storage | Tags, signature metadata, test case I/O |
| Indexing | B-tree + GIN indexes for JSONB queries |
| Triggers | Auto-update `updated_at` on mutation |

### Docker Sandboxes

| Responsibility | Implementation |
| :--- | :--- |
| Isolation | `--network=none`, `--cap-drop=ALL`, non-root user |
| Ephemeral execution | Unique `/tmp` mount per run, container removed after |
| Resource limits | Memory ceiling, CPU shares, PID limits, hard timeout |
| Language support | 5 Alpine-based images (C, C++, Python, Node.js, Java) |

---

## Service Interactions

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│  Next.js SSR → React SPA → Monaco Editor → Socket.IO Client │
└────────────────────────┬─────────────────────────────────────┘
                         │  HTTP + WebSocket
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                     API Gateway (Node.js)                     │
│  Express Routes → JWT Auth → BullMQ Producer → Socket.IO Hub │
└──────────┬──────────────┬─────────────────┬──────────────────┘
           │              │                 │
     ┌─────▼─────┐  ┌────▼────┐    ┌──────▼──────┐
     │ PostgreSQL │  │  Redis  │    │ Redis PubSub │
     │   (R/W)    │  │ (Queue) │    │  (Events)    │
     └─────┬──────┘  └────┬────┘    └──────┬──────┘
           │              │                 │
           │         ┌────▼────────────────▼───────┐
           └────────►│    Execution Worker (Python)  │
                     │  BRPOP → Docker SDK → Evaluate │
                     └───────────────┬─────────────────┘
                                     │
                              ┌──────▼──────┐
                              │   Docker     │
                              │  Sandbox     │
                              │ (ephemeral)  │
                              └─────────────┘
```

### Request Flow: Code Submission

1. **Client** → POST `/api/submissions/submit` with `{ code, language, problemId }`
2. **Gateway** validates JWT, stores submission in PostgreSQL (`status: queued`)
3. **Gateway** dispatches job via BullMQ (`kodechirp-submissions` queue)
4. **Worker** dequeues job via BRPOP, fetches test cases from PostgreSQL
5. **Worker** generates wrapper (FUNCTION mode) or uses raw code (STDIN mode)
6. **Worker** creates Docker container with hardened security profile
7. **Docker** executes code, returns stdout/stderr
8. **Worker** evaluates output against expected, records metrics
9. **Worker** updates PostgreSQL, publishes result to Redis Pub/Sub
10. **Gateway** receives Pub/Sub message, emits via Socket.IO
11. **Client** receives result via WebSocket (or polls REST fallback)

---

## Deployment Topology

### Development (Docker Compose)

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

### Production (Future: Kubernetes)

```
┌───────────────────────────────────────────────────────────────┐
│  Kubernetes Cluster                                           │
│                                                               │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐      │
│  │  Ingress  │─►│ Gateway Pods │─►│ Worker Pods (HPA)  │      │
│  │  (Nginx)  │  │ (replicas: 3)│  │ (min:2, max:10)    │      │
│  └──────────┘  └──────┬───────┘  └─────────┬──────────┘      │
│                        │                     │                 │
│              ┌─────────▼──────────┐  ┌──────▼──────┐          │
│              │ Redis (Sentinel)   │  │ PostgreSQL  │          │
│              │ + BullMQ           │  │ (Primary +  │          │
│              └────────────────────┘  │  Replicas)  │          │
│                                      └─────────────┘          │
└───────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### Why Gateway-Worker Split?

| Alternative | Trade-off | KodeChirp's Choice |
| :--- | :--- | :--- |
| Monolith | Simpler, but can't scale compute independently | ❌ |
| Full microservices | More flexible, but overengineered for current scale | ❌ |
| Gateway-Worker | Independent scaling of compute vs. API, minimal overhead | ✅ |

### Why Redis as Message Broker?

- Already needed for BullMQ job queue
- Pub/Sub provides real-time event relay without adding Kafka/RabbitMQ complexity
- Sub-millisecond latency for result delivery
- Single dependency serves queue + event bus + rate limiting

### Why Python Workers?

- Docker SDK (Python) is more mature than Node.js alternatives
- FastAPI provides async I/O for concurrent queue consumption
- Pydantic handles configuration management and validation
- Natural fit for the compute-heavy evaluation loop

---

[← Back to README](../README.md) · [Execution Pipeline →](./execution-pipeline.md)
