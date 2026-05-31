# 🐦 KodeChirp

**A collaborative developer social-learning ecosystem.**

KodeChirp is more than just a coding practice platform. It's a creator-friendly environment where developers learn socially through peer explanations ("Chirps"), collaborative problem-solving, and a thriving community. Because birds of a feather flock together.

---

## 💡 Why KodeChirp Exists

Most coding platforms focus entirely on the solitary act of solving problems. KodeChirp focuses on **collaborative learning**. 

We believe that developers learn faster when they learn together. Our goal is to make DSA and interview prep a social, creator-driven experience. Instead of just looking at accepted code, you learn the *why* and *how* through curated, community-driven insights.

---

## ✨ Cinematic UI & Custom Cursor

KodeChirp places a massive emphasis on a **premium, immersive user experience**. We've built an aesthetic that feels more like a living ecosystem than a sterile coding platform:

* **The Bird Cursor**: A fully custom, cinematic floating cursor built with a VP9 transparent WebM video. It features physics-driven momentum, velocity-based rotation, and subtle trailing particle effects powered by a custom requestAnimationFrame loop (zero React state thrashing).
* **Liquid Glass Cards**: Hovering over features on the landing page reveals deep glassmorphic interactions with specular sheens, reactive corner blooms, and magnetic depth.
* **Framer Motion Integration**: Smooth, spring-based transitions for page elements, floating CTA bubbles, and responsive UI components.
* **Ambient Glows**: Real-time CSS-driven animated backgrounds and glowing orbs that sit beneath the platform to provide a dynamic, futuristic feel.

---

## 🐦 The KodeChirp Ecosystem

Our platform embraces a unique community identity. Here is the terminology you'll see across the ecosystem:

| Platform Term | Meaning |
| :--- | :--- |
| **Bird** | Developer / User |
| **Chirp** | Peer explanation post (text + code snippet) |
| **Flight** | Short-form explanation video |
| **Flock** | Community / Group learning |
| **Nest** | Saved content |
| **Skyfeed** | Discovery / Trending feed |
| **Hatchling** | New learner |

---

## 🗂️ Project Structure

```text
kodechirp/
├── backend/                    # Node.js + Express API
│   ├── controllers/            # Route controllers
│   ├── db/                     # PostgreSQL connection pool & schema
│   ├── executors/              # Docker execution wrappers (C, C++, Node, Python)
│   ├── middleware/             # JWT auth middleware
│   ├── models/                 # Database models (User, Problem, Submission, Chirp)
│   ├── routes/                 # API endpoint routers
│   ├── scripts/                # Database seed scripts
│   ├── services/               # Business logic & CodeRunner
│   ├── utils/                  # Helper utilities
│   └── server.js               # Entry point
│
├── docker/                     # Hardened Execution Sandboxes
│   ├── c-sandbox/              # Minimal C executor
│   ├── cpp-sandbox/            # Minimal C++ executor
│   ├── node-sandbox/           # Node.js executor
│   ├── python-sandbox/         # Python 3 executor
│   └── scripts/                # Docker build/cleanup scripts
│
└── frontend/                   # Next.js 14 + Tailwind MVP
    ├── app/
    │   ├── auth/               # Sign in / Sign up
    │   ├── coming-soon/        # Feature placeholders
    │   ├── problems/           # Problem listing & workspace
    │   ├── profile/            # User profile
    │   └── questions/          # Community questions (Skyfeed)
    ├── components/             # React components (editor, ui, layout)
    ├── hooks/                  # Custom React hooks
    ├── lib/                    # API wrappers & helpers
    ├── store/                  # Zustand global state
    └── styles/                 # Global CSS & Tailwind config
```

---

## 🧭 User Flow

1. **Browse** coding problems in the discovery feed.
2. **Solve** problems directly in the browser-based editor.
3. **Run or Submit** your code against real test cases.
4. **Read** community Chirps to understand different approaches.
5. **Share** your own explanation and help Hatchlings.
6. **Learn** collaboratively with your Flock.

---

## 🧱 Requirements

Before you begin, ensure you have the following installed:

* Node.js 18+
* PostgreSQL 14+
* Python 3
* npm

---

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env          # Edit with your settings
npm install
npm run dev                   # Starts on http://localhost:4000
```

> **Database Required!** You MUST set `DATABASE_URL` in `.env` to use PostgreSQL.

### 2. PostgreSQL Setup

PostgreSQL is mandatory for the KodeChirp backend to function. To set up your local database and populate it with starter problems:

```bash
psql -U postgres -c "CREATE DATABASE kodechirp;"
cd backend
npm run seed
```

*Note: The `npm run seed` command creates the database schema, seeds starter problems, and prepares your local development environment.*

### 3. Docker Sandboxes

KodeChirp requires local Docker sandbox images to execute code. Build them before testing submissions:

```bash
cd docker
./scripts/build-all.sh
```

### 4. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # Starts on http://localhost:3000
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/kodechirp
JWT_SECRET=your-super-secret-key
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | **Required** |
| `JWT_SECRET` | Secret for signing tokens | `dev-secret` |

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:4000` |

