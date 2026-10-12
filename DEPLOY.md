# Deploying Campus AI

Recommended setup: **Neon** (database) → **FastAPI Cloud** (backend; Render/Docker also work) → **Vercel** (frontend).
Deploy in that order, because each step needs the URL from the previous one.

---

## 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string and convert it for the async driver:
   ```text
   postgresql+asyncpg://USER:PASSWORD@HOST/DBNAME?ssl=require
   ```
3. Enable pgvector (once, in the Neon SQL editor):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Create the tables from your machine (with `DATABASE_URL` pointing at Neon):
   ```bash
   cd backend
   alembic upgrade head
   ```

> Run `alembic upgrade head` again **before** deploying any update that adds migrations.

---

## 2. Backend (FastAPI Cloud)

`backend/pyproject.toml` declares the dependencies and the entrypoint (`app.main:app`), so the app deploys straight from the `backend` folder.

```bash
cd backend
pip install fastapi-cloud-cli      # or: pip install "fastapi[standard]"
fastapi login                      # opens the browser to authorise the CLI
```

Set the environment variables (use `--secret` for anything sensitive):

```bash
fastapi cloud env set --secret DATABASE_URL "postgresql+asyncpg://USER:PASSWORD@HOST/DB?ssl=require"
fastapi cloud env set --secret JWT_SECRET_KEY "<long random string>"
fastapi cloud env set --secret AIML_API_KEY "<your LLM key>"
fastapi cloud env set CORS_ORIGINS '["https://your-frontend.vercel.app"]'
fastapi cloud env set FRONTEND_URL "https://your-frontend.vercel.app"
fastapi cloud env set ADMIN_EMAILS '["you@example.com"]'
```

Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `ASSEMBLYAI_API_KEY`, `ELEVENLABS_API_KEY`, `GOOGLE_CLIENT_ID`.

Deploy:

```bash
fastapi deploy
```

Then check `https://<your-app>.fastapicloud.dev/api/health/ready`; it should report `AsyncPostgresSaver`.

Notes:
- FastAPI Cloud does **not** run `alembic upgrade head` for you. Run it from your machine against Neon (step 1) before deploying, and again before any update that adds migrations.
- Uploaded files go to local disk and are lost on redeploy/scale events; fine for a demo, not for real use.
- If the app scales to zero when idle, the in-process reminder/digest scheduler only runs while it is awake.
- Keep a single instance: the rate limiter counts in memory.

### Alternative: Render / Docker

The repository includes `backend/Dockerfile`, which applies migrations and then starts Uvicorn on `$PORT`.

#### Render

1. **New → Web Service**, connect the GitHub repo.
2. **Root directory:** `backend` · **Runtime:** Docker.
3. Add environment variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | your Neon `postgresql+asyncpg://…` URL |
   | `JWT_SECRET_KEY` | a long random string (e.g. `openssl rand -hex 32`) |
   | `CORS_ORIGINS` | `["https://your-frontend.vercel.app"]` |
   | `FRONTEND_URL` | `https://your-frontend.vercel.app` |
   | `ADMIN_EMAILS` | `["you@example.com"]` |
   | `AIML_API_KEY` | your LLM key |
   | `RESEND_API_KEY` · `EMAIL_FROM` | optional, for real emails |
   | `ASSEMBLYAI_API_KEY` | optional, for voice |
   | `ELEVENLABS_API_KEY` | optional, for spoken replies (Read aloud, Talk mode) |
   | `GOOGLE_CLIENT_ID` | optional, for Google sign-in |

4. Deploy, then check:
   ```text
   https://your-backend.onrender.com/api/health/ready
   ```
   It should return `{"status": "ready", "checkpointer": "AsyncPostgresSaver"}`.
   `MemorySaver` means the Postgres checkpointer couldn't connect, so chat memory will not survive restarts.

#### Docker (manual)

```bash
cd backend
docker build -t campus-ai-backend .
docker run --env-file .env -p 8000:8000 campus-ai-backend
```

#### Notes

- Run **one worker/instance**: the rate limiter keeps its counters in memory.
- Uploaded files are written to `UPLOAD_DIR` on local disk. On hosts with an ephemeral filesystem (Render free tier) they disappear on redeploy; attach a persistent disk or move storage to object storage for real use.
- Free tiers sleep when idle, so the first request after a pause can be slow.

---

## 3. Frontend (Vercel)

1. **Add New → Project**, import the GitHub repo.
2. **Root directory:** `frontend` · Framework: Next.js (auto-detected).
3. Environment variables:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE_URL` | `https://your-backend.onrender.com` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | optional, same as the backend `GOOGLE_CLIENT_ID` |

4. Deploy. If your frontend URL changed, update `CORS_ORIGINS` and `FRONTEND_URL` on the backend and redeploy it.

> `NEXT_PUBLIC_*` values are baked in at build time. Redeploy the frontend after changing them.

---

## 4. Google sign-in (optional)

1. In Google Cloud Console create an OAuth **Web client ID**.
2. Add your frontend URL under **Authorised JavaScript origins**.
3. Use the same client ID for `GOOGLE_CLIENT_ID` (backend) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (frontend).

---

## 5. Post-deploy checklist

- [ ] `GET /api/health` and `/api/health/ready` look healthy
- [ ] Sign up, then sign in on the deployed frontend
- [ ] Your email in `ADMIN_EMAILS` can open `/admin`
- [ ] Upload a document and ask a question about it
- [ ] Chat history is still there after a backend restart
- [ ] Password-reset email arrives (needs `RESEND_API_KEY`)
- [ ] The token used for deployment/CI has been revoked or rotated

---

## Troubleshooting

| Problem | Fix |
|---|---|
| CORS error in the browser | `CORS_ORIGINS` must exactly match the frontend origin (no trailing slash), as a JSON list |
| Frontend calls `localhost:8000` | `NEXT_PUBLIC_API_BASE_URL` wasn't set at build time; set it and redeploy |
| `type "vector" does not exist` | Run `CREATE EXTENSION vector;` on the database, then `alembic upgrade head` |
| `column ... does not exist` | A migration is missing; run `alembic upgrade head` |
| Database connection fails | Check the `postgresql+asyncpg://` prefix and `?ssl=require` for Neon |
| Reset emails don't arrive | `RESEND_API_KEY` is empty or the sender domain isn't verified |
