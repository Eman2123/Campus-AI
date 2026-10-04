import os

# Only a safety-net default — if your `.env` already has DATABASE_URL
# and JWT_SECRET_KEY (it should, from Day 1), those are used as-is:
# pydantic-settings reads .env automatically. This just stops an
# import-time crash for someone running `pytest` with no .env at all.
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