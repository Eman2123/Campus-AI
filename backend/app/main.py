import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

import openai
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.agents.graph import campus_ai_graph
from app.core.checkpointer import attach_postgres_checkpointer
from app.core.config import settings
from app.core.document_recovery import recover_stuck_documents
from app.core.logging_config import setup_logging
from app.core.scheduler import start_scheduler, stop_scheduler
from app.api.routes import health, auth, agent, voice, documents, schedule, sessions, admin

setup_logging()
logger = logging.getLogger("campus_ai")

# LangSmith reads these from the process environment, not from our
# Settings object directly — propagate them if tracing is enabled.
if settings.LANGCHAIN_TRACING_V2 and settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
    logger.info("LangSmith tracing enabled (project=%s)", settings.LANGCHAIN_PROJECT)
else:
    logger.info("LangSmith tracing disabled — using custom logging only")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Day 39 fix — must happen here, inside the real running event loop,
    # not at app.agents.graph's import time. See
    # app/core/checkpointer.py's docstrings for why: this is what swaps
    # the graph's safe MemorySaver placeholder for a real Postgres-backed
    # one whenever Neon is actually reachable.
    await attach_postgres_checkpointer(campus_ai_graph)

    # Day 20 — starts the daily deadline-reminder sweep alongside the app;
    # stopped cleanly on shutdown so it doesn't outlive the process (or,
    # in tests, outlive the TestClient session that started it).
    start_scheduler()

    if settings.ENV.lower() == "production" and not os.path.isabs(settings.UPLOAD_DIR):
        logger.warning(
            "UPLOAD_DIR=%r is a relative local path. On hosts with an ephemeral filesystem, "
            "uploaded files are lost on every redeploy — mount a persistent volume and point "
            "UPLOAD_DIR at it (see DEPLOY.md).",
            settings.UPLOAD_DIR,
        )

    # Uploads whose background processing was cut short by an earlier
    # restart get picked up again — in the background, so startup isn't held up.
    recovery_task = None
    if settings.RECOVER_STUCK_DOCUMENTS_ON_STARTUP:
        recovery_task = asyncio.create_task(recover_stuck_documents())

    yield

    if recovery_task is not None and not recovery_task.done():
        recovery_task.cancel()
    stop_scheduler()


app = FastAPI(
    title="Campus AI API",
    version="0.1.0",
    description="Multi-agent student study assistant backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _json_error(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail})


@app.exception_handler(openai.APITimeoutError)
async def _llm_timeout(request: Request, exc: openai.APITimeoutError):
    logger.warning("LLM timeout on %s %s", request.method, request.url.path)
    return _json_error(504, "The AI took too long to respond. Please try again.")


@app.exception_handler(openai.RateLimitError)
async def _llm_rate_limited(request: Request, exc: openai.RateLimitError):
    logger.warning("LLM provider rate limit on %s %s", request.method, request.url.path)
    return _json_error(503, "The AI service is busy right now. Please try again in a moment.")


@app.exception_handler(openai.APIError)
async def _llm_error(request: Request, exc: openai.APIError):
    # Covers connection errors, auth/config problems and provider 5xx. The
    # real cause goes to the logs, never to the client.
    logger.exception("LLM provider error on %s %s: %s", request.method, request.url.path, exc)
    return _json_error(502, "The AI service is unavailable right now. Please try again shortly.")


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return _json_error(500, "Something went wrong on our side.")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(agent.router, prefix="/api", tags=["agent"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(schedule.router, prefix="/api", tags=["schedule"])
app.include_router(sessions.router, prefix="/api", tags=["sessions"])
app.include_router(admin.router, prefix="/api", tags=["admin"])


@app.get("/")
async def root():
    return {"service": "campus-ai-backend", "status": "running"}