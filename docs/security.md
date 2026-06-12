# 🛡 Security Design

> Sandbox controls, threat model, Docker hardening, JWT security, and rate limiting.

[← Back to README](../README.md)

---

## Threat Model

KodeChirp executes **arbitrary user code** — the single highest-risk operation in the platform. The security model is designed around the assumption that every submission is malicious.

### Attack Vectors

| Vector | Risk | Mitigation |
| :--- | :--- | :--- |
| Code execution escape | Critical | Docker isolation, `--cap-drop=ALL`, read-only FS |
| Network exfiltration | High | `--network=none` on all sandbox containers |
| Resource exhaustion | High | Memory limits, CPU limits, PID limits, timeouts |
| Fork bombs | High | `--pids-limit` prevents process multiplication |
| File system tampering | Medium | Read-only FS, ephemeral `/tmp` per execution |
| JWT token theft | Medium | Short-lived access tokens, refresh token families |
| Brute force auth | Medium | Rate limiting (3 req/s on auth endpoints) |
| API abuse | Medium | Rate limiting (20 req/s on API endpoints) |
| XSS / injection | Medium | Helmet.js headers, input validation, CSP |

---

## Sandbox Isolation

Every code execution creates an ephemeral Docker container with the following hardening:

### Container Security Profile

```python
container = docker_client.containers.run(
    image=f"kodechirp-{language}-sandbox",
    
    # ── Network isolation ──
    network_mode="none",           # Zero connectivity
    
    # ── Capability dropping ──
    cap_drop=["ALL"],              # Remove every Linux capability
    
    # ── Filesystem ──
    read_only=True,                # Container FS is immutable
    tmpfs={"/tmp": "size=64m"},    # Writable scratch space (capped)
    
    # ── User isolation ──
    user="runner",                 # Non-root (UID 1000)
    
    # ── Resource limits ──
    mem_limit="256m",              # Memory ceiling
    memswap_limit="256m",          # No swap
    cpu_quota=100000,              # CPU time limit
    pids_limit=64,                 # Process count cap
    
    # ── Security options ──
    security_opt=["no-new-privileges:true"],
    
    # ── Lifecycle ──
    auto_remove=False,             # Worker manages cleanup
    detach=True,
)
```

### Docker Socket Proxy

Workers never access the Docker socket directly. Instead, they connect through a **scoped proxy** ([tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)) that only allows:

| Permission | Enabled | Purpose |
| :--- | :--- | :--- |
| `CONTAINERS` | ✅ | Create, start, wait, remove sandbox containers |
| `IMAGES` | ✅ | List available sandbox images |
| `POST` | ✅ | Required for container creation |
| `AUTH` | ❌ | No Docker registry access |
| `BUILD` | ❌ | No image building |
| `EXEC` | ❌ | No exec into running containers |
| `NETWORKS` | ❌ | No network management |
| `VOLUMES` | ❌ | No volume management |
| `SYSTEM` | ❌ | No system-level operations |

### Sandbox Images

Each language has a dedicated Alpine-based Docker image:

| Image | Base | Compiler/Runtime | User |
| :--- | :--- | :--- | :--- |
| `kodechirp-c-sandbox` | Alpine | GCC 13 | `runner` (UID 1000) |
| `kodechirp-cpp-sandbox` | Alpine | G++ 13 | `runner` (UID 1000) |
| `kodechirp-python-sandbox` | Alpine | Python 3.12 | `runner` (UID 1000) |
| `kodechirp-node-sandbox` | Alpine | Node.js 20 | `runner` (UID 1000) |
| `kodechirp-java-sandbox` | Alpine | OpenJDK 21 | `runner` (UID 1000) |

---

## JWT Security

### Token Architecture

```
┌─────────────────────────────────────────────┐
│  Access Token (short-lived)                 │
│  ─────────────────────────                  │
│  Lifetime: 15 minutes                       │
│  Payload: { userId, role, iat, exp }        │
│  Storage: httpOnly cookie or Bearer header  │
│  Purpose: Request authentication            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  Refresh Token (long-lived)                 │
│  ─────────────────────────                  │
│  Lifetime: 7 days                           │
│  Storage: httpOnly cookie                   │
│  Database: Hashed in refresh_tokens table   │
│  Purpose: Obtain new access tokens          │
└─────────────────────────────────────────────┘
```

### Refresh Token Families

KodeChirp implements **refresh token rotation with family-based compromise detection**:

1. Each login creates a new token family (`family_id`)
2. Each refresh rotates both access and refresh tokens
3. The old refresh token is marked as used (not deleted)
4. If a **used** token is presented again → **the entire family is revoked**
5. This detects token theft: attacker and victim can't both use the same chain

### Password Security

- Passwords hashed with **bcryptjs** (configurable salt rounds)
- Password reset uses hashed tokens with configurable expiry
- Reset tokens are single-use and time-limited

---

## Rate Limiting

### Nginx Layer (First Line of Defense)

```nginx
# Rate limit zones
limit_req_zone $binary_remote_addr zone=api:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/s;
limit_req_zone $binary_remote_addr zone=submit:10m rate=5r/s;

# Applied per location
location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
}

location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

### Application Layer (Audit)

Rate limit violations are logged to PostgreSQL for security auditing:

```sql
CREATE TABLE rate_limit_violations (
    id UUID PRIMARY KEY,
    user_id UUID,
    ip_address INET,
    endpoint VARCHAR(255),
    violation_count INTEGER,
    created_at TIMESTAMPTZ
);
```

---

## Security Headers

Helmet.js applies the following headers on all gateway responses:

| Header | Value | Purpose |
| :--- | :--- | :--- |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Strict-Transport-Security` | `max-age=31536000` | Forces HTTPS |
| `Content-Security-Policy` | Restrictive policy | Prevents XSS, injection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer leaks |

---

## CORS Configuration

```javascript
const corsOptions = {
    origin: process.env.FRONTEND_URL,  // Allowlisted origin only
    credentials: true,                  // Required for httpOnly cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
```

---

## Input Validation

All gateway routes use **express-validator** for request validation:

- Body parameters are validated for type, length, and format
- SQL injection prevented via parameterized queries (no raw SQL)
- Path parameters validated as UUIDs where applicable

---

[← Database Design](./database.md) · [Deployment Guide →](./deployment.md)
