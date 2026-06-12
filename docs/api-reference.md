# 📡 API Reference

> Complete endpoint documentation for KodeChirp's REST API.

[← Back to README](../README.md)

---

## Base URL

```
Development: http://localhost:4000
Production:  https://api.kodechirp.dev
```

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header or an httpOnly cookie.

```http
Authorization: Bearer <access_token>
```

---

## Auth Routes

### Register

```http
POST /api/auth/signup
Content-Type: application/json

{
    "username": "developer1",
    "email": "dev@example.com",
    "password": "securePassword123"
}

# Response: 201 Created
{
    "message": "User created successfully",
    "user": {
        "id": "uuid",
        "username": "developer1",
        "email": "dev@example.com",
        "role": "user"
    }
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "dev@example.com",
    "password": "securePassword123"
}

# Response: 200 OK
# Sets httpOnly cookies: accessToken, refreshToken
{
    "user": { "id": "uuid", "username": "developer1", "role": "user" },
    "accessToken": "jwt..."
}
```

### Refresh Token

```http
POST /api/auth/refresh
# Uses httpOnly refreshToken cookie

# Response: 200 OK
# Rotates both access and refresh tokens
{
    "accessToken": "new-jwt..."
}
```

### Logout

```http
POST /api/auth/logout
# Revokes refresh token family

# Response: 200 OK
{ "message": "Logged out successfully" }
```

### Current User Profile

```http
GET /api/auth/me
Authorization: Bearer <token>

# Response: 200 OK
{
    "id": "uuid",
    "username": "developer1",
    "email": "dev@example.com",
    "role": "user",
    "rating": 1200
}
```

### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "dev@example.com" }

# Response: 200 OK
{ "message": "Password reset email sent" }
```

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
    "token": "reset-token",
    "password": "newSecurePassword456"
}

# Response: 200 OK
{ "message": "Password reset successfully" }
```

---

## Problem Routes

### List Problems

```http
GET /api/problems
GET /api/problems?difficulty=Easy&page=1&limit=20

# Response: 200 OK
{
    "problems": [
        {
            "id": "uuid",
            "slug": "two-sum",
            "title": "Two Sum",
            "difficulty": "Easy",
            "tags": ["array", "hash-table"],
            "acceptance_rate": 45.2,
            "total_submissions": 1250
        }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

### Get Problem Detail

```http
GET /api/problems/:id

# Response: 200 OK
{
    "id": "uuid",
    "slug": "two-sum",
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "Easy",
    "time_limit_ms": 2000,
    "memory_limit_mb": 256,
    "judge_mode": "FUNCTION",
    "signature_metadata": {
        "function_name": "twoSum",
        "return_type": "array<integer>",
        "parameters": [...]
    },
    "sample_test_cases": [
        {
            "input": "{\"nums\": [2,7,11,15], \"target\": 9}",
            "expected_output": "[0, 1]",
            "is_sample": true
        }
    ]
}
```

### Get Problem Template

```http
GET /api/problems/:id/templates/:lang

# Response: 200 OK
{
    "language": "python",
    "starter_code": "def twoSum(nums, target):\n    # Write your solution here\n    pass"
}
```

---

## Submission Routes

### Run Code (Synchronous)

```http
POST /api/submissions/run
Authorization: Bearer <token>
Content-Type: application/json

{
    "problemId": "uuid",
    "language": "python",
    "code": "def twoSum(nums, target):\n    ..."
}

# Response: 200 OK
{
    "submissionId": "uuid",
    "status": "queued"
}
```

### Submit Code (Full Judge)

```http
POST /api/submissions/submit
Authorization: Bearer <token>
Content-Type: application/json

{
    "problemId": "uuid",
    "language": "python",
    "code": "def twoSum(nums, target):\n    ..."
}

# Response: 200 OK
{
    "submissionId": "uuid",
    "status": "queued"
}
```

### Get Submission Detail

```http
GET /api/submissions/:id
Authorization: Bearer <token>

