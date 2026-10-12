import asyncio
import os
import sys
from urllib.parse import urlparse

# Only a safety-net default — if your `.env` already has DATABASE_URL
# and JWT_SECRET_KEY (it should, from Day 1), those are used as-is:
# pydantic-settings reads .env automatically. This just stops an
# import-time crash for someone running `pytest` with no .env at all.
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

# Everything below must run BEFORE `app` is imported: pydantic-settings
# gives real environment variables priority over `.env`, so setting them
# here is what makes the whole suite pick them up.

# psycopg's async mode (used by the LangGraph Postgres checkpointer) can't
# run on Windows' default ProactorEventLoop; without this the checkpointer
# silently falls back to MemorySaver and its test fails on Windows only.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Point the suite at a throwaway database instead of the one in `.env`.
# Tests sign up real users and upload real documents, so without this they
# write into whatever DATABASE_URL points at (e.g. your production Neon DB).
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]

# Hermetic by default: no real LLM / embedding / speech / email / Drive /
# LangSmith traffic. The app has deterministic no-key fallbacks for all of
# them (keyword intent routing, heuristic subject tagging, hash-based
# embeddings, logged-only emails), and tests that need a "real key" path
# patch `settings` themselves. Real calls made every `/chat` take seconds,
# which both made the suite take ~50 minutes and let the 60-second
# rate-limit windows expire mid-test. Set TEST_WITH_REAL_AI=1 to opt out.
if os.environ.get("TEST_WITH_REAL_AI") != "1":
    for _name in (
        "AIML_API_KEY",
        "ASSEMBLYAI_API_KEY",
        "RESEND_API_KEY",
        "GOOGLE_SERVICE_ACCOUNT_FILE",
        "LANGCHAIN_API_KEY",
    ):
        os.environ[_name] = ""
    os.environ["LANGCHAIN_TRACING_V2"] = "false"
    os.environ["LANGSMITH_TRACING"] = "false"

# Tests create documents and then check them immediately; a startup sweep
# re-processing leftovers from earlier runs would only add noise.
os.environ["RECOVER_STUCK_DOCUMENTS_ON_STARTUP"] = "false"

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import _buckets
from app.main import app


def pytest_report_header(config):
    """Shows which database the suite is about to write test users and
    documents into, so pointing it at the wrong one is hard to miss."""
    from app.core.config import settings

    host = urlparse(settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")).hostname
    if os.environ.get("TEST_DATABASE_URL"):
        db_line = f"campus-ai tests: database host = {host} (TEST_DATABASE_URL)"
    else:
        db_line = (
            f"campus-ai tests: database host = {host} (from DATABASE_URL / .env) — "
            "WARNING: tests create real rows there; set TEST_DATABASE_URL to use a separate database"
        )
    ai_line = (
        "campus-ai tests: REAL external AI/email calls enabled (TEST_WITH_REAL_AI=1)"
        if os.environ.get("TEST_WITH_REAL_AI") == "1"
        else "campus-ai tests: external AI/email calls disabled (stubs + fallbacks)"
    )
    return [db_line, ai_line]


@pytest.fixture(autouse=True)
def _reset_rate_limit_buckets():
    """Day 38 — app/core/rate_limit.py's `_buckets` is module-level state,
    shared across every test in this session (the `client` fixture below
    is session-scoped on purpose — see its own docstring). Without this,
    an early test's signups/signins/chats would eat into the same
    IP/user+route buckets a later, unrelated test relies on — e.g. the
    5/min signup limit would start 429-ing `auth_headers` itself a few
    tests in, since Starlette's TestClient reports the same client host
    for every request. This isn't loosening the real limiter (nothing in
    app/core/rate_limit.py changes); it's giving each test the same clean
    slate production code gets implicitly from the limiter being an
    in-memory dict in a fresh process per real deployment.
    """
    _buckets.clear()
    yield
    _buckets.clear()


@pytest.fixture(scope="session")
def client():
    # Session-scoped: the app's SQLAlchemy async engine is created once at
    # import time and bound to whichever event loop first uses it. A fresh
    # `with TestClient(app)` per test creates a fresh event loop each time,
    # which then conflicts with that already-bound engine ("attached to a
    # different loop"). Sharing one TestClient (and therefore one loop)
    # across the whole test session avoids that.
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client):
    """A real signed-up user's auth header — not a mocked dependency, so
    tests exercise the actual JWT + DB-backed auth path end-to-end, and
    different calls to this fixture give genuinely different users
    (needed for per-user isolation tests)."""
    email = f"test-{uuid.uuid4()}@campus.ai"
    resp = client.post("/api/auth/signup", json={"email": email, "password": "testpass123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}