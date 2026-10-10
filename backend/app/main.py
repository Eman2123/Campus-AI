import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.agents.graph import campus_ai_graph
from app.core.checkpointer import attach_postgres_checkpointer
from app.core.config import settings
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
    yield
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