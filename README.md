<div align="center">

<img src="frontend/public/campus-ai-logo.png" alt="Campus AI" width="90" />

# Campus AI

### Multi-Agent AI Study Assistant

Chat with specialist AI agents, ask questions about **your own documents**, and turn deadlines into a **study calendar** with email reminders.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![CI](https://img.shields.io/github/actions/workflow/status/Eman2123/Campus-AI/ci.yml?style=for-the-badge&label=CI)](https://github.com/Eman2123/Campus-AI/actions/workflows/ci.yml)

</div>

---

## Overview

**Campus AI** is a full-stack study assistant for students. Every message you send is classified by a **Supervisor** and routed to the right specialist agent (quiz, flashcards, homework help, notes, document Q&A, planning and more). You can upload your own PDFs, Word files and notes so answers are grounded in your material, and the Planner turns a deadline into saved study sessions that show up in a calendar and in reminder emails.

The platform also includes authentication (email and Google), voice input, persistent chat history, per-user preferences, and an admin dashboard with usage analytics.

## Core Features

| Feature | Description |
|---|---|
| **Multi-Agent Chat** | A Supervisor routes each message to one of 8 specialist agents, with streamed Markdown replies |
| **Document Q&A (RAG)** | Upload PDF, DOCX, TXT or MD; answers are retrieved from your files via pgvector |
| **Study Planner** | Give a deadline, get saved study sessions on a month/week calendar |
| **Reminders & Digest** | Deadline reminder emails and a daily digest, plus `.ics` calendar export |
| **File Organizer** | Uploads are auto-classified by subject and can be filed into Google Drive |
| **Voice** | Dictate (speech to text in the box) or Talk (agent answers out loud via ElevenLabs); Copy and Read aloud on every reply |
| **Authentication** | Email/password, Google sign-in, password reset, "remember me" |
| **Persistent Memory** | Chat history and LangGraph state stored in PostgreSQL; delete one chat or all of them |
| **Settings** | Dark/light/system theme, week start, typewriter effect, motion and voice preferences |
| **Admin Dashboard** | Users, agent analytics, connector status, enable/disable accounts |
| **REST API** | FastAPI backend with interactive docs at `/docs` |

## The Agents

| Intent | Agent | What it does |
|---|---|---|
| `research` | Research | Explains topics and answers general questions |
| `homework` | Homework | Step-by-step help with problems |
| `quiz` | Quiz | Generates practice questions |
| `notes` | Notes | Summarises and structures notes |
| `flashcard` | Flashcard | Builds flashcards |
| `feedback` | Feedback | Grades and critiques your answers |
| `document` | Document | Answers from your uploaded files, optionally scoped to a subject |
| `planner` | Planner | Parses a deadline and saves it with study sessions |

> Without an LLM key the app still runs: agents return placeholder replies and routing falls back to keywords. Handy for development and tests.

## Tech Stack

```text
Frontend     → Next.js 14 · React 18 · TypeScript · Tailwind CSS
Backend      → Python 3.12 · FastAPI · LangGraph · SQLAlchemy (async) · Alembic
Database     → PostgreSQL · pgvector · Neon
AI           → OpenAI-compatible LLM + embeddings (AIML API) · AssemblyAI (voice)
Integrations → Resend (email) · Google Drive · Google Sign-In · LangSmith (optional)
Testing/CI   → pytest · GitHub Actions
Deployment   → Vercel · Render (or any Docker host) · Neon
```

## Architecture

```mermaid
flowchart LR
    U[Student] --> F[Next.js Frontend]
    F -->|JWT · HTTP / SSE| A[FastAPI Backend]
    A --> S{Supervisor}
    S --> AG[8 Specialist Agents]
    AG --> LLM[LLM Provider]
    AG --> DB[(PostgreSQL + pgvector)]
    A --> DB
    A --> EXT[Resend · Drive · AssemblyAI]
    A --> SCH[Scheduler: reminders and digest]
    A --> AD[Admin Dashboard]
```

## Project Structure

```text
Campus-AI/
├── backend/
│   ├── app/
│   │   ├── agents/        # Supervisor, 8 agents, LangGraph graph
│   │   ├── api/routes/    # auth, agent, voice, documents, schedule, sessions, admin, health
│   │   ├── core/          # config, DB, security, LLM, RAG, scheduler, email, Drive, rate limit
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── main.py        # FastAPI app and error handlers
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # pytest suite
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/               # landing, auth pages, dashboard (home/chat/calendar/settings), admin
│   ├── components/        # auth, dashboard, admin, landing, UI kit
│   ├── lib/               # API client, auth, theme helpers
│   └── .env.example
├── .github/workflows/     # CI
├── DEPLOY.md              # Deployment guide
└── README.md
```

## Requirements

- Python 3.12+
- Node.js 20+ and npm
- PostgreSQL 15+ with the **pgvector** extension (Neon works out of the box)
- An OpenAI-compatible API key, e.g. [AIML API](https://aimlapi.com) *(optional for development)*

## Quick Start

### 1. Clone

```bash
git clone https://github.com/Eman2123/Campus-AI.git
cd Campus-AI
```

### 2. Database (local option)

```bash
docker run -d --name campus-pg -p 5432:5432 \
  -e POSTGRES_USER=campus -e POSTGRES_PASSWORD=campus -e POSTGRES_DB=campus \
  pgvector/pgvector:pg16
```

Or create a free [Neon](https://neon.tech) database and copy its connection string.

### 3. Backend

```bash
cd backend
python -m venv .venv
```

**Windows:**

```bash
.venv\Scripts\activate
```

**macOS/Linux:**

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create `.env` from `.env.example`. The essentials:

```env
DATABASE_URL=postgresql+asyncpg://campus:campus@localhost:5432/campus
JWT_SECRET_KEY=your_long_random_secret
AIML_API_KEY=your_llm_api_key
CORS_ORIGINS=["http://localhost:3000"]
FRONTEND_URL=http://localhost:3000
ADMIN_EMAILS=["you@example.com"]
```

Create the tables and start the API:

```bash
alembic upgrade head
uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

### 4. Frontend

Open a new terminal:

```bash
cd frontend
npm install
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## Environment Variables

Only `DATABASE_URL` and `JWT_SECRET_KEY` are required. Every integration degrades gracefully when its key is missing.

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | required | Postgres URL; paste Neon's string as-is, it is converted automatically |
| `JWT_SECRET_KEY` | required | Signs access tokens |
| `ENV` | `development` | Set `production` in deployments (enforces a strong `JWT_SECRET_KEY`) |
| `RUN_MIGRATIONS_ON_STARTUP` | `false` | Apply migrations when the app starts (use on FastAPI Cloud) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins |
| `FRONTEND_URL` | `http://localhost:3000` | Used in password-reset links |
| `ADMIN_EMAILS` | `[]` | Emails promoted to admin |
| `AIML_API_KEY` | empty | LLM and embeddings; empty means placeholder replies |
| `AIML_API_BASE_URL` · `AIML_MODEL` | `https://api.aimlapi.com/v1` · `gpt-4o-mini` | Any OpenAI-compatible endpoint and model |
| `LLM_TIMEOUT_SECONDS` · `LLM_MAX_RETRIES` | `45` · `2` | LLM timeout and automatic retries |
| `ASSEMBLYAI_API_KEY` | empty | Voice transcription |
| `ELEVENLABS_API_KEY` | empty | Spoken replies (text-to-speech) |
| `RESEND_API_KEY` · `EMAIL_FROM` | empty | Email delivery (only logged when empty) |
| `GOOGLE_CLIENT_ID` | empty | "Continue with Google" (also set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the frontend) |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | empty | Drive filing (stubbed when empty) |
| `REMINDER_LEAD_TIME_HOURS` · `DIGEST_LOOKAHEAD_DAYS` | `48` · `7` | Reminder and digest windows |
| `UPLOAD_DIR` | `./uploads` | Uploaded file storage |
| `LANGCHAIN_TRACING_V2` · `LANGCHAIN_API_KEY` | `false` · empty | Optional LangSmith tracing |

See [`backend/.env.example`](backend/.env.example) for every option (chunking, retrieval, streaming, and more).

## How It Works

```text
Student message
     │
     ▼
Next.js Frontend
     │  JWT + SSE
     ▼
FastAPI Backend ── auth · rate limit
     │
     ▼
Supervisor (intent)
     │
     ▼
Specialist Agent ──► pgvector (your documents) / Schedule
     │
     ▼
Streamed reply
     │
     ▼
PostgreSQL (history · memory)
```

1. A student signs up or signs in.
2. They upload notes or PDFs; the backend extracts text, chunks it, embeds it and stores the vectors. Embeddings are requested in batches (`EMBEDDING_BATCH_SIZE`, default 64), and a document with more than `MAX_CHUNKS_PER_DOCUMENT` chunks (default 500, roughly 150k words) is rejected and shown as Failed. The File Organizer tags each file with a subject.
3. They send a message; the Supervisor classifies the intent and routes it to an agent.
4. The Document agent retrieves the most relevant chunks, and the Planner saves deadlines and study sessions.
5. The reply streams back and the turn is saved to the chat history.
6. The scheduler emails deadline reminders and a daily digest; the calendar can be exported as `.ics`.
7. Admins monitor users, agent usage and connector health.

## API Overview

All routes live under `/api`; full details at `/docs`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` · `/auth/signin` · `/auth/google` · `/auth/forgot-password` · `/auth/reset-password`, `GET/PATCH /auth/me`, `GET/PATCH /auth/me/preferences`, `DELETE /auth/me` |
| Chat | `POST /chat` · `POST /chat/stream` (SSE) · `POST /voice/chat` · `POST /voice/transcribe` · `POST /voice/speak` |
| Sessions | `GET /sessions` · `GET /sessions/{id}/messages` · `DELETE /sessions/{id}` · `DELETE /sessions` |
| Documents | `POST /documents/upload` · `GET /documents` · `DELETE /documents/{id}` |
| Schedule | `GET /schedule` · `GET /schedule/export.ics` · `POST /schedule/remind-me` · `POST /schedule/digest-me` |
| Admin | `/admin/users` · `/admin/analytics/agents` · `/admin/connectors/status` · enable/disable user |
| Health | `GET /health` · `/health/db` · `/health/ready` |

Errors return `{"detail": "..."}`. LLM problems map to `504` (timeout), `503` (provider busy) or `502` (unavailable); rate limits return `429`; oversized uploads `413`; invalid files `422`.

## Admin Access

Admin accounts are never created through normal signup. Add your email to `ADMIN_EMAILS` in `backend/.env`, restart the backend, then **sign in with Google** using that address (set `GOOGLE_CLIENT_ID` first). The role is applied at Google sign-in, so existing accounts are promoted too. Password sign-up and sign-in never grant admin, because a password account does not prove the person owns the email address; without this, anyone could register a listed address before its owner does. Then open `/admin`.

## Testing

```bash
cd backend
pytest -q
```

The suite runs against a real PostgreSQL + pgvector database, so point `DATABASE_URL` at a **throw-away database**. It does not need an LLM key. GitHub Actions runs the frontend checks (`tsc`, lint, build) and the backend migrations plus tests on every push.

## Troubleshooting

| Problem | Possible Fix |
|---|---|
| `pip install` fails | Check Python 3.12+ and use `pip install -r requirements.txt` |
| "column does not exist" after an update | Run `alembic upgrade head`, or set `RUN_MIGRATIONS_ON_STARTUP=true` |
| CORS error / "can't reach the server" | Check `CORS_ORIGINS` and `NEXT_PUBLIC_API_BASE_URL`, then restart both |
| Replies say `[stub — no AIML_API_KEY set]` | Set `AIML_API_KEY` in `backend/.env` |
| Signup says "password cannot be longer than 72 bytes" | Keep the pinned `bcrypt==4.0.1` from `requirements.txt` |
| Chat memory resets after restart | `GET /api/health/ready` shows `MemorySaver`; check `DATABASE_URL` |
| Reset emails never arrive | Without `RESEND_API_KEY` they are only printed in the server log |
| Redirected to sign-in unexpectedly | Your session expired; sign in again |

## Known Limitations

- Streaming is chunked delivery of a finished reply, not token-by-token.
- The rate limiter is in-memory, so run a single backend worker for now.
- The auth token lives in browser storage and there is no refresh token or email verification yet.
- There are no automated browser (UI) tests yet.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for production deployment instructions covering the database, backend, and frontend.

## Project Links

- **Repository:** [Eman2123/Campus-AI](https://github.com/Eman2123/Campus-AI)
- **API Documentation:** `http://localhost:8000/docs` when running locally
- **Deployment Guide:** [`DEPLOY.md`](./DEPLOY.md)

## License

Released under the MIT License. See [LICENSE](LICENSE).

<div align="center">

---

**Campus AI · multi-agent study assistant**

</div>
