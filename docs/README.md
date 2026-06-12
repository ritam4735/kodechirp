# 📖 KodeChirp Documentation

> Technical documentation for the KodeChirp distributed online judge platform.

[← Back to README](../README.md)

---

## Documentation Index

| Document | Description |
| :--- | :--- |
| [🏗 Architecture Guide](./architecture.md) | System design, component responsibilities, service interactions, deployment topology |
| [🔁 Execution Pipeline](./execution-pipeline.md) | Queue lifecycle, worker processing, judge modes, wrapper generation, result publishing |
| [🗄 Database Design](./database.md) | Full 13-table schema, relationships, constraints, index strategy, migration patterns |
| [🛡 Security Design](./security.md) | Sandbox controls, threat model, Docker hardening, JWT mechanics, rate limiting |
| [🚀 Deployment Guide](./deployment.md) | Docker Compose setup, local dev, environment variables, scaling, production config |
| [📡 API Reference](./api-reference.md) | Complete REST endpoint documentation with request/response examples |

---

## Quick Navigation

### For Contributors

1. Start with the [Architecture Guide](./architecture.md) to understand the system
2. Review the [Execution Pipeline](./execution-pipeline.md) for the core engine
3. Check the [Database Design](./database.md) for schema details
4. Follow the [Deployment Guide](./deployment.md) to set up locally

### For Security Reviewers

1. Read the [Security Design](./security.md) for the full threat model
2. Review sandbox isolation in [Execution Pipeline](./execution-pipeline.md)

### For API Consumers

1. Check the [API Reference](./api-reference.md) for endpoints
2. Review auth flow in [Security Design](./security.md)

---

## Assets

- Architecture diagram: [`docs/assets/architecture.png`](./assets/architecture.png)
- Database schema: [`docs/assets/db-schema.png`](./assets/db-schema.png)
- Screenshots: [`docs/assets/screenshots/`](./assets/screenshots/)

---

[← Back to README](../README.md)