---

## 🛡️ Hardened Docker Execution

KodeChirp uses a production-grade, hardened Docker sandbox architecture for executing untrusted user code.

**Supported languages:**
* JavaScript (Node.js)
* Python 3
* C (GCC)
* C++ (G++)

**Sandbox details:**
Our Docker-based executor dynamically provisions a minimal Alpine-based container for each submission. We defend against malicious code through multiple security layers:
* **Non-Root Execution:** Code runs as an unprivileged user inside the container.
* **Network Isolation:** `--network=none` prevents inbound/outbound requests.
* **Resource Constraints:** Strict limits on memory, CPU, and process count (pids-limit).
* **Capability Dropping:** All unnecessary root capabilities are dropped (`--cap-drop=ALL`).
* **Read-Only Filesystem:** Prevents modifications to the container environment.
* **Ephemeral Storage:** An isolated, temporary host directory is mounted per execution and securely wiped upon completion.

---

## 🗣️ Chirps — The Core Feature

Chirps are short peer explanations posted under each problem. They empower the community to share knowledge and discover trending approaches on the Skyfeed.

* **Text explanation** (required, 20–2000 chars)
* **Code snippet** (optional)
* **Approach tag**: hash-map, dp, greedy, stack, two-pointers, etc.
* **Upvote system** — logged-in Birds can upvote once per Chirp

**API:**
```http
GET  /api/chirps/:problemId?sort=helpful|recent
POST /api/chirps                    (requires auth)
POST /api/chirps/:chirpId/upvote    (requires auth, toggles)
```

---

## 🔮 Future Feature Placeholders

These are visible in the UI but disabled. Here's where each plugs in to the KodeChirp ecosystem:

| Feature | Location | Notes |
| :--- | :--- | :--- |
| 🧠 **Explain My Mistake** | `ConsolePanel.jsx` (submit result) | Add AI call after failed submission |
| 🗺️ **Personalized Roadmap** | `profile/page.jsx` | Add `/api/roadmap` endpoint |
| ⚔️ **Coding Battles** | `Navbar.jsx` | Add `/battles` route |
| 🎯 **Interview Prep** | `Navbar.jsx` | Add `/interview` route |
| 📊 **Tests (Institutes)** | `Navbar.jsx` | Add `/tests` route with roles |
| 🐙 **GitHub OAuth** | `auth/page.jsx` | Add NextAuth or Passport.js |

---

## 📡 API Reference

### Auth
Authentication uses JWT Bearer tokens, and passwords are encrypted via `bcryptjs`.
```http
POST /api/auth/signup   { username, email, password }  → { token, user }
POST /api/auth/login    { email, password }            → { token, user }
GET  /api/auth/me       (Bearer token)                 → { user }
```

### Problems
```http
GET /api/problems               → { problems: [...] }
GET /api/problems/:problemId    → { problem: { ...full, sample_test_cases } }
```

### Submissions
```http
POST /api/submissions/run       { code, language, stdin }           → { stdout, stderr, status, time }
POST /api/submissions/submit    { code, language, problemId }       → { status, runtime_ms, failed_test }
GET  /api/submissions/user      (Bearer token)                      → { submissions }
```

### Chirps
```http
GET  /api/chirps/:problemId?sort=helpful|recent                     → { chirps }
POST /api/chirps                { problemId, content, codeSnippet?, approachTag? } → { chirp }
POST /api/chirps/:chirpId/upvote (Bearer token, toggles)            → { upvoteCount, userUpvoted }
```

---

## 🛣️ Phase 2 Roadmap

* **AI-powered "Explain My Mistake"** via Claude API
* **Personalized learning roadmap** based on solved problems
* **Coding Battles** (1v1 real-time)
* **Interview Prep mode** with company tags
* **Institute test mode** with time limits and proctoring
* **GitHub OAuth**
* **Problem difficulty ratings** (community-voted)
* **Discussion threads** on Chirps

---

## 🧰 Tech Stack

| Layer | Tech |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS |
| **Animations**| Framer Motion, custom `requestAnimationFrame` physics |
| **Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL |
| **Auth** | JWT (`jsonwebtoken`, `bcryptjs`) |
| **Code Exec** | Hardened Docker Sandboxes |
| **Markdown** | `react-markdown` + `remark-gfm` |

---

## 🚀 Planned Deployment Stack

* **Frontend:** Vercel
* **Backend:** Railway or Render
* **Database:** Neon PostgreSQL
