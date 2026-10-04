# Campus AI

Multi-agent student study assistant — see full PRD/40-day plan for
architecture and phase breakdown.

## Setup (Days 1-35, zero to running)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then fill in DATABASE_URL, JWT_SECRET_KEY, AIML_API_KEY, ASSEMBLYAI_API_KEY
```

### Provision Neon (manual, ~5 min)
1. Create a project at https://neon.tech (free tier)
2. Copy the connection string from the dashboard
3. Change its scheme from `postgresql://` to `postgresql+asyncpg://`
4. Paste into `backend/.env` as `DATABASE_URL`

This same Neon DB is now used for **three** things: your app's own tables
(Day 2), LangGraph's checkpoint/session storage (Day 13), and vector
embeddings for RAG (Day 17, via the `pgvector` extension — Neon supports
this natively, and the Day 17 migration enables it automatically, no
manual dashboard step needed).

### Run migrations
```bash
alembic revision --autogenerate -m "init: users, sessions, messages"
alembic upgrade head
```
Verify in Neon's SQL console that `users` (with a `role` column), `sessions`, and `messages` exist.
(The `checkpoints` / `checkpoint_writes` tables from Day 13 are created separately, automatically, the first time the app runs — not through Alembic.)

### Get an AIML API key (Days 5, 7-12)
Sign up at https://aimlapi.com → copy your key → put it in `.env` as `AIML_API_KEY`.

### Get an AssemblyAI key (Day 6, optional if you're only testing text chat)
Sign up at https://www.assemblyai.com → copy your key → put it in `.env` as `ASSEMBLYAI_API_KEY`.

### Get a Resend API key (Day 20, optional — reminders log as a stub without it)
Sign up at https://resend.com → copy your key → put it in `.env` as `RESEND_API_KEY`.
Resend's own sandbox sender (`onboarding@resend.dev`, the `EMAIL_FROM` default)
only delivers to the email you signed up to Resend with — fine for local
testing, but swap in a verified domain address before this goes anywhere real.

### Make yourself an admin (Day 34, optional if you don't need /admin)
Add your email to `ADMIN_EMAILS` in `.env` — e.g. `ADMIN_EMAILS=["you@example.com"]`
— then sign up (or sign back in if you already have an account with that
email). There's no other way to become an admin; see `app/core/admin_bootstrap.py`.

### Start the server
```bash
uvicorn app.main:app --reload
```
Swagger UI at http://localhost:8000/docs

### Run the test suite (Day 14)
```bash
pytest tests/ -v
```
Uses your real `.env` (same Neon DB) — no separate test database needed.
Each test uses a fresh random `thread_id`, so it's safe to re-run repeatedly.

### End-to-end manual test
```bash
curl http://localhost:8000/api/health/db                              # DB check
curl -X POST localhost:8000/api/auth/signup -H "Content-Type: application/json" \
  -d '{"email":"test@campus.ai","password":"testpass123"}'            # → access_token

curl -X POST localhost:8000/api/chat -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"message": "explain photosynthesis"}'
# → research agent, real AIML-generated answer

curl -X POST localhost:8000/api/voice/chat -H "Authorization: Bearer <token>" \
  -F "audio=@recording.wav" -F "session_id=s1"                        # → voice transcription + reply
```
If any reply shows `[stub — no AIML_API_KEY set]` or `[AIML API error...]`,
that's the graceful fallback working as intended — check your `.env` key.

### Frontend (Day 26+)

```bash
cd frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_BASE_URL, not consumed until Day 27
npm run dev                       # → http://localhost:3000
```

Next.js 14 (App Router) + TypeScript + Tailwind. No `node_modules` are
committed — install is required before `npm run dev` will work, same as
the backend's `pip install`. The landing page (`/`) doesn't talk to the
backend yet; that starts with sign up/sign in on Day 27.

---

## Progress log

### Day 1 — Foundation
- [x] Repo/folder structure, FastAPI skeleton, DB config wiring, health check routes

### Day 2 — DB schema + migrations
- [x] `User` (with `role`), `Session`, `Message` SQLAlchemy models, Alembic configured

### Day 3 — Auth system
- [x] Password hashing, JWT issuing/validation, signup/signin/me endpoints

### Day 4 — LangGraph skeleton
- [x] `AgentState`, Supervisor node, conditional routing, `/api/chat`

### Day 5 — AIML API LLM client
- [x] Real intent classification + generation via AIML, keyword classifier kept as fallback

### Day 6 — Voice Agent
- [x] AssemblyAI transcription, `/api/voice/chat`, verified full HTTP round trip

### Day 7 — Research/Explainer Agent (1st real specialist)
### Day 8 — Homework Helper Agent (2nd)
### Day 9 — Quiz/Practice Agent (3rd)
### Day 10 — Notes/Summary Agent (4th)
### Day 11 — Flashcard Agent (5th)
- [x] Each is its own file in `app/agents/`, own system prompt, wired into `INTENT_ROUTES` in `app/agents/graph.py`, regression-tested against all prior agents at each step.

### Day 12 — Feedback/Grading Agent (6th, with the loop)
- [x] `app/agents/feedback.py` — grades work, decides `needs_retry` via a parsed `NEEDS_RETRY: YES/NO` marker
- [x] The one loop in the graph: `feedback -> homework` (conditional) or `-> END`. Verified both branches fire correctly, and that Homework always ends the turn after a retry (no infinite-loop risk by construction).

### Day 13 — Redis-backed checkpointing → **pivoted to Postgres**
- [x] `app/core/checkpointer.py` — durable session checkpointing
- **Why the pivot:** the plan called for Redis (`langgraph-checkpoint-redis`), but that package requires the RediSearch module (`FT.INFO` command). Plain open-source Redis doesn't ship it, and Upstash Redis's own search feature uses different `SEARCH.*` commands — neither is compatible. Rather than requiring a paid Redis Cloud/Stack instance just for checkpointing, this uses **Postgres** (the same Neon DB from Day 1) via `langgraph-checkpoint-postgres` instead.
- [x] Fixed a real connection-string incompatibility along the way: asyncpg's `?ssl=require` query param isn't understood by psycopg (which the checkpointer uses) — it needs `?sslmode=require`. `_psycopg_conn_string()` converts this automatically.
- [x] Verified with a genuinely separate Python process reconnecting to the same DB and thread_id — message history persisted correctly across the "restart," not just within one process.

