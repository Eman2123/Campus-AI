from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    ENV: str = "development"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Admin role-gating (Day 34) — the only way a user becomes an admin.
    # Checked at signup and signin (see app/core/admin_bootstrap.py); no
    # self-service "become admin" path exists anywhere. Same JSON-array
    # env format as CORS_ORIGINS, e.g. ADMIN_EMAILS=["you@school.edu"].
    ADMIN_EMAILS: list[str] = []

    # Database (Neon Postgres)
    DATABASE_URL: str

    # Document storage (Day 16) — local disk for now. Swappable later for
    # cloud storage (e.g. Supabase Storage) without changing callers —
    # see app/core/storage.py.
    UPLOAD_DIR: str = "./uploads"

    # RAG pipeline (Day 17) — embeddings via AIML's OpenAI-compatible
    # endpoint. EMBEDDING_DIM must match the model: text-embedding-3-small
    # is 1536-dim. Changing the model later requires a migration if the
    # dimension changes, since pgvector columns are fixed-size.
    AIML_EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIM: int = 1536
    CHUNK_SIZE_WORDS: int = 300
    CHUNK_OVERLAP_WORDS: int = 50
    # Day 21 re-chunking pass — a trailing chunk shorter than this gets
    # merged into the one before it instead of standing alone (avoids
    # near-empty chunks that add retrieval noise without adding signal).
    MIN_CHUNK_WORDS: int = 40

    # Document Agent retrieval (Day 18) — how many nearest chunks (by cosine
    # distance) to pull into the grounded-QA context per question.
    DOCUMENT_RETRIEVAL_TOP_K: int = 5    # Day 21 retrieval-quality tuning — chunks farther than this (pgvector
    # cosine distance; 0 = identical, 1 = orthogonal, 2 = opposite) get
    # dropped instead of always filling out top_k regardless of quality.
    # Only enforced when AIML_API_KEY is set: the no-key fallback embedding
    # (app/core/embeddings.py) is pure per-text random noise, so distances
    # from it aren't semantically meaningful and this threshold would just
    # reject good matches at random rather than actually improve anything.
    DOCUMENT_MAX_COSINE_DISTANCE: float = 0.9

    # Redis (session cache / LangGraph checkpointing)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Email (Day 20) — Resend's transactional API. SendGrid was the PRD's
    # documented alternative; picking one concretely here follows the same
    # pattern as AIML for the LLM (see app/core/email.py for the swap note).
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Campus AI <onboarding@resend.dev>"

    # Deadline Reminders (Day 20) — APScheduler runs the reminder sweep once
    # a day at this UTC hour; anything with source="deadline" due within the
    # next REMINDER_LEAD_TIME_HOURS (and not already reminded) gets emailed.
    REMINDER_LEAD_TIME_HOURS: int = 48
    REMINDER_CHECK_HOUR_UTC: int = 13

    # Email Digest (Day 22) — a recurring daily briefing of everything due
    # in the next DIGEST_LOOKAHEAD_DAYS (deadlines + study sessions), sent
    # once a day at DIGEST_CHECK_HOUR_UTC. Runs before REMINDER_CHECK_HOUR_UTC
    # (a morning briefing vs. an afternoon nag) — distinct from Deadline
    # Reminders, which only fires once per specific deadline.
    DIGEST_LOOKAHEAD_DAYS: int = 7
    DIGEST_CHECK_HOUR_UTC: int = 8

    # File Organizer (Day 23) — a single service account's own Drive, not
    # any student's. Leave blank to skip Drive filing entirely; subject
    # classification still runs and gets saved either way.
    GOOGLE_SERVICE_ACCOUNT_FILE: str = ""
    GOOGLE_DRIVE_ROOT_FOLDER_NAME: str = "Campus AI"

    # Streaming chat (Day 30) — SSE delivery is chunked-word delivery of
    # the graph's already-complete reply, not true token-by-token LLM
    # generation (see api/routes/agent.py's chat_stream for why). These
    # two settings only control the perceived "typewriter" pacing.
    STREAM_CHUNK_WORDS: int = 3
    STREAM_CHUNK_DELAY_MS: int = 40

    # LLM / Voice providers (wired in later phases)
    AIML_API_KEY: str = ""
    AIML_API_BASE_URL: str = "https://api.aimlapi.com/v1"
    AIML_MODEL: str = "gpt-4o-mini"
    ASSEMBLYAI_API_KEY: str = ""

    # Observability (Day 15) — optional. LangSmith auto-instruments
    # LangGraph/LangChain calls via these env vars; leave LANGCHAIN_API_KEY
    # blank to skip tracing entirely (custom logging below covers the basics).
    LANGCHAIN_TRACING_V2: bool = False
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "campus-ai"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
