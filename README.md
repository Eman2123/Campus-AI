<div align="center">

<img src="frontend/public/campus-ai-logo.png" alt="Campus AI logo" width="96" />

# 🎓 Campus AI

**Your multi-agent AI study buddy — chat, documents, deadlines and reminders in one place.**

[![CI](https://github.com/Eman2123/Campus-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/Eman2123/Campus-AI/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-agents-1C3C3C)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## 📖 Table of contents

- [What is Campus AI?](#-what-is-campus-ai)
- [Features](#-features)
- [The agents](#-the-agents)
- [Architecture](#-architecture)
- [Tech stack](#-tech-stack)
- [Project structure](#-project-structure)
- [Quick start](#-quick-start)
- [Environment variables](#-environment-variables)
- [Database & migrations](#-database--migrations)
- [API reference](#-api-reference)
- [Testing](#-testing)
- [CI](#-continuous-integration)
- [Docker & deployment](#-docker--deployment)
- [Security & error handling](#-security--error-handling)
- [Known limitations](#-known-limitations)
- [Roadmap](#-roadmap)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## ✨ What is Campus AI?

Students juggle notes, PDFs, deadlines and a hundred questions a day. **Campus AI** brings that together: you chat with an AI that *routes each message to the right specialist agent* (quiz, flashcards, homework help, document Q&A, planning…), upload your own study material so answers are grounded in it, and let it turn deadlines into study sessions on a calendar with email reminders.

It is a full-stack project: a **FastAPI + LangGraph** backend and a **Next.js 14** frontend, backed by **PostgreSQL + pgvector**.

---

## 🚀 Features

### 💬 Chat
- Supervisor that classifies every message and routes it to one of **8 specialist agents**
- Streaming replies over Server-Sent Events (chunked delivery)
- Assistant answers rendered as **Markdown** (lists, bold, code, tables)
- Persistent conversations: history sidebar, resume any chat, **delete one chat** or **clear all history**
- Conversation memory via a **PostgreSQL-backed LangGraph checkpointer** (survives restarts; checkpoints are cleaned up when you delete chats or your account)
- **Voice input**: record audio, it is transcribed (AssemblyAI) and answered like a normal message

### 📄 Documents (RAG)
- Upload **PDF, DOCX, TXT, MD** (up to 20 MB), validated by size *and* real file content
- Text is extracted, chunked, embedded and stored in **pgvector**
- The Document agent answers from *your* files, with a relevance cut-off so unrelated questions don't get made-up answers
- **File Organizer**: each upload is auto-classified by subject and (optionally) filed into Google Drive
- Per-document delete (removes the file, Drive copy and embeddings)

### 🗓️ Planner & calendar
- Tell the Planner a deadline ("plan my Chemistry final on 2026-12-01") and it saves the deadline plus study sessions
- Calendar page with **month and week views**
- **`.ics` export** to Google/Apple/Outlook calendar
- **Deadline reminders** and a **daily digest** by email (APScheduler), also triggerable on demand ("Remind me now")

### 🔐 Accounts
- Email + password sign-up/sign-in, **Continue with Google**
- Forgot / reset password flow (single-use, expiring link)
- "Remember me" (30-day token) vs. session-only sign-in
- Auto sign-out with a friendly notice when your session expires
- Per-user **preferences** (theme, week start, typewriter effect, voice, reduced motion, …) saved to your account
- **Delete account** (removes chats, documents, schedule and data)

### 🛠️ Admin panel (`/admin`)
- Overview, **users** (enable/disable), **agent analytics** (calls, latency, success rate), **connector status** (email, Drive, voice, LLM), admin settings
- Role-based: admins are bootstrapped from the `ADMIN_EMAILS` list

### 🎨 UI/UX
- Landing page, **home dashboard**, chat, documents, calendar, settings
- **Dark / light / system theme**
- Mobile-friendly: chats/documents drawer, Docs/Plan bottom sheet, mobile nav
- Custom 404 and error pages, empty states, loading states

---

## 🤖 The agents

Every message goes through the **Supervisor**, which picks one intent (LLM classifier when `AIML_API_KEY` is set, keyword fallback otherwise) and routes to a node of the LangGraph graph:

| Intent | Agent | What it does |
|---|---|---|
| `research` | Research | Explains topics and answers general questions |
| `homework` | Homework | Step-by-step help with problems |
| `quiz` | Quiz | Generates practice questions |
| `notes` | Notes | Summarises / structures notes |
| `flashcard` | Flashcard | Builds flashcards |
| `feedback` | Feedback | Grades and critiques your answers |
| `document` | Document | RAG over your uploaded files (optionally scoped to a subject) |
| `planner` | Planner | Parses a deadline, saves it + study sessions, cross-references your documents |

> Without an LLM key the app still runs: agents return stub replies and routing falls back to keywords, which is handy for development and tests.

---

## 🏗️ Architecture

```text
                 ┌─────────────────────┐
                 │      Next.js UI     │
                 │ React + Tailwind    │
                 └──────────┬──────────┘
                            │  HTTPS / SSE  (JWT bearer)
                            ▼
                 ┌─────────────────────┐
                 │     FastAPI API     │
                 │ auth · chat · docs  │
                 │ schedule · voice    │
                 │ sessions · admin    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  LangGraph graph    │
                 │ Supervisor → Agent  │
                 └──────────┬──────────┘
        ┌───────────────────┼────────────────────┐
        ▼                   ▼                    ▼
  PostgreSQL            LLM provider        External services
  + pgvector            (OpenAI-compatible) AssemblyAI · Resend ·
  (data, vectors,       timeout + retries   Google Drive · LangSmith
  LangGraph state)
```

**Request flow for a chat message:** auth → rate limit → Supervisor classifies intent → routed agent runs (may query pgvector / write the schedule) → reply is streamed back → the turn is saved to the database in a separate session so a persistence hiccup never breaks a reply that already succeeded.

---

## 🧰 Tech stack

**Backend** — Python 3.12 · FastAPI · LangGraph · SQLAlchemy 2 (async) · Alembic · PostgreSQL · pgvector · asyncpg / psycopg · Pydantic v2 · JWT (python-jose) · passlib/bcrypt · APScheduler · PyPDF · python-docx · AssemblyAI · Resend · Google Drive API · LangSmith (optional)

**Frontend** — Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · react-markdown + remark-gfm · lucide-react · ESLint

**Tooling** — pytest · GitHub Actions · Docker

---

## 📁 Project structure

```text
Campus-AI/
├── .github/workflows/ci.yml     # CI: frontend (tsc, lint, build) + backend (migrate, pytest)
├── backend/
│   ├── app/
│   │   ├── agents/              # Supervisor, 8 agents, graph, shared state
│   │   ├── api/
│   │   │   ├── deps.py          # auth dependencies
│   │   │   └── routes/          # auth, agent, voice, documents, schedule, sessions, admin, health
│   │   ├── core/                # config, database, security, LLM client, RAG pipeline,
│   │   │                        # checkpointer, scheduler, reminders, digest, email,
│   │   │                        # file organizer, Google Drive/Auth, rate limiting, storage
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── main.py              # FastAPI app, middleware, error handlers
│   ├── migrations/              # Alembic migrations
│   ├── tests/                   # pytest suite
│   ├── Dockerfile
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── app/                     # Routes: landing, signin/signup, reset flows,
│   │                            # dashboard (home/chat/calendar/settings), admin/*, 404, error
│   ├── components/              # auth, dashboard, admin, landing, pixel UI kit
│   ├── lib/                     # API client, auth/token helpers, theme, dashboard API
│   ├── .env.example
│   └── package.json
├── LICENSE
└── README.md
```

---

## ⚡ Quick start

### Prerequisites
- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL 15+ with the `pgvector` extension** (a free [Neon](https://neon.tech) database works, or run it locally — see below)
- An OpenAI-compatible API key (e.g. [AIML API](https://aimlapi.com)) — *optional for development*

### 1) Clone
```bash
git clone https://github.com/Eman2123/Campus-AI.git
cd Campus-AI
```

### 2) Database (local option via Docker)
```bash
docker run -d --name campus-pg -p 5432:5432 \
  -e POSTGRES_USER=campus -e POSTGRES_PASSWORD=campus -e POSTGRES_DB=campus \
  pgvector/pgvector:pg16
```
Then use `DATABASE_URL=postgresql+asyncpg://campus:campus@localhost:5432/campus`.

### 3) Backend
```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

python -m pip install -r requirements.txt
cp .env.example .env            # Windows: Copy-Item .env.example .env
# edit .env: at least DATABASE_URL and JWT_SECRET_KEY

alembic upgrade head            # create the tables
uvicorn app.main:app --reload
```
- API: <http://127.0.0.1:8000>
- Interactive docs (Swagger): <http://127.0.0.1:8000/docs>

> Use `-r requirements.txt` — `pip install requirements.txt` tries to install a package with that literal name.

### 4) Frontend
```bash
cd frontend
npm install
cp .env.example .env.local      # Windows: Copy-Item .env.example .env.local
npm run dev
```
App: <http://localhost:3000>

### 5) Make yourself an admin (optional)
Put your email in `ADMIN_EMAILS` in `backend/.env`, e.g. `ADMIN_EMAILS=["you@example.com"]`, sign up with that email and open `/admin`.

---

## 🔧 Environment variables

Templates: [`backend/.env.example`](backend/.env.example) and [`frontend/.env.example`](frontend/.env.example). **Never commit real keys.**

### Backend (`backend/.env`)

| Variable | Required | Default | Purpose |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | – | `postgresql+asyncpg://user:pass@host/db` (add `?ssl=require` for Neon) |
| `JWT_SECRET_KEY` | ✅ | – | Long random string used to sign tokens |
| `ENV` | | `development` | Environment name |
| `CORS_ORIGINS` | | `["http://localhost:3000"]` | Allowed frontend origins (JSON list) |
| `ADMIN_EMAILS` | | `[]` | Emails that become admins |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | | `1440` | Normal token lifetime (24 h) |
| `REMEMBER_ME_EXPIRE_DAYS` | | `30` | Lifetime when "Remember me" is ticked |
| `FRONTEND_URL` | | `http://localhost:3000` | Used to build password-reset links |
| `PASSWORD_RESET_EXPIRE_MINUTES` | | `30` | Reset link validity |
| `GOOGLE_CLIENT_ID` | | – | Enables "Continue with Google" |
| `AIML_API_KEY` | | – | LLM + embeddings key. **Without it, agents return stubs** |
| `AIML_API_BASE_URL` | | `https://api.aimlapi.com/v1` | Any OpenAI-compatible endpoint |
| `AIML_MODEL` | | `gpt-4o-mini` | Chat model |
| `AIML_EMBEDDING_MODEL` | | `text-embedding-3-small` | Embedding model |
| `EMBEDDING_DIM` | | `1536` | Must match the embedding model/column |
| `LLM_TIMEOUT_SECONDS` | | `45` | Per-request LLM timeout |
| `LLM_MAX_RETRIES` | | `2` | Automatic retries on transient LLM errors |
| `CHUNK_SIZE_WORDS` / `CHUNK_OVERLAP_WORDS` / `MIN_CHUNK_WORDS` | | `300` / `50` / `40` | Document chunking |
| `DOCUMENT_RETRIEVAL_TOP_K` | | `5` | Chunks retrieved per question |
| `DOCUMENT_MAX_COSINE_DISTANCE` | | `0.9` | Relevance cut-off for RAG |
| `UPLOAD_DIR` | | `./uploads` | Where uploaded files are stored |
| `ASSEMBLYAI_API_KEY` | | – | Voice transcription |
| `RESEND_API_KEY` / `EMAIL_FROM` | | – | Email delivery (logged instead of sent when empty) |
| `REMINDER_LEAD_TIME_HOURS` / `REMINDER_CHECK_HOUR_UTC` | | `48` / `13` | Deadline reminders |
| `DIGEST_LOOKAHEAD_DAYS` / `DIGEST_CHECK_HOUR_UTC` | | `7` / `8` | Daily digest |
| `GOOGLE_SERVICE_ACCOUNT_FILE` / `GOOGLE_DRIVE_ROOT_FOLDER_NAME` | | – / `Campus AI` | Drive filing (stubbed when empty) |
| `STREAM_CHUNK_WORDS` / `STREAM_CHUNK_DELAY_MS` | | `3` / `40` | Streaming feel |
| `REDIS_URL` | | `redis://localhost:6379/0` | Reserved; not required today |
| `LANGCHAIN_TRACING_V2` / `LANGCHAIN_API_KEY` / `LANGCHAIN_PROJECT` | | `false` / – / `campus-ai` | Optional LangSmith tracing |

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend URL |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | – | Same value as backend `GOOGLE_CLIENT_ID`; button hidden if empty |

> 💡 Every external integration (LLM, voice, email, Drive) **degrades gracefully** when its key is missing, so you can run the whole app with just a database.

---

## 🗄️ Database & migrations

Alembic manages the schema (users, sessions, messages, documents, document chunks with pgvector, schedules, password-reset tokens, agent call logs, user preferences).

```bash
cd backend
alembic upgrade head                                   # apply migrations
alembic revision --autogenerate -m "describe change"   # after model changes
```

> ⚠️ **Deploying an update?** Run `alembic upgrade head` against the production database **before** starting the new backend version, otherwise new columns (e.g. `users.preferences`) won't exist.

---

## 🔌 API reference

All routes are under `/api`. Authenticated routes need `Authorization: Bearer <token>`. Full interactive docs live at `/docs`.

| Area | Method & path | Description |
|---|---|---|
| **Auth** | `POST /auth/signup` · `/auth/signin` · `/auth/google` | Create account / sign in |
| | `POST /auth/forgot-password` · `/auth/reset-password` | Password reset flow |
| | `GET/PATCH /auth/me` | Profile |
| | `GET/PATCH /auth/me/preferences` | Saved UI/behaviour preferences |
| | `DELETE /auth/me` | Delete account (requires email confirmation) |
| **Chat** | `POST /chat` | One-shot reply |
| | `POST /chat/stream` | SSE stream (`token`, `done`, `error` events) |
| | `POST /voice/chat` | Audio → transcript → reply |
| **Sessions** | `GET /sessions?limit&offset` | Conversation list |
| | `GET /sessions/{id}/messages` | Messages of one chat |
| | `DELETE /sessions/{id}` · `DELETE /sessions` | Delete one / all chats |
| **Documents** | `POST /documents/upload` | Upload (PDF, DOCX, TXT, MD ≤ 20 MB) |
| | `GET /documents?limit&offset` | List documents |
| | `DELETE /documents/{id}` | Delete document + embeddings |
| **Schedule** | `GET /schedule` | Deadlines and study sessions |
| | `GET /schedule/export.ics` | Calendar export |
| | `POST /schedule/remind-me` · `/schedule/digest-me` | Send reminder / digest now |
| **Admin** | `GET /admin/ping` · `/admin/users` | Admin-only |
| | `GET /admin/analytics/agents` · `/admin/connectors/status` | Usage and integration health |
| | `POST /admin/users/{id}/disable` · `/enable` | Manage users |
| **Health** | `GET /health` · `/health/db` · `/health/ready` | Liveness, DB check, readiness (+ active checkpointer) |

**Error format:** failures return `{"detail": "..."}`. LLM provider problems map to `504` (timeout), `503` (provider busy) or `502` (provider unavailable) without leaking provider details; rate limits return `429`; oversized uploads `413`; invalid files `422`.

---

## 🧪 Testing

```bash
cd backend
pytest -q
```

- The suite runs against a **real PostgreSQL + pgvector** database (point `DATABASE_URL` at a **throw-away database** — tests create users and documents).
- It does **not** need an LLM key: where behaviour depends on intent classification, the tests pin the intent; embeddings are mocked where relevant.
- Handy variants:
  ```bash
  pytest -q tests/test_documents.py      # one file
  pytest -q -k "pagination"              # by name
  pytest -x                              # stop at first failure
  ```
- Covered areas: auth flows, account settings/deletion, admin, agents & routing, RAG pipeline & retrieval quality, document upload/limits/pagination, File Organizer, scheduler/digest/reminders, calendar export, rate limiting, chat history & streaming, checkpointer, error handling.

Frontend: type-check and lint (`npx tsc --noEmit`, `npm run lint`) run in CI. There are no automated browser/UI tests yet (see [Roadmap](#-roadmap)).

---

## 🔁 Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:

- **frontend:** `npm ci` → `tsc --noEmit` → `npm run lint` → `npm run build`
- **backend:** starts a `pgvector/pgvector:pg16` service → `alembic upgrade head` → `pytest -q`

---

## 🐳 Docker & deployment

A backend `Dockerfile` is included (it applies migrations, then starts Uvicorn on `$PORT`):

```bash
cd backend
docker build -t campus-ai-backend .
docker run --env-file .env -p 8000:8000 campus-ai-backend
```

Typical setup: **Neon** (Postgres + pgvector) · **Render** or any container host for the backend · **Vercel** for the frontend.

Deployment checklist:
1. Set all required env vars on the backend host (`DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS` = your frontend URL, `FRONTEND_URL`, API keys).
2. Set `NEXT_PUBLIC_API_BASE_URL` on the frontend host to the backend URL.
3. Run `alembic upgrade head` (the Docker image does this on start).
4. Check `GET /api/health/ready` — `checkpointer` should be `AsyncPostgresSaver`. `MemorySaver` means chat memory won't survive restarts.
5. Run **a single backend worker** for now (the rate limiter is in-memory — see limitations).

Frontend production build:
```bash
cd frontend
npm run build
npm start
```

---

## 🛡️ Security & error handling

- Passwords hashed with bcrypt; JWT access tokens with expiry; single-use, expiring reset tokens
- Rate limiting on auth and chat/voice routes (per IP for auth, per user for chat)
- Input bounds on chat messages and session ids; upload size limit enforced while streaming the upload, plus file-content checks (PDF/DOCX signatures, text sanity)
- Per-user data isolation (someone else's chat/document returns `404`)
- Global error handlers: provider failures and unexpected errors return clean JSON; details go to server logs only
- Expired/invalid tokens on the frontend trigger automatic sign-out with a notice
- Secrets live in `.env` files and are git-ignored (`uploads/` and `secrets/` too)

---

## ⚠️ Known limitations

- **Streaming is chunked, not token-by-token.** Agents call the LLM SDK directly, so the full reply is generated first and then streamed in small chunks.
- **Rate limiter is in-memory** (per process). Use one worker, or swap it for Redis before scaling out.
- **Auth token is stored in the browser** (`localStorage`/`sessionStorage`) and there is no refresh token. An httpOnly-cookie setup would be more hardened.
- **No email verification** on sign-up yet.
- **Session list pagination** slices after loading; very large histories would need a DB-level aggregate query.
- No automated browser (UI) tests.
- Drive filing, email and voice are **stubbed** unless their credentials are configured.

---

## 🗺️ Roadmap

- [ ] True token-by-token streaming
- [ ] Source citations for document answers (show which file/chunk was used)
- [ ] Email verification
- [ ] httpOnly cookie sessions + refresh tokens
- [ ] Redis-backed rate limiting
- [ ] Playwright end-to-end tests
- [ ] In-app / push notifications
- [ ] Accessibility pass and Urdu localisation

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| Backend fails right after an update with a "column does not exist" error | Run `alembic upgrade head` |
| `pip install requirements.txt` fails | Use `pip install -r requirements.txt` |
| Signup returns "password cannot be longer than 72 bytes" | bcrypt version mismatch — keep `bcrypt==4.0.1` from `requirements.txt` |
| Browser says it can't reach the server | Check `NEXT_PUBLIC_API_BASE_URL` and that `CORS_ORIGINS` includes your frontend URL |
| Chat replies are placeholders like "[stub — no AIML_API_KEY set]" | Set `AIML_API_KEY` in `backend/.env` |
| Chat memory resets after restart | `GET /api/health/ready` shows `MemorySaver` → the Postgres checkpointer couldn't connect; check `DATABASE_URL` |
| Tests fail with connection errors | Start Postgres (with pgvector) and run `alembic upgrade head` on the test database |
| Reset-password emails never arrive | Without `RESEND_API_KEY` emails are only logged to the server console |

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE).

<div align="center">

Made with ☕ and way too many agents by **[Eman](https://github.com/Eman2123)**

</div>
