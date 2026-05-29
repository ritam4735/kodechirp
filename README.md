# 🐦 KodeChirp

**A collaborative developer social-learning ecosystem.**

KodeChirp is more than just a coding practice platform. It's a creator-friendly environment where developers learn socially through peer explanations ("Chirps"), collaborative problem-solving, and a thriving community. Because birds of a feather flock together.

---

## 💡 Why KodeChirp Exists

Most coding platforms focus entirely on the solitary act of solving problems. KodeChirp focuses on **collaborative learning**. 

We believe that developers learn faster when they learn together. Our goal is to make DSA and interview prep a social, creator-driven experience. Instead of just looking at accepted code, you learn the *why* and *how* through curated, community-driven insights.

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
│   ├── db/
│   │   ├── index.js            # PostgreSQL connection
│   │   └── schema.sql          # Full DB schema
│   ├── scripts/
│   │   └── seedDb.js           # Database seed script
│   ├── middleware/
│   │   └── auth.js             # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js             # POST /signup, /login, GET /me
│   │   ├── problems.js         # GET /problems, GET /problems/:slug
│   │   ├── submissions.js      # POST /run, POST /submit, GET /user
│   │   └── chirps.js           # GET /:problemId, POST /, POST /:chirpId/upvote
│   └── server.js               # Entry point
│
└── frontend/                   # Next.js 14 + Tailwind MVP
    ├── app/
    │   ├── layout.jsx          # Root layout + Providers
    │   ├── page.jsx            # Home: problem listing
    │   ├── auth/
    │   │   └── page.jsx        # Sign in / Sign up
    │   ├── problems/
    │   │   └── [id]/
    │   │       └── page.jsx    # Problem workspace (editor + console + chirps)
    │   └── profile/
    │       └── page.jsx        # User profile
    ├── components/
    │   ├── chirps/             # Peer explanations components
    │   │   ├── ChirpCard.jsx
    │   │   ├── ChirpInput.jsx
    │   │   └── ChirpsSection.jsx
    │   ├── editor/             # Monaco editor & execution components
    │   │   ├── CodeEditor.jsx
    │   │   ├── ConsolePanel.jsx
    │   │   ├── LanguageSelector.jsx
    │   │   ├── RunButton.jsx
    │   │   └── SubmitButton.jsx
    │   ├── layout/             # Global layout components
    │   │   ├── Navbar.jsx
    │   │   └── Sidebar.jsx
    │   ├── problem/            # Problem description & test cases
    │   │   ├── ProblemDescription.jsx
    │   │   └── TestCases.jsx
    │   └── ui/                 # Reusable UI components
    ├── hooks/                  # Custom React hooks
    │   ├── useAuth.js
    │   ├── useEditor.js
    │   └── useProblem.js
    ├── lib/                    # API wrappers, constants & helpers
    │   ├── api.js
    │   ├── constants.js
    │   └── helpers.js
    ├── store/                  # Zustand global state management
    │   ├── authStore.js
    │   ├── editorStore.js
    │   └── problemStore.js
    ├── styles/                 # Global styles + CSS variables
    │   └── globals.css
    ├── next.config.js
    ├── tailwind.config.js
    └── tsconfig.json
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

### 3. Frontend

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

## 🔌 Local Code Execution

KodeChirp uses a robust local execution environment via Node.js `child_process.spawn()`. Submissions run locally on the host machine.

**Supported execution languages (MVP):**
* JavaScript (Node.js)
* Python 3

**Sandbox details:**
Submissions execute with strict timeout and cleanup logic to prevent runaway processes. Ensure `node` and `python3` are accessible in the environment where the backend is running.

> ⚠️ **WARNING:** 
> Local code execution is intended ONLY for development. Running untrusted code directly on the host machine is NOT secure for production deployments.
> 
> Production-grade deployments should use isolated sandboxing solutions such as:
> * Docker containers
> * Firecracker microVMs
> * Judge0
> * gVisor

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
| **Editor** | Monaco Editor (`@monaco-editor/react`) |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL |
| **Auth** | JWT (`jsonwebtoken`, `bcryptjs`) |
| **Code Exec** | Local (`child_process.spawn`) |
| **Markdown** | `react-markdown` + `remark-gfm` |

---

## 🚀 Planned Deployment Stack

* **Frontend:** Vercel
* **Backend:** Railway or Render
* **Database:** Neon PostgreSQL
