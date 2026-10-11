import os
import sys

# ---------------------------------------------------------------------------
# Test isolation. This block runs BEFORE the app (and its settings) is
# imported, and environment variables beat `.env`, so it is what decides how
# the whole suite behaves, whatever is in your `.env`:
#
#   * No LLM / embedding / LangSmith calls. With AIML_API_KEY empty the app
#     uses its built-in offline paths (keyword intent classifier, fallback
#     embeddings, stub agent replies), so tests are fast, free, deterministic
#     and never flake on a model's mood. The tests that really need the
#     model are marked `live` and only run with `pytest -m live`.
#   * Never the development database. Tests create users, documents and
#     schedules; point them at their own database with TEST_DATABASE_URL.
# ---------------------------------------------------------------------------
LIVE_RUN = os.environ.get("RUN_LIVE_TESTS") == "1" or "live" in sys.argv

if not LIVE_RUN:
    os.environ["AIML_API_KEY"] = ""
for _var, _value in {
    "LANGCHAIN_TRACING_V2": "false",
    "LANGSMITH_TRACING": "false",
    "LANGCHAIN_API_KEY": "",
    "LANGSMITH_API_KEY": "",
}.items():
    os.environ[_var] = _value

def _from_dotenv(name: str) -> str | None:
    """Real environment variables win; otherwise read the value from `.env`.
    (pydantic-settings reads `.env` for the app too, but only later, after
    this guard has already decided, so the guard has to look there itself.)"""
    if os.environ.get(name):
        return os.environ[name]
    try:
        from dotenv import dotenv_values

        return dotenv_values(".env").get(name) or None
    except ImportError:
        return None


_test_db = _from_dotenv("TEST_DATABASE_URL")
if _test_db:
    os.environ["DATABASE_URL"] = _test_db
else:
    _db = _from_dotenv("DATABASE_URL")
    _local = _db and any(h in _db for h in ("@localhost", "@127.0.0.1", "@[::1]"))
    if _db and not _local and os.environ.get("ALLOW_TESTS_ON_DEV_DB") != "1":
        raise SystemExit(
            "\nRefusing to run tests: DATABASE_URL points at a remote database and the "
            "tests would fill it with test users and documents.\n"
            "Add TEST_DATABASE_URL=... to backend/.env (a separate, throwaway database, "
            "e.g. a Neon branch), or set ALLOW_TESTS_ON_DEV_DB=1 if you really mean it.\n"
        )

# Only a safety-net default, so `pytest` with no .env at all doesn't crash at import.
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import _buckets
from app.main import app


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