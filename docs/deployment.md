# 🚀 Deployment Guide

> Docker Compose setup, local development, environment variables, scaling, and production configuration.

[← Back to README](../README.md)

---

## Quick Start — Docker Compose

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

| Service | URL | Notes |
| :--- | :--- | :--- |
| Frontend | http://localhost:3000 | Next.js with hot-reload |
| API Gateway | http://localhost:4000 | Express with volume-mounted src |
| PostgreSQL | localhost:5433 | Mapped to non-standard port |
| Redis | localhost:6380 | Mapped to non-standard port |
| Worker (health) | http://localhost:8000 | FastAPI health endpoint |

---

## Local Development (Without Docker Compose)

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

---

## Building Sandbox Images

The sandbox images must be built before running any code execution:

```bash
npm run build:sandboxes
```

This builds 5 hardened Alpine-based images:

| Image | Base | Size |
| :--- | :--- | :--- |
| `kodechirp-c-sandbox` | Alpine + GCC 13 | ~120 MB |
| `kodechirp-cpp-sandbox` | Alpine + G++ 13 | ~120 MB |
| `kodechirp-python-sandbox` | Alpine + Python 3.12 | ~60 MB |
| `kodechirp-node-sandbox` | Alpine + Node.js 20 | ~80 MB |
| `kodechirp-java-sandbox` | Alpine + OpenJDK 21 | ~200 MB |

---

## Health Check

```bash
npm run health
# Verifies: DB connectivity, Redis ping, Worker API, all sandbox images
```

---

## Docker Compose Services

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

### Service Details

| Service | Image | Resources | Notes |
| :--- | :--- | :--- | :--- |
| `postgres` | `postgres:16-alpine` | Default | Persistent volume, health-checked |
| `redis` | `redis:7-alpine` | 256 MB cap | AOF persistence, noeviction policy |
| `gateway` | Custom (Node 20) | Default | Hot-reload via volume mount |
| `worker` | Custom (Python 3.12) | 2 CPU / 1 GB | Scalable via `--scale worker=N` |
| `docker-proxy` | `tecnativa/docker-socket-proxy` | — | Scoped Docker API access |
| `frontend` | Custom (Next.js) | Default | Volume-mounted for hot-reload |

---

## Scaling Workers

```bash
# Scale to 4 parallel worker instances
docker compose up -d --scale worker=4
```

Each worker instance:
- Runs independently with its own BullMQ consumer
- Processes `WORKER_CONCURRENCY` jobs in parallel (default: 4)
- So 4 workers × 4 concurrency = 16 parallel executions
- Workers are stateless — no coordination needed

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Database

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `POSTGRES_PASSWORD` | postgres | `kodechirp_dev` | Database password |
| `DATABASE_URL` | gateway, worker | — | Full PostgreSQL connection string |

### Redis

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `REDIS_URL` | gateway, worker | `redis://redis:6379` | Redis connection string |

### Authentication

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | gateway | ⚠️ change me | Access token signing key (32+ chars) |
| `JWT_REFRESH_SECRET` | gateway | ⚠️ change me | Refresh token signing key (32+ chars) |

### Gateway

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | gateway | `development` | `production` disables verbose logs |
| `PORT` | gateway | `4000` | Gateway HTTP port |
| `FRONTEND_URL` | gateway | `http://localhost:3000` | CORS allowed origin |

### Worker

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `WORKER_CONCURRENCY` | worker | `4` | Parallel job processing slots |
| `EXECUTION_TIMEOUT` | worker | `10` | Max execution time in seconds |
| `MAX_RETRIES` | worker | `3` | Job retry attempts on failure |

### Frontend

| Variable | Service | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` | API base URL |
| `NEXT_PUBLIC_WS_URL` | frontend | `ws://localhost:4000` | WebSocket URL |

> **⚠️ Production:** Always generate strong random values for `JWT_SECRET` and `JWT_REFRESH_SECRET`. Never commit your `.env` file.

---

## Production Considerations

### Security Checklist

- [ ] Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (32+ random chars)
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Configure Nginx SSL termination
- [ ] Enable rate limiting in Nginx config
- [ ] Restrict `FRONTEND_URL` to production domain
- [ ] Verify all sandbox images are built and available
- [ ] Review Docker Socket Proxy permissions

### Recommended Resource Allocation

| Service | CPU | Memory | Replicas |
| :--- | :--- | :--- | :--- |
| Gateway | 1 core | 512 MB | 1-2 |
| Worker | 2 cores | 1 GB | 2-4 (per queue depth) |
| PostgreSQL | 2 cores | 1 GB | 1 (primary) |
| Redis | 0.5 cores | 256 MB | 1 |
| Frontend | 1 core | 512 MB | 1 |

---

[← Security Design](./security.md) · [API Reference →](./api-reference.md)