### Day 14 — Integration testing
- [x] `tests/` — real pytest suite (`pytest tests/ -v`), not mocks of the graph: exercises real Supervisor classification + conditional routing for all 6 core agents, the unbuilt-intent stub fallback, the Feedback→Homework loop (both branches), Day 13's cross-turn session persistence, and one full HTTP round trip through `/api/chat`
- [x] 10/10 tests passing, confirmed repeatable across multiple runs against a real durable database (each test uses a fresh random `thread_id` specifically so re-runs don't accumulate stale state — an early version of this suite caught that exact issue for real)

### Day 15 — Bug fixes + logging/observability
- [x] `app/core/logging_config.py` — structured logging (timestamp | level | logger | message), noisy third-party loggers (httpx, httpcore, asyncio) quieted at DEBUG
- [x] Request logging middleware — every HTTP request logged with method, path, status, duration
- [x] Agent-level logging — Supervisor logs the classified intent per turn, graph logs routing decisions and specifically the Feedback→Homework loop firing
- [x] Optional LangSmith tracing — set `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` in `.env` to get full trace visibility in LangSmith's dashboard; off by default, custom logging covers the basics either way
- [x] Bug fix: LLM classification failures were silently swallowed before — now logged as a warning so a misconfigured AIML key is visible in server logs, not just inferred from stub replies
- [x] Verified: full test suite still 10/10 after all changes; manually confirmed the actual log output for a live request (intent classification, routing decision, and request timing all appear correctly)

### Day 16 — Document upload endpoint + storage (Phase 3 begins)
- [x] `app/models/document.py` — `Document` (id, user_id, filename, storage_path, embedding_status)
- [x] `app/core/storage.py` — local disk storage, swappable later for cloud storage (e.g. Supabase) without changing callers; validates file type (`.pdf .txt .md .docx`) and size (20MB max)
- [x] `POST /api/documents/upload`, `GET /api/documents`, `DELETE /api/documents/{id}` — all user-scoped (one user can never see another's documents)
- [x] **Real bug fix #1:** `passlib==1.7.4`'s internal self-test breaks on `bcrypt>=4.1` (it checks a `bcrypt.__about__.__version__` attribute that newer bcrypt removed) — every signup/signin call was silently failing with a red-herring "password cannot be longer than 72 bytes" error. Pinned `bcrypt==4.0.1` in `requirements.txt`. This affected Day 3's auth from the start; only surfaced now because this was the first time these tests ran signup against a real, freshly-installed environment.
- [x] **Real bug fix #2:** Neon's connection string uses `?ssl=require` (asyncpg's param name), but `psycopg` — used by Day 13's Postgres checkpointer — rejects that outright and needs `?sslmode=require` instead. `_psycopg_conn_string()` now converts this automatically.
- [x] **Real bug avoided:** almost let Alembic autogenerate a migration that would `DROP TABLE` on LangGraph's checkpoint tables (Day 13), since they're not part of our SQLAlchemy metadata and looked "removed" to Alembic. Added an `include_object` filter in `migrations/env.py` so autogenerate ignores tables it doesn't own.
- [x] Verified with a full real flow (real signup → real JWT → upload → list → disk-existence check → delete-removes-both-DB-and-file), then converted into permanent pytest coverage (`tests/test_documents.py`) — 14/14 tests passing, confirmed repeatable across multiple runs
- [x] Along the way, fixed a test-suite bug of our own: per-test `TestClient` instances were fighting over the single async DB engine's event loop binding ("attached to a different loop") — made `client` session-scoped in `conftest.py`, and switched every test to use real signup + real JWTs instead of a mocked auth dependency (needed anyway for the per-user isolation test)

### Day 17 — Chunking + embeddings pipeline (pgvector)
- [x] `document_chunks` table added — `pgvector`'s `Vector(1536)` column type, correctly created via a real Alembic migration (tested on a completely fresh database)
- [x] `app/core/text_extraction.py` — pulls plain text from `.txt`, `.md`, `.pdf`, `.docx`
- [x] `app/core/chunking.py` — word-based sliding-window chunking with configurable overlap
- [x] `app/core/embeddings.py` — real embeddings via AIML's OpenAI-compatible endpoint, with the same graceful-fallback pattern as the LLM calls (a deterministic pseudo-embedding when no key is set, clearly marked as not semantically meaningful)
- [x] `app/core/rag_pipeline.py` — ties it together: extract → chunk → embed → store, updating `embedding_status` (`pending` → `processing` → `ready`/`failed`) at each stage
- [x] Upload now triggers this as a FastAPI `BackgroundTask` — the upload response returns immediately, processing happens after
- [x] **Real issues fixed in the generated Alembic migration:** autogenerate produced code referencing `pgvector.sqlalchemy.vector.VECTOR` without importing `pgvector.sqlalchemy` (would `NameError` on migration run), and had no `CREATE EXTENSION IF NOT EXISTS vector` step (would fail on a database where pgvector isn't already enabled — which is every fresh database, including a fresh Neon one). Both fixed by hand; verified by running the migration against a **completely fresh, extension-less database** and confirming `document_chunks.embedding` really is `vector(1536)`.
- [x] Verified the full pipeline for real: uploaded a long text file, confirmed `embedding_status` went `pending → ready`, and directly inspected the database — real chunks with correct word-overlap and real 1536-dimension vectors stored via `vector_dims(embedding)`
- [x] 19/19 tests passing (added `tests/test_rag_pipeline.py`), confirmed repeatable across multiple runs

Note: `text-embedding-3-small` assumes AIML proxies that OpenAI model — if AIML's catalog uses a different name or dimension for their embedding model, update `AIML_EMBEDDING_MODEL` and `EMBEDDING_DIM` in `.env` (check aimlapi.com's model list) and re-run a fresh migration if the dimension changes, since pgvector columns are fixed-size.

### Day 18 — Document Agent: retrieval + grounded Q&A node
- [x] `app/agents/document.py` — embeds the student's question, does a pgvector cosine-similarity search over `document_chunks` joined to `documents`, scoped to `Document.user_id == this user` and `embedding_status == "ready"` (top-5, `DOCUMENT_RETRIEVAL_TOP_K`)
- [x] System prompt forces answers to come only from the retrieved excerpts — cites the filename, says "not enough info" instead of guessing from outside knowledge
- [x] Clear, distinct replies for "no documents uploaded yet" vs. "found excerpts, here's the grounded answer" vs. the usual stub/error fallbacks
- [x] Wired into `graph.py`: `document` intent now routes to this real node instead of the generic stub (`document -> END`)
- [x] **Required side-effect:** this is the first node doing real async DB I/O. Calling it via the old sync `campus_ai_graph.invoke()` from inside a live FastAPI request would raise `RuntimeError: asyncio.run() cannot be called from a running event loop` the moment a request hit this node. Switched `api/routes/agent.py` and `api/routes/voice.py` to `await ...ainvoke(...)` — LangGraph supports mixed sync/async nodes in the same graph fine either way.
- [x] `tests/test_document_agent.py` — no-documents case, real upload → retrieval → grounded reply, and per-user isolation, all through the real `/api/chat` endpoint

### Day 19 — Planner Agent: deadline/study-plan logic
- [x] `schedules` table finally added (it was in the PRD's schema from Day 1 but nothing had created it yet) — `app/models/schedule.py`, migration `7a1c4e9f2b3d`. `source` distinguishes a `"deadline"` row from a generated `"study_session"` row.
- [x] `app/agents/planner.py` — extracts `{title, topic, due_date}` from the student's message via the LLM as strict JSON (or flags `no_date_found`); falls back to `python-dateutil`'s fuzzy parser when no `AIML_API_KEY` is set (same "best-effort, not exact" spirit as the Day 17 embeddings fallback)
- [x] `build_study_sessions()` — pure function, backward-plans up to 4 evenly-spaced review sessions strictly between now and the deadline; returns `[]` when there's less than a full day of runway
- [x] No date found → asks a clarifying question, no DB write. Date found → saves the deadline + sessions to `schedules` and replies with the plan in plain language.
- [x] Wired into `graph.py`: `planner` intent routes to this real node (`planner -> END`) — this was the last stub-routed intent, so `route_after_supervisor`'s fallback to `pending_response` is now unreachable in normal operation and kept only as a defensive safety net
- [x] `tests/test_planner_agent.py` — pure-logic tests for date extraction and session spacing (no DB needed — verified these directly), plus save-and-reply tests through `/api/chat`

### Day 20 — Calendar Export (ICS) + Deadline Reminders
- [x] `app/core/calendar_export.py` — builds a downloadable `.ics` file (via the `icalendar` package, not hand-rolled string building, to get RFC 5545 line-folding/escaping right) from a student's `schedules` rows; each row becomes an all-day `VEVENT` since due dates are day-granularity by construction
- [x] `GET /api/schedule/export.ics` — one-click, user-scoped download; no OAuth, no external calendar provider (per the PRD's Finalized Decisions)
- [x] `app/core/email.py` — transactional email via Resend's REST API, with the same graceful stub fallback pattern as the LLM/embeddings calls when no `RESEND_API_KEY` is set; documented as a deliberate, swappable choice over SendGrid (both were still "finalized" in the PRD)
- [x] `app/core/reminders.py` — `send_deadline_reminders()` emails every not-yet-reminded `"deadline"` row due within `REMINDER_LEAD_TIME_HOURS` (default 48h); a new `reminder_sent_at` column (migration `9d2f6a1e8c47`) makes the job idempotent — re-running it never double-sends
- [x] `app/core/scheduler.py` — `APScheduler`'s `AsyncIOScheduler` runs that sweep once a day (`REMINDER_CHECK_HOUR_UTC`, default 13:00 UTC), started/stopped via FastAPI's `lifespan` (replacing the old bare `@app.on_event` style, which is being phased out)
- [x] `POST /api/schedule/remind-me` — reuses the exact same `send_deadline_reminders()` function, scoped to just the calling student. Doubles as a genuine self-serve "resend that reminder" feature and as the only realistic way to integration-test the reminder job without exposing an unscoped, spammable trigger.
- [x] `tests/test_schedule.py` — ICS generation (event count, per-user scoping) and the reminder sweep (sends once inside the window, is a no-op outside it, and is idempotent on a second call) — the email send itself is mocked at the `send_email` boundary, same pattern as mocking `chat_completion` in the Day 14 agent tests

### Day 21 — Buffer: RAG retrieval quality tuning / re-chunking pass
- [x] **Re-chunking pass:** `app/core/chunking.py` rewritten from Day 17's plain word-count sliding window to paragraph/sentence-aware chunking — packs whole sentences up to `CHUNK_SIZE_WORDS`, carries the last `CHUNK_OVERLAP_WORDS` forward for continuity, and only falls back to a word-window split for the rare single sentence longer than a whole chunk. A chunk that starts or ends mid-sentence is a worse match for a complete question, so this should improve retrieval quality without any caller needing to change (same signature, same list-of-strings return). A too-small trailing chunk (`MIN_CHUNK_WORDS`, new setting) now gets merged into the previous one instead of standing alone.
- [x] **Bug found and fixed (off-by-one, dates back to Day 17):** the word-window fallback's `while start < len(words): ...; start += step` loop could re-satisfy its own condition after a window that already reached the end of the text (whenever `step < chunk_size`, i.e. whenever there's any overlap at all), producing a redundant, mostly-overlapping tail window. Fixed by breaking out of the loop once a window's end reaches the text's end, instead of blindly advancing by `step` again.
- [x] **Bug found and fixed (falsy zero):** both `chunk_size`/`overlap` used the `x = x or default` idiom, which silently replaces an explicitly-passed `overlap=0` with the config default — `0` is falsy in Python. Harmless under Day 17's implementation (just meant "more overlap than requested"), but combined with the new sentence-accumulator's reset logic it was actively wrong: every chunk became a growing prefix of all the text seen so far instead of an independent chunk. Fixed by switching to explicit `is None` checks.
- [x] **Retrieval-quality tuning:** `app/agents/document.py`'s `retrieve_chunks()` now drops chunks farther than `DOCUMENT_MAX_COSINE_DISTANCE` (new setting, default 0.9) instead of always filling out `top_k` regardless of how irrelevant the nearest matches are — but *only* when `AIML_API_KEY` is set. The no-key fallback embedding (Day 17) is per-text random noise, so its distances carry no semantic signal; thresholding them would reject good and bad matches at random. A new `NO_RELEVANT_CHUNKS_REPLY` distinguishes "you have documents, but nothing in them is relevant" from `NO_DOCUMENTS_REPLY`'s "you have nothing uploaded at all."
- [x] `tests/test_chunking.py` — sentence-boundary respecting, paragraph handling, overlap continuity, the oversized-sentence fallback (with an explicit regression check for the off-by-one), the trailing-tiny-chunk merge, and the falsy-zero-overlap regression, all run directly against the real module and verified to pass
- [x] `tests/test_retrieval_quality.py` — mocks embeddings to force a controlled orthogonal (maximally dissimilar) vector and confirms an irrelevant document gets filtered out and produces `NO_RELEVANT_CHUNKS_REPLY` when a key is configured

### Day 22 — Email Digest connector: daily summary job
- [x] `app/core/digest.py` — `send_daily_digests()` groups every upcoming `schedules` row (deadlines *and* study sessions, next `DIGEST_LOOKAHEAD_DAYS`, default 7) by user and emails each one a single summary; students with nothing upcoming are skipped rather than sent an empty digest
- [x] Deliberately **not** gated like Day 20's reminders — no "already sent" flag, since a digest is a recurring daily briefing where the same item is expected to reappear tomorrow, not a one-time nag
- [x] `app/core/scheduler.py` — second `AsyncIOScheduler` cron job, `daily_digest`, runs once a day at `DIGEST_CHECK_HOUR_UTC` (default 08:00 UTC, ahead of the 13:00 UTC reminder sweep — a morning briefing before the afternoon nag)
- [x] `POST /api/schedule/digest-me` — same self-serve/testable pattern as `remind-me`: scoped to the calling student, reuses the exact function the cron job calls
- [x] `tests/test_digest.py` — sends when something's upcoming, skips when nothing is, excludes items outside the lookahead window, and explicitly confirms *no* reminder-style suppression on repeated calls
- [x] No new dependencies, no schema changes — reuses `schedules`, `email.py`, and the scheduler wiring from Days 19-20

### Day 23 — File Organizer connector: auto-sort uploaded docs by subject/tag
- [x] `documents` gets four new columns (migration `3f8b5c0d1a92`): `subject`, `drive_file_id`, `drive_folder_path`, `organize_status` (`pending` → `processing` → `organized` | `skipped` | `failed`)
- [x] `app/core/subject_classifier.py` — LLM call classifies a short subject/tag from the filename + a text excerpt; falls back to a fixed keyword list when no `AIML_API_KEY` is set (same best-effort spirit as the Day 17/19 fallbacks)
- [x] `app/core/google_drive.py` — files the upload into `<root>/<user_id>/<subject>/<filename>` inside a single **service account's own Drive**, never the student's. That sidesteps the exact per-user OAuth-verification problem that ruled out Google Calendar/Gmail (Day 20's PRD note) — nothing here ever asks a student to grant Drive access, so there's no consent screen to get reviewed. Returns the stub path (subject still gets saved, nothing gets filed) when `GOOGLE_SERVICE_ACCOUNT_FILE` isn't set.
- [x] `app/core/file_organizer.py` — `organize_document()` ties classification + Drive filing together as a second `BackgroundTask` added right alongside Day 17's `process_document`, so every upload gets auto-sorted without any extra wiring
- [x] `DocumentOut` schema and `GET /api/documents` now surface `subject`/`organize_status`/`drive_file_id`/`drive_folder_path`
- [x] `tests/test_file_organizer.py` — heuristic keyword matching (pure function), and upload → classify → (organize or skip) through the real endpoint, written to hold under both outcomes since no Drive credentials are expected in test environments
- [x] New dependencies: `google-api-python-client`, `google-auth`

### Day 24 — wire all connectors into the Planner + Document agents
- [x] **File Organizer → Document Agent:** `document.py`'s retrieval now checks whether the student's question names a subject they already have tagged documents in (e.g. "using my chemistry notes...") and, if so, scopes the pgvector search to that subject alone instead of everything they've ever uploaded — cuts cross-subject noise once a student has material from more than one class. Excerpt labels shown to the LLM now include the subject too.
- [x] **File Organizer → Planner Agent:** `find_related_documents()` checks the same subject tags against the deadline's title/topic; when there's a match, the Planner's reply now points the student at the Document agent ("ask me to explain or quiz you on those") instead of silently ignoring material they've already uploaded for that class
- [x] **Calendar Export + Deadline Reminders + Email Digest → Planner Agent:** the placeholder line from Day 19 ("Calendar Export will let you pull them into your own calendar once that's wired up") is replaced with the real, now-true statement — the actual `GET /api/schedule/export.ics` endpoint, plus a mention that reminder and digest emails will follow automatically (Days 20 and 22 already run those crons; nothing new to wire on the delivery side, just correcting copy that predated them)
- [x] `tests/test_connector_wiring.py` — subject-matched documents get mentioned by the Planner, the calendar reply references the real endpoint, and Document Agent retrieval scoped to a named subject excludes chunks from a different subject's document. Each assertion is written to only fire when the classifier actually produced a matching subject that run, rather than assuming a specific label.
- [x] No schema or dependency changes — pure cross-referencing of state that Days 18-23 already persist

### Day 25 — end-to-end testing of the automation tools (Phase 3 wrap-up)
- [x] `tests/test_automation_e2e.py` — one continuous student journey through every Phase 3 piece together rather than in isolation: upload → File Organizer auto-sorts it → Planner creates two deadlines (one near-term, one 20 days out) → Calendar Export reflects both → Deadline Reminders fires exactly once for the near-term one and is idempotent on retry → Email Digest picks up what's in its wider window → Document Agent answers grounded in the upload → deleting the document leaves the schedule/export untouched but empties the Document Agent's search
- [x] **Bug found and fixed:** deleting a document never cleaned up its filed Drive copy — the DB row holding `drive_file_id` was gone, but the actual file lived on in Drive with nothing left pointing to it. Added `google_drive.delete_file_from_drive()` (best-effort, same stub/log pattern as the rest of that module) and wired it into `DELETE /api/documents/{id}` whenever a document has one.
- [x] `test_delete_file_from_drive_stub_is_a_safe_no_op` — confirms that fix's no-credentials path never raises, since the delete route calls it unconditionally
- [x] No other correctness gaps found — reminders/digest windowing, subject-based cross-referencing (Day 24), and schedule/document independence all held up under the combined flow

> **Note on Day numbering:** the frontend work (Next.js setup, design system, landing page) was originally logged here as "Day 21," which was a mistake — the PRD's Day 21 is this RAG-tuning buffer day, and the frontend setup is actually Day 26 (Phase 4's first day). It's been moved and relabeled below; nothing about the frontend work itself changed, only where it's logged.

### Day 26 — Next.js project setup, design system, landing page
- [x] `frontend/` scaffolded by hand (Next.js 14 App Router + TypeScript + Tailwind) — no network in this environment to run `create-next-app`/`npm install`, so `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs` were written directly, matching what the CLI would generate
- [x] Design tokens set in `tailwind.config.ts` (mirrored as plain constants in `lib/design-tokens.ts`): an ink-navy "notebook at midnight" base, a warm paper/index-card surface, a highlighter-amber accent, and three "note" colors (coral/mint/periwinkle) standing in for sticky-note tags — deliberately not the cream+terracotta or near-black+neon defaults, since this is a study tool, not a generic SaaS product
- [x] Two reusable primitives to start the actual "system" part of the design system: `components/ui/Button.tsx` (primary/ghost), `components/ui/SectionHeading.tsx` (eyebrow/title/description, dark or paper tone) — later frontend days (sign up, chat UI, dashboard) build on these rather than one-off styling per page
- [x] Landing page (`app/page.tsx`) assembled from `components/landing/`: Hero (headline + the six agents as scattered tag chips, not a buried features list), HowItWorks (a real 3-step sequence), AgentCards (six "pinned index cards," one per real agent, varied rotation/color instead of identical SaaS cards), PlannerCallout (a mock schedule using the actual `"Study session N/M: <topic>"` format the Day 19 Planner Agent generates), CtaSection, Footer
- [x] Fonts via `next/font/google`: Libre Caslon Text (display/headlines) + Work Sans (body/UI) — loaded as CSS variables in `app/layout.tsx`, referenced from Tailwind's `fontFamily.display`/`fontFamily.sans`
- [x] Verified with `tsc --noEmit` against all `.ts`/`.tsx` files (no `node_modules` available to fully resolve Next/React types in this sandbox, so this catches real syntax errors — a full typecheck happens on first `npm run build`)
- [ ] Not wired to the backend yet — the "Start studying" CTA points at `/signup`, which doesn't exist until Day 27

### Day 27 — Sign up / Sign in pages, JWT flow wired to backend
- [x] `lib/api.ts` — thin `fetch` wrapper: prefixes `NEXT_PUBLIC_API_BASE_URL`, JSON-encodes the body, attaches `Authorization: Bearer <token>` when given, and turns FastAPI's `{"detail": "..."}` error shape into a catchable `ApiError`
- [x] `lib/auth.ts` — `signUp`/`signIn` call the real `POST /api/auth/signup` / `/signin`, store the returned JWT, and `fetchCurrentUser` calls `GET /api/auth/me` with it. Token lives in `localStorage`, not an httpOnly cookie — simplest option for a client-rendered app hitting a separate API origin; noted as a Phase 6 hardening candidate if that tradeoff ever needs revisiting.
- [x] `components/auth/AuthForm.tsx` — one shared form for both `/signup` and `/signin` (same fields, different copy/submit handler/cross-link) rather than two near-duplicate pages, continuing Day 26's design-system approach
- [x] `app/dashboard/page.tsx` — minimal placeholder: redirects to `/signin` with no token, otherwise calls `/api/auth/me` and shows the signed-in email + a sign-out button. Not the real product surface — Day 28 replaces its contents with the actual chat interface — but it's what proves the whole sign up/sign in → JWT → authenticated request round trip actually works, not just that the forms submit.
- [x] Hero now links to the real `/signin` too (previously only `/signup`, added Day 26 before either page existed)
- [x] No backend changes needed — `CORS_ORIGINS` already defaulted to `http://localhost:3000` since Day 1, matching Next.js's dev port
- [x] Checked with `tsc --noEmit` across all frontend files together (same sandbox caveat as Day 26: no `node_modules` here to fully resolve Next/React types, so this only catches real syntax errors, not the full type-check `npm run build` would do)

### Day 28 — Chatbot interface: text chat UI, message history
- [x] `lib/chat.ts` — calls the real `POST /api/chat`; `sessionId` (one generated per page load) becomes the LangGraph `thread_id`, so a whole conversation keeps the agent's own Day-13 checkpointed memory intact
- [x] `components/chat/ChatWindow.tsx` — owns the message list as React state, sends on submit, shows a "Thinking…" placeholder while waiting, auto-scrolls to the newest message
- [x] `components/chat/ChatMessageBubble.tsx` — user/assistant bubbles styled with the Day 26 tokens; assistant replies are labeled with which of the 8 real agents answered (Homework Helper, Quiz, Document, Planner, etc.) — a small thing, but it's the one place in the whole frontend that actually shows the multi-agent routing is real
- [x] `components/chat/ChatInput.tsx` — Enter to send, Shift+Enter for a newline, disabled while a reply is pending
- [x] `app/dashboard/page.tsx` now renders `ChatWindow` for real, replacing Day 27's placeholder — same auth-guard logic (redirect to `/signin` with no token, `GET /api/auth/me` to confirm it's still valid) that page already had
- [x] **Bug found and fixed (twice):** `\u2014`/`\u2192`/`\u2026` escapes work fine inside a JS string literal (`"foo \u2014 bar"` in a `setError(...)` call, an object's `body: "..."`, etc.) but are **not** interpreted the same way in raw JSX text between tags — `<p>Loading\u2026</p>` renders the literal six characters `\u2026`, not an ellipsis. Found this in `app/dashboard/page.tsx` (introduced Day 27) and `components/chat/ChatWindow.tsx` (introduced this same day) by actually grepping for the escape pattern and checking each hit's context rather than assuming; fixed by using the real Unicode character directly in JSX text, which is what every other component already did correctly.
- [x] **Known gap, flagged not fixed:** the backend has never actually persisted chat messages — `sessions`/`messages` tables have existed since Day 2, but nothing writes to them; `/api/chat` only keeps LangGraph's own checkpointed state. So "message history" here is this browser tab's session only, reset on refresh. A real cross-session history sidebar (Day 31) will need that closed on the backend first — noted in `lib/chat.ts` and here rather than silently building Day 31's sidebar against data that doesn't exist yet.
- [x] Checked with `tsc --noEmit` across all frontend files together (same sandbox caveat as Days 26-27: no `node_modules` here, so this catches real syntax errors only)

### Day 29 — Voice input UI (record → send to Voice Agent)
- [x] `lib/voice.ts` — calls the real `POST /api/voice/chat`, which needs `multipart/form-data` (an audio file + `session_id` field) rather than JSON, so this bypasses `lib/api.ts`'s always-JSON `apiFetch` and builds the request directly. Surfaces the backend's actual error cases — no `ASSEMBLYAI_API_KEY` configured (503), no detectable speech (422) — as real `ApiError` messages instead of a generic failure.
- [x] `components/chat/VoiceRecorderButton.tsx` — owns the `MediaRecorder`/`getUserMedia` lifecycle only (idle → recording → processing → idle), hands the finished audio `Blob` to a callback, and never touches the message list or network call itself — that stays ChatWindow's job, same separation as `ChatInput`
- [x] `ChatWindow.tsx` refactored: the input bar (textarea + send + mic) is now one shared row instead of `ChatInput` owning its own separate bar, so voice sits naturally next to typing rather than as a second, disconnected control. Voice's round trip adds *both* the user's transcript and the assistant's reply together once the backend responds — unlike typed messages, the user's own message text isn't known until transcription comes back.
- [x] No backend changes needed — Day 6's Voice Agent + `/api/voice/chat` already did exactly one job (voice-in → text → the same Supervisor-routed graph as typed chat), so the frontend just needed to actually call it
- [x] Checked with `tsc --noEmit` (with `--lib dom` explicitly, since `MediaRecorder`/`navigator.mediaDevices` are DOM types) across all frontend files — clean; same sandbox caveat as Days 26-28 about `node_modules` not being installable here
- [x] Swept the new files for the Day 28 JSX-text-escape bug class (`\u2014` etc. inside raw JSX text vs. inside a JS string) — none found here

### Day 30 — Streaming response rendering (SSE/WebSocket)
- [x] **Architecture decision, documented up front:** real per-token LLM streaming would need LangGraph's `astream_events`, which only captures token deltas from LangChain-wrapped chat models — every one of our 8 agents calls the raw OpenAI SDK directly instead (a deliberate Day 5 simplicity choice). Retrofitting true streaming would mean either swapping every agent onto a LangChain model wrapper, or duplicating each agent's prompt-building logic into a second, streaming-only path outside the graph — both bigger and riskier than one day's scope, and both create room for the streaming and non-streaming paths to quietly disagree. So: **real SSE transport and real progressive client rendering, backed by chunked-word delivery of the graph's already-complete reply** — not token-by-token generation. This also means there's no time-to-first-byte improvement (the whole graph still runs before any chunk is sent); the benefit is purely the typewriter reveal, and that's stated plainly rather than implied to be more than it is.
- [x] `POST /api/chat/stream` (`app/api/routes/agent.py`) — same request shape, same graph (`_run_graph`, shared with the non-streaming `/chat` — zero duplicated agent logic), wrapped in a `StreamingResponse`. Emits `token` SSE events word-chunked (`STREAM_CHUNK_WORDS`) with a small pacing delay (`STREAM_CHUNK_DELAY_MS`), then one final `done` event with `{intent, agent_used}`, or an `error` event if the graph raises.
- [x] `lib/chat.ts`'s `streamMessage` consumes it via `fetch()` + a manual `ReadableStream` reader — **not** `new EventSource()`. EventSource can only make unauthenticated GET requests with no custom headers and no body, which doesn't work with Bearer-token auth or a JSON message payload. Reading the SSE-formatted body by hand over fetch is the standard, real workaround — still genuine SSE on the wire, just parsed client-side instead of by the browser.
- [x] `ChatWindow.tsx` renders tokens as they arrive: the "Thinking…" placeholder now clears the instant the *first* token lands (not the whole reply), and the assistant bubble grows word-by-word from there
- [x] Voice chat (Day 29) deliberately stays non-streaming — transcription is already one blocking round trip before there's any text at all to stream, so the win is smaller there; the same SSE pattern is there to reuse if that changes
- [x] `tests/test_chat_streaming.py` — SSE content-type, token+done event sequencing, routing parity with the non-streaming endpoint (intent/agent_used, not exact reply text — a real LLM's sampling can legitimately differ between two independent calls), the error-event path, and auth (403 for a missing header, matching `HTTPBearer`'s actual default — not the 401 that's easy to assume)
- [x] Checked with `tsc --noEmit` (same sandbox caveat as Days 26-29) and swept for the Day 28 JSX-text-escape bug class — none found

### Day 31 — session/history sidebar, document upload UI, ICS download button
- [x] **Closed the Day 28 gap first:** `sessions`/`messages` have existed since Day 2 but nothing ever wrote to them. `app/core/chat_history.py` now does, called from `/chat`, `/chat/stream`, and `/voice/chat` alike (one shared `save_turn` helper, so all three entry points persist identically).
- [x] `resolve_session_uuid()` — the real frontend always sends a proper UUID as `session_id` (it's LangGraph's thread_id, Day 13), so that's used directly as the DB session's primary key too: resuming a session from the sidebar also resumes the agent's own checkpointed memory, not just the displayed history. A non-UUID string (the `"dev-session"` default, a test's custom thread id) derives a stable, per-user UUID instead of crashing — those callers just lose that identity between the two ids, which doesn't matter since they're not resuming conversations through this table.
- [x] `GET /api/sessions` / `GET /api/sessions/{id}/messages` — the sidebar's data source. Sessions are ordered by most recent message, not creation time (returning to an old conversation should bring it back to the top), and previewed by the student's first actual question rather than a bare timestamp. Message reads 404 (not 403) on someone else's session, so a guess doesn't even confirm the session id exists.
- [x] `components/chat/HistorySidebar.tsx` + a "New chat" button — clicking a past conversation swaps `ChatWindow`'s `sessionId` prop; a `key={sessionId}` on it in the dashboard remounts the component fresh, so loading a different conversation's history is just "fetch on mount" rather than juggling shared state between the sidebar and the chat window
- [x] `components/documents/DocumentUploader.tsx` — upload, list, delete, all through the real Day 16/17/23 endpoints. Polls the document list every 2s while anything is still `pending`/`processing`, since embedding + File Organizer classification run as background tasks that (outside of tests, where TestClient runs them synchronously) actually complete *after* the upload response comes back — a detail that's easy to get wrong by testing only against TestClient's different-in-practice timing.
- [x] `lib/schedule.ts`'s `downloadScheduleIcs` — the "Export calendar" button in the dashboard header. `GET /api/schedule/export.ics` needs the Authorization header, which a plain `<a href>` can't send, so this fetches the file as a blob and triggers the download via a temporary object URL instead.
- [x] `tests/test_chat_history.py` — persistence across all three chat entry points, same-session accumulation, the non-UUID fallback, per-user isolation of both the default session id and of reading someone else's session, and most-recent-first ordering
- [x] Checked with `tsc --noEmit` and swept for the Day 28 JSX-text-escape bug class — clean

### Day 32 — Planner/calendar view in the student dashboard
- [x] `GET /api/schedule` — the one missing read endpoint for `schedules` (export-as-ICS and the two connector triggers already existed, but nothing returned the raw list as JSON). Deliberately read-only: the PRD task is a *view*, not schedule management.
- [x] `components/calendar/MonthCalendar.tsx` — a real month grid (prev/next navigation, today highlighted), not a static mockup like the landing page's `PlannerCallout` — each day shows small dots for what's due (coral for deadlines, periwinkle for study sessions, matching the tokens already used for these two categories elsewhere), click a day to filter the list panel to it
- [x] `components/calendar/ScheduleListPanel.tsx` — the selected day's items, or an upcoming list (next 8, chronological) when nothing's selected
- [x] `components/dashboard/DashboardHeader.tsx` + `lib/useAuthGuard.ts` — pulled out of `/dashboard` *before* copy-pasting them into the new `/dashboard/calendar` page, not after noticing the duplication. The header now also carries the Chat/Calendar tab nav.
- [x] `tests/test_schedule.py` gains two more cases: the list endpoint returns both deadlines and study sessions ordered by date, and is scoped per user
- [x] Checked with `tsc --noEmit` and swept for the Day 28 JSX-text-escape bug class — clean

### Day 33 — Polish + responsive design pass (Phase 4 wrap-up)
- [x] **Real bug, not cosmetic:** `HistorySidebar` was a permanently-visible, fixed 256px column next to the chat with zero responsive handling — on a ~375px phone that's most of the screen gone before a single message is even visible. This was the single worst issue in the whole frontend; everything else was a matter of degree. Rebuilt as an off-canvas drawer below the `lg` breakpoint (`fixed` + `-translate-x-full`/`translate-x-0`, a backdrop that closes it on click, its own close button since it can cover the header when open) and unchanged, always-visible behavior at `lg` and up.
- [x] **Second real bug:** `DashboardHeader` crammed logo+email, two nav tabs, and two buttons into one `flex justify-between` row with no wrapping — guaranteed overflow on narrow screens. Fixed with `flex-wrap` + `gap-y`, the email hidden below `sm` (secondary info, not worth the space at the tightest width), and "Export calendar" shortening to "Export" below `sm` rather than truncating mid-word.
- [x] Added a hamburger toggle to `DashboardHeader` (only rendered on the chat page, which is the only one with a sidebar to toggle) wired to new `sidebarOpen` state in `/dashboard`
- [x] `VoiceRecorderButton`'s tap target bumped from 40px to 44px (the standard minimum recommended touch-target size) — a small, genuine mobile-usability fix, not just a visual tweak
- [x] Reviewed every Phase 4 page (landing, auth, chat, calendar) against the same question — does anything overflow, clip, or become unusably cramped below `sm`/`lg`? Everything else already had appropriate breakpoints from when it was originally built (Days 26, 32); the two bugs above were the real gaps, not everything needed changing
- [x] Comprehensive final sweep for the Day 28 JSX-text-escape bug class across the *entire* frontend (not just this day's files) — every remaining `\u2014`/`\u2026`/`\u201c` hit confirmed to sit inside an actual JS string literal, not raw JSX text
- [x] Minor code-cleanliness fix in `Hero.tsx` (inconsistent JSX indentation from Day 26) while in there — no behavior change

### Day 34 — Admin auth/role-gating (Phase 5 begins)
- [x] **Closed a real gap first:** `require_admin` has existed since Day 5 but nothing ever called it, and there was no way for *any* user to actually become an admin — signup always defaults to `"student"`, with no self-service flag or endpoint (correctly, for security). `app/core/admin_bootstrap.py` is now the one and only path: an `ADMIN_EMAILS` setting (same JSON-array format as `CORS_ORIGINS`), checked at both signup and sign in, so adding an email to the list after someone's account already exists still promotes them next time they sign in — no manual DB update needed to bootstrap the first admin.
- [x] `GET /api/admin/ping` (`app/api/routes/admin.py`) — deliberately just enough to prove the gate works end to end (403 for a non-admin or missing auth, 200 with `{status, role}` for an admin). The real admin data endpoints — user list/search/disable (Day 35), usage analytics (Day 36), connector status (Day 37) — build on this same `require_admin` dependency.
- [x] `useAdminGuard()` (frontend) wraps `useAuthGuard`, redirecting non-admins to `/dashboard` rather than `/signin` — they're authenticated, just not authorized, which is a different case than having no token at all
- [x] `/admin` — a placeholder page (Days 35-37 fill it in), reachable via a Chat/Calendar/**Admin** tab in `DashboardHeader` shown only when `user.role === "admin"`. That's tidiness, not the access control — hiding the tab protects nothing by itself; the real gate is `require_admin` on the backend and `useAdminGuard` on the page itself, so a student typing `/admin` directly still bounces straight back to `/dashboard`.
- [x] `tests/test_admin.py` — non-admin and missing-auth both 403, signup-time bootstrap, retroactive sign-in-time bootstrap (and confirms the *original* token also sees the change, since `get_current_user` re-reads role from the DB rather than trusting a stale JWT claim), and case-insensitive email matching

### Day 35 — User management table (list, search, disable)
- [x] `users.is_active` (migration `5c9e2a7f1d34`, default `true`) — the "disable" half of the task needed a column that never existed before. Checked in `get_current_user` (Day 5) alongside the role lookup, so disabling takes effect immediately on a user's *existing* token, not just the next time they'd sign in — same DB-re-read mechanism Day 34's role check already relies on.
- [x] Disabled accounts are also rejected at `/auth/signin` itself (403, "This account has been disabled") — distinct from the generic "invalid email or password" case, since the credentials *were* correct and there's no enumeration risk in saying so once that's established
- [x] `GET /api/admin/users?q=` — search is a case-insensitive email substring match; omitting `q` lists everyone, newest first, capped at 200 (real pagination would matter at real scale, not yet here)
- [x] `POST /api/admin/users/{id}/disable` / `.../enable` — an admin can't disable their own account (400): with a single admin, that would lock everyone out of `/admin` with no way back short of a manual DB edit, which is a worse failure mode than just refusing the action
- [x] `components/admin/UserManagementTable.tsx` — search box, status column, and a disable/enable action per row that's replaced with a plain "You" label on the admin's own row (a UX nicety, not the actual safeguard — the backend's 400 is what actually prevents it)
- [x] `tests/test_admin_users.py` — list/search, the disable → existing-token-now-401 → re-enable → works-again round trip, disabled-account sign-in rejection, the can't-disable-yourself guard, and 404 on a nonexistent user

### Day 36 — Agent usage analytics dashboard (calls per agent, response times)
- [x] `agent_call_logs` table (migration `8a1f4c6b2d90`) — one row per completed graph invocation: `agent_name`, `intent`, `duration_ms`, `success`, `created_at`. Deliberately not foreign-keyed to `messages`/`sessions`: a failed call never produced a message row to join against, and the whole point of this table is to also capture failures, not just successful turns.
- [x] **Found the real choke point first:** `/chat`, `/chat/stream`, and `/voice/chat` all eventually call the graph, but only the first two went through the shared `_run_graph` helper — `voice.py` had its own second, duplicated `campus_ai_graph.ainvoke()` call. Fixed that duplication (`voice.py` now calls `_run_graph` like the other two) *before* adding logging, rather than adding a third copy of a timer into voice.py to match — otherwise voice chat would've stayed invisible to this dashboard, same class of gap as the one Day 31 closed for chat history.
- [x] `app/core/agent_usage.py` — `log_agent_call()` is the Day 31 `_persist_turn`-style best-effort writer (its own short-lived DB session, logs-not-raises on failure) wrapped around `_run_graph`'s `campus_ai_graph.ainvoke()` call with a `time.perf_counter()` timer. A call that raises before the Supervisor's routing decision is trustworthy gets logged under a `"supervisor"` fallback name (`UNROUTED_AGENT_NAME`) with `success=False`, rather than being dropped or attributed to a made-up specialist name.
- [x] `get_agent_usage_summary()` — per-agent aggregates (total/success/failure counts, avg/min/max response time, last-called-at) over a configurable time window. Aggregated in Python after one bounded `SELECT`, not a SQL `GROUP BY`/`AVG` — call volume per agent is small and this sidesteps boolean-aggregation differences between the SQLite tests run against and the Postgres prod runs against, for a query simple enough not to need to be clever. Average/min/max are computed only over *successful* calls — mixing a timed-out call's duration into a "response time" average would understate how fast the agent is when it actually works.
- [x] `GET /api/admin/analytics/agents?hours=24` (admin-only, via the same `require_admin` dependency Day 34 wired up) — `hours` is clamped to `[1, 720]` rather than rejected outright, since a typo'd query param shouldn't 400 a dashboard that's otherwise fine to just clamp.
- [x] `components/admin/AgentAnalyticsPanel.tsx` — a 24h/7d/30d window toggle, a calls-per-agent bar row (plain proportional-width divs, same reasoning as `MonthCalendar`, Day 32: no charting library installable in this sandbox), and a table with calls/failures/avg/min-max/last-call per agent. `/admin` gained a Users/Agent usage tab switcher to hold both this and Day 35's `UserManagementTable` without one page fighting the other for space.
- [x] `tests/test_agent_usage.py` — non-admin rejection, a real `/api/chat` call showing up in the summary with a real (non-negative) duration sample, the `hours` clamp at both ends, and the failure path (a monkeypatched `ainvoke()` raising mid-call lands in the `"supervisor"` bucket with `failure_count` incremented) — plus a narrower check that `voice.py` no longer imports `campus_ai_graph` directly, since exercising real voice transcription needs a live `ASSEMBLYAI_API_KEY` this sandbox doesn't have
- [x] `python3 -m py_compile` across `app`/`tests`/`migrations` and a manual `tsc --noEmit` pass (same sandbox caveats as every frontend day since Day 26) — both clean

### Day 37 — Connector status monitoring (calendar export/email/storage health)
- [x] **Split the checks by what's actually checkable.** Four connectors, three different honesty tradeoffs:
  - **Calendar Export** (ICS) has no external API and no credential — reported `healthy` unconditionally, since there's nothing to misconfigure short of the `icalendar` import itself failing, which would already have crashed the app at startup.
  - **Email (Resend)** — a *configuration* check only (`RESEND_API_KEY` set or not). Deliberately not a live check: actually verifying the key means calling Resend's API on every dashboard load/poll, a real external request with its own cost and failure modes for a page meant to be a quick glance. Whether a configured key is actually *valid* only surfaces the first time `send_email()` really sends something — same tradeoff the stub-mode logging already makes.
  - **File Organizer (Google Drive)** — unlike email, this one *can* be checked without a network call: `GOOGLE_SERVICE_ACCOUNT_FILE` is just local JSON, so parsing it into a real `Credentials` object (no API call, no discovery fetch) tells "not configured" apart from "configured but the key file is broken" — something email's check structurally can't do without actually calling Resend.
  - **Scheduled Jobs (reminders + digest)** — the one check that reflects live process state, not static settings: reads the actual running `AsyncIOScheduler`'s registered jobs via a new `get_scheduler_status()` getter, rather than just confirming "settings say APScheduler should be running."
- [x] `app/core/connector_status.py` — `get_connector_statuses()`, four independent `_*_status()` functions returning `{name, label, status, detail}`. Status values: `healthy` / `configured` / `stub` (not configured, same no-op fallback every connector already had) / `error` (configured but broken).
- [x] `app/core/scheduler.py` gained `get_scheduler_status()` — the one sanctioned read of the module-private `_scheduler`; returns `None` when the scheduler was never started (distinct from "started but has zero jobs", which the connector check treats as its own error case).
- [x] `GET /api/admin/connectors/status` (admin-only) — no `db` dependency, since every check here reads either `settings` or in-process scheduler state, never the database.
- [x] `components/admin/ConnectorStatusPanel.tsx` — a status dot + label + detail line per connector, a manual "Refresh" button, and a "Checked HH:MM:SS" timestamp so a stale read is visibly stale rather than silently trusted. `/admin` gained a third tab (Users / Agent usage / Connectors).
- [x] `tests/test_connector_status.py` — non-admin rejection, all four connectors present, calendar always healthy, email's stub-vs-configured branches (via `patch.object(settings, ...)`), file organizer's stub-vs-error branches (a genuinely malformed key file on disk, not just a mocked exception), and the scheduler reporting healthy with both real job IDs present — exercising the actual APScheduler instance the test session's app started, not a mock.
- [x] `python3 -m py_compile` across `app`/`tests`/`migrations` and a manual `tsc --noEmit` pass — both clean

### Day 38 — Security pass: rate limiting, input validation, secrets audit (Phase 6 begins)
- [x] **In-memory, not Redis-backed — stated up front, not discovered later.** `REDIS_URL` has existed in settings since Day 1, but nothing in this codebase has ever actually connected to Redis with it: LangGraph's checkpointing moved to Postgres on Day 13 (`app/core/checkpointer.py`), and no other caching layer was ever added. Standing up a real Redis connection for rate-limiting alone, in a sandbox that can't verify one is even reachable, would be a bigger and riskier change than this day's scope calls for. `app/core/rate_limit.py`'s sliding-window counters (`_buckets`, a plain `dict[str, deque]`) are per-process — correct for this project's single-worker deployment target (see Day 39), but the first thing to swap for a real multi-worker or multi-instance deployment is this module's `_buckets` for a Redis- or Postgres-backed store behind the same `_check()` interface.
- [x] `RateLimitByIP(times, seconds)` / `RateLimitByUser(times, seconds)` — two small callable-class FastAPI dependencies, keyed by `route path + IP` or `route path + user id` respectively. By-IP is for the two routes that run *before* there's any authenticated user to key on; by-user is for everything that already requires login, so one person's heavy use can't get an entire shared office/NAT IP rate-limited, and `RateLimitByUser` depends on `get_current_user` itself — FastAPI's per-request dependency cache means that costs zero extra DB lookups on routes whose handler already depends on `get_current_user` directly, which is every route this day touches.
- [x] Wired in: `POST /auth/signup` (5/min by IP — the account-creation/credential-stuffing target), `POST /auth/signin` (10/min by IP — brute force, looser than signup since a human mistyping a password a few times shouldn't get locked out), `POST /chat` and `POST /chat/stream` (20/min by user each, independent buckets per route since they're different call patterns), `POST /voice/chat` (10/min by user — tighter, since a voice turn is heavier: transcription plus the same graph run `/chat` does). Every limiter returns `429` with a real `Retry-After` header, not just a bare rejection.
- [x] **Input validation gap closed:** `ChatRequest.message`/`.session_id` (`app/api/routes/agent.py`) were unbounded strings since Day 5 — nothing stopped a client handing an arbitrarily huge string straight into the LLM prompt (cost, latency, context-window abuse) before this. Now `Field(min_length=1, max_length=4000)` on `message`, `max_length=128` on `session_id`. Document uploads (Day 16) already had this kind of bound via `storage.py`'s `validate_upload`; chat never got the equivalent until now.
- [x] **Second input-validation gap, found by comparison:** `voice.py`'s `await audio.read()` had no size check at all, unlike the document upload path. Added `MAX_AUDIO_SIZE_BYTES = 25MB`, checked right after the read and before the file ever touches disk or gets sent to AssemblyAI — a `413` with the actual size in the message, same style as `storage.py`'s existing `ValueError` message for oversized documents.
- [x] **Secrets audit:** `backend/.gitignore` was missing `uploads/` (real user-submitted documents — not secrets exactly, but user content with no business in git history) and `secrets/` (where setup docs since Day 23 have told people to put the Google service-account JSON key — without this entry, a literal `git add .` after following that instruction would commit a real credential). Also checked and confirmed already-safe, no change needed: `JWT_SECRET_KEY` has no insecure default (`config.py` requires it), and `main.py`'s request-logging middleware never logs request bodies, so passwords/tokens never land in logs.
- [x] `tests/test_rate_limiting.py` — proves the 429-with-`Retry-After` shape for signup/signin; that `/chat`'s limiter is genuinely per-user (two different logged-in users, same TestClient "IP", both get a full independent budget) rather than per-IP; that `/chat` and `/chat/stream` have independent buckets; the message/session_id length bounds (empty, over-cap, and exactly-at-cap); and the voice audio size cap's reject/accept boundary plus its own per-user rate limit. Needed one addition to `tests/conftest.py`: an autouse fixture clearing `rate_limit._buckets` before/after every test, since the module-level bucket dict is otherwise shared across this whole session-scoped `TestClient` and an early test's signups would start starving a much later, unrelated test's `auth_headers` fixture.
- [x] `python3 -m py_compile` across `app`/`tests`/`migrations` — clean. No frontend changes this day (a backend-only security pass), so no `tsc --noEmit` pass was needed.

## Next: Day 39
Deployment — backend on Railway/Render/Vultr, frontend on Vercel. The close of Phase 6 is Day 40 (final QA, demo script, README + docs wrap-up).