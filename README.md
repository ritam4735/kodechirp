# 🐦 KodeChirp — Phase 1 (MVP)

A peer-learning coding platform where you solve problems and share explanations ("Chirps") with others.

---

## 🗂️ Project Structure

```
kodechirp/
├── backend/                    # Node.js + Express API
│   ├── db/
│   │   ├── index.js            # PostgreSQL connection
│   │   ├── schema.sql          # Full DB schema + seed data
│   │   └── mockData.js         # In-memory mock data
│   ├── middleware/
│   │   └── auth.js             # JWT auth middleware
│   ├── routes/
│   │   ├── auth.js             # POST /signup, /login, GET /me
│   │   ├── problems.js         # GET /problems, GET /problems/:slug
│   │   ├── submissions.js      # POST /run, POST /submit, GET /user
│   │   └── chirps.js           # GET /:problemId, POST /, POST /:id/upvote
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
    ├── lib/                    # API mock, constants & helpers
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

## 🚀 Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env          # Edit with your settings
npm install
npm run dev                   # Starts on http://localhost:4000
```

> **No database?** The backend uses in-memory mock data by default.
> Set `DATABASE_URL` in `.env` to use real PostgreSQL.

### 2. Database (optional)

```bash
psql -U postgres -c "CREATE DATABASE kodechirp;"
psql -U postgres -d kodechirp -f db/schema.sql
```

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

| Variable          | Description                        | Default            |
|-------------------|------------------------------------|--------------------|
| `PORT`            | API server port                    | `4000`             |
| `DATABASE_URL`    | PostgreSQL connection string       | (mock if unset)    |
| `JWT_SECRET`      | Secret for signing tokens          | `dev-secret`       |
| `JUDGE0_API_URL`  | Judge0 endpoint                    | `https://judge0-ce.p.rapidapi.com` |
| `JUDGE0_API_KEY`  | RapidAPI key for Judge0            | (mock if unset)    |

### Frontend (`frontend/.env.local`)

| Variable               | Description          | Default                    |
|------------------------|----------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`  | Backend API base URL | `http://localhost:4000`    |

---

## 🔌 Judge0 Integration

1. Sign up at [RapidAPI Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Copy your API key into `JUDGE0_API_KEY` in `.env`
3. That's it — submissions will now run against real test cases

Without an API key, the app uses **mock execution** (returns simulated results).

---

## 🗣️ Chirps — The Core Feature

Chirps are short peer explanations posted under each problem:
- **Text explanation** (required, 20–2000 chars)
- **Code snippet** (optional)
- **Approach tag**: hash-map, dp, greedy, stack, two-pointers, etc.
- **Upvote system** — logged-in users can upvote once per chirp

**API:**
```
GET  /api/chirps/:problemId?sort=helpful|recent
POST /api/chirps                    (requires auth)
POST /api/chirps/:chirpId/upvote    (requires auth, toggles)
```

---

## 🔮 Future Feature Placeholders

These are visible in the UI but disabled. Here's where each plugs in:

| Feature                | Location                         | Notes                              |
|------------------------|----------------------------------|------------------------------------|
| 🧠 Explain My Mistake  | `ConsolePanel.jsx` (submit result) | Add AI call after failed submission |
| 🗺️ Personalized Roadmap | `profile/page.jsx`              | Add `/api/roadmap` endpoint        |
| ⚔️ Coding Battles       | `Navbar.jsx`                     | Add `/battles` route               |
| 🎯 Interview Prep       | `Navbar.jsx`                     | Add `/interview` route             |
| 📊 Tests (Institutes)   | `Navbar.jsx`                     | Add `/tests` route with roles      |
| 🐙 GitHub OAuth         | `auth/page.jsx`                  | Add NextAuth or Passport.js        |

---

## 📡 API Reference

### Auth
```
POST /api/auth/signup   { username, email, password }  → { token, user }
POST /api/auth/login    { email, password }            → { token, user }
GET  /api/auth/me       (Bearer token)                 → { user }
```

### Problems
```
GET /api/problems               → { problems: [...] }
GET /api/problems/:slug         → { problem: { ...full, sample_test_cases } }
```

### Submissions
```
POST /api/submissions/run       { code, language, stdin }           → { stdout, stderr, status, time }
POST /api/submissions/submit    { code, language, problem_id }      → { status, runtime_ms, failed_test }
GET  /api/submissions/user      (Bearer token)                      → { submissions }
```

### Chirps
```
GET  /api/chirps/:problemId?sort=helpful|recent  → { chirps }
POST /api/chirps                { problem_id, content, code_snippet?, approach_tag? } → { chirp }
POST /api/chirps/:id/upvote     (Bearer token, toggles)             → { upvote_count, user_upvoted }
```

---

## 🛣️ Phase 2 Roadmap

- AI-powered "Explain My Mistake" via Claude API
- Personalized learning roadmap based on solved problems
- Coding Battles (1v1 real-time)
- Interview Prep mode with company tags
- Institute test mode with time limits and proctoring
- GitHub OAuth
- Problem difficulty ratings (community-voted)
- Discussion threads on Chirps

---

## 🧰 Tech Stack

| Layer       | Tech                              |
|-------------|-----------------------------------|
| Frontend    | Next.js 14 (App Router), Tailwind CSS |
| Editor      | Monaco Editor (`@monaco-editor/react`) |
| Backend     | Node.js, Express                  |
| Database    | PostgreSQL (mock-compatible)      |
| Auth        | JWT (`jsonwebtoken`, `bcryptjs`)  |
| Code Exec   | Judge0 API (mock fallback)        |
| Markdown    | `react-markdown` + `remark-gfm`  |