# Response: 200 OK
{
    "id": "uuid",
    "status": "accepted",
    "language": "python",
    "runtime_ms": 45,
    "memory_kb": 12800,
    "test_cases_passed": 60,
    "test_cases_total": 60,
    "judge_mode": "FUNCTION",
    "queued_at": "2026-06-12T10:00:00Z",
    "started_at": "2026-06-12T10:00:01Z",
    "completed_at": "2026-06-12T10:00:03Z"
}
```

### User Submission History

```http
GET /api/submissions/user
GET /api/submissions/user?problemId=uuid&page=1
Authorization: Bearer <token>

# Response: 200 OK
{
    "submissions": [...],
    "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

---

## Admin Routes

> All admin routes require `role: admin` in the JWT payload.

### List Users

```http
GET /api/admin/users
Authorization: Bearer <admin-token>

# Response: 200 OK
{
    "users": [
        {
            "id": "uuid",
            "username": "developer1",
            "email": "dev@example.com",
            "role": "user",
            "is_active": true,
            "created_at": "2026-06-01T00:00:00Z"
        }
    ]
}
```

### Update User

```http
PATCH /api/admin/users/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "role": "moderator" }

# Response: 200 OK
{ "message": "User updated", "user": { ... } }
```

### List All Submissions

```http
GET /api/admin/submissions
Authorization: Bearer <admin-token>
```

### Problem Management

```http
GET    /api/admin/problems           # List all problems (including drafts)
POST   /api/admin/problems           # Create new problem
PATCH  /api/admin/problems/:id       # Update problem metadata
```

### Create Problem

```http
POST /api/admin/problems
Authorization: Bearer <admin-token>
Content-Type: application/json

{
    "title": "Two Sum",
    "description": "Given an array of integers...",
    "difficulty": "Easy",
    "judge_mode": "FUNCTION",
    "signature_metadata": {
        "function_name": "twoSum",
        "return_type": "array<integer>",
        "parameters": [
            { "name": "nums", "type": "array<integer>" },
            { "name": "target", "type": "integer" }
        ]
    },
    "time_limit_ms": 2000,
    "memory_limit_mb": 256,
    "tags": ["array", "hash-table"]
}
```

---

## Contest Routes

### List Contests

```http
GET /api/contests

# Response: 200 OK
{
    "contests": [
        {
            "id": "uuid",
            "title": "Weekly Contest #1",
            "slug": "weekly-1",
            "status": "upcoming",
            "starts_at": "2026-06-15T14:00:00Z",
            "ends_at": "2026-06-15T16:00:00Z",
            "is_rated": true
        }
    ]
}
```

### Get Contest Detail

```http
GET /api/contests/:id

# Response: 200 OK
{
    "id": "uuid",
    "title": "Weekly Contest #1",
    "problems": [
        { "id": "uuid", "title": "Two Sum", "points": 100, "order_index": 0 }
    ],
    "participant_count": 42
}
```

### Join Contest

```http
POST /api/contests/:id/join
Authorization: Bearer <token>

# Response: 200 OK
{ "message": "Joined contest successfully" }
```

---

## Leaderboard Routes

### Global Leaderboard

```http
GET /api/leaderboard

# Response: 200 OK
{
    "leaderboard": [
        { "rank": 1, "username": "developer1", "rating": 1850, "solved": 42 }
    ]
}
```

### Contest Leaderboard

```http
GET /api/leaderboard/:contestId

# Response: 200 OK
{
    "leaderboard": [
        { "rank": 1, "username": "developer1", "score": 300, "penalty_time": 45 }
    ]
}
```

---

## Health Routes

### Gateway Health

```http
GET /health

# Response: 200 OK
{
    "status": "healthy",
    "database": "connected",
    "redis": "connected",
    "uptime": 86400
}
```

### Worker Health

```http
GET /api/execute

# Response: 200 OK
{
    "status": "healthy",
    "queue_depth": 3,
    "active_jobs": 2
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
    "error": "Unauthorized",
    "message": "Invalid or expired token",
    "statusCode": 401
}
```

### Common Status Codes

| Code | Meaning |
| :--- | :--- |
| `200` | Success |
| `201` | Created |
| `400` | Bad Request (validation failed) |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

---

[← Deployment Guide](./deployment.md) · [Back to README →](../README.md)
