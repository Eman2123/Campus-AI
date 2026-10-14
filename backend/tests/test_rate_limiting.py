"""Day 38 — security pass: rate limiting + input validation.

Secrets-audit (backend/.gitignore) has no code behavior to test, so it's
documented in README.md instead; nothing to assert here.
"""
import uuid

import pytest
from unittest.mock import patch

from app.core.config import settings


def _signup(client, email: str | None = None):
    return client.post(
        "/api/auth/signup",
        json={"email": email or f"ratelimit-{uuid.uuid4()}@campus.ai", "password": "testpass123"},
    )


# ---------------------------------------------------------------------------
# Rate limiting — /auth/signup, /auth/signin (by IP)
# ---------------------------------------------------------------------------


def test_signup_allows_up_to_the_limit_then_429s(client, frozen_limiter_clock):
    # The limiter's `times=5` for signup is a module-level constant set on
    # the route, not something this test can patch independently of the
    # route decorator — so this test proves the shape (N successes then a
    # 429 with Retry-After), not the exact literal "5".
    responses = [_signup(client) for _ in range(5)]
    assert all(r.status_code == 201 for r in responses), [r.text for r in responses]

    blocked = _signup(client)
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
    assert int(blocked.headers["Retry-After"]) >= 1


def test_signin_is_rate_limited_independently_of_signup(client, frozen_limiter_clock):
    email = f"signin-rl-{uuid.uuid4()}@campus.ai"
    assert _signup(client, email).status_code == 201

    # Signup's bucket is keyed by path, so using up signin's budget here
    # should have no effect on a *different* email's ability to sign up.
    for _ in range(10):
        client.post("/api/auth/signin", json={"email": email, "password": "testpass123"})

    blocked = client.post("/api/auth/signin", json={"email": email, "password": "testpass123"})
    assert blocked.status_code == 429

    # A fresh email can still sign up — proves signup's bucket is distinct
    # from signin's, even though both are keyed "by IP" and the TestClient
    # always reports the same IP.
    assert _signup(client).status_code == 201


# ---------------------------------------------------------------------------
# Rate limiting — /chat, /chat/stream, /voice/chat (by user)
# ---------------------------------------------------------------------------


@pytest.fixture
def frozen_limiter_clock(monkeypatch):
    """The limiter counts hits inside a 60-second window. These tests make
    21+ real requests in a row; against a remote database each one takes a
    few seconds, so the window can expire mid-test and the 429 never comes
    (that is what happened on a slow Neon link). Freezing the limiter's own
    clock makes the tests independent of network speed. Only the limiter's
    reference to `time` is replaced, nothing else in the process."""
    from types import SimpleNamespace

    from app.core import rate_limit

    monkeypatch.setattr(rate_limit, "time", SimpleNamespace(monotonic=lambda: 1000.0))


def test_chat_rate_limit_is_per_user_not_per_ip(client, frozen_limiter_clock):
    """Two different logged-in users, same TestClient "IP" — both should
    get their own full budget, because /chat's limiter keys on the
    authenticated user's id, not on request.client.host."""
    email_a = f"chat-rl-a-{uuid.uuid4()}@campus.ai"
    email_b = f"chat-rl-b-{uuid.uuid4()}@campus.ai"
    token_a = _signup(client, email_a).json()["access_token"]
    token_b = _signup(client, email_b).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    for _ in range(20):
        resp = client.post("/api/chat", json={"message": "hi"}, headers=headers_a)
        assert resp.status_code == 200, resp.text

    exhausted = client.post("/api/chat", json={"message": "hi"}, headers=headers_a)
    assert exhausted.status_code == 429

    # User B's budget on the same route is untouched by user A's usage.
    still_fine = client.post("/api/chat", json={"message": "hi"}, headers=headers_b)
    assert still_fine.status_code == 200


def test_chat_and_chat_stream_have_independent_buckets(client, auth_headers, frozen_limiter_clock):
    for _ in range(20):
        resp = client.post("/api/chat", json={"message": "hi"}, headers=auth_headers)
        assert resp.status_code == 200

    assert client.post("/api/chat", json={"message": "hi"}, headers=auth_headers).status_code == 429

    # /chat/stream is a different route (different dependency-cache key:
    # request.url.path), so it isn't affected by /chat's own limiter.
    with client.stream(
        "POST", "/api/chat/stream", json={"message": "hi"}, headers=auth_headers
    ) as resp:
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Input validation — ChatRequest.message / session_id bounds
# ---------------------------------------------------------------------------


def test_chat_rejects_empty_message(client, auth_headers):
    resp = client.post("/api/chat", json={"message": ""}, headers=auth_headers)
    assert resp.status_code == 422


def test_chat_rejects_message_over_the_length_cap(client, auth_headers):
    from app.api.routes.agent import MAX_MESSAGE_LENGTH

    too_long = "a" * (MAX_MESSAGE_LENGTH + 1)
    resp = client.post("/api/chat", json={"message": too_long}, headers=auth_headers)
    assert resp.status_code == 422


def test_chat_rejects_session_id_over_the_length_cap(client, auth_headers):
    from app.api.routes.agent import MAX_SESSION_ID_LENGTH

    too_long_session_id = "s" * (MAX_SESSION_ID_LENGTH + 1)
    resp = client.post(
        "/api/chat", json={"message": "hi", "session_id": too_long_session_id}, headers=auth_headers
    )
    assert resp.status_code == 422


def test_chat_accepts_a_message_right_at_the_cap(client, auth_headers):
    from app.api.routes.agent import MAX_MESSAGE_LENGTH

    exactly_at_cap = "a" * MAX_MESSAGE_LENGTH
    resp = client.post("/api/chat", json={"message": exactly_at_cap}, headers=auth_headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Input validation — voice audio size cap
# ---------------------------------------------------------------------------


def test_voice_chat_rejects_audio_over_the_size_cap(client, auth_headers):
    import app.api.routes.voice as voice_module

    with patch.object(settings, "ASSEMBLYAI_API_KEY", "fake-key-for-test"), patch.object(
        voice_module, "MAX_AUDIO_SIZE_BYTES", 10
    ):
        resp = client.post(
            "/api/voice/chat",
            files={"audio": ("voice.webm", b"this payload is well over ten bytes", "audio/webm")},
            headers=auth_headers,
        )
    assert resp.status_code == 413


def test_voice_chat_accepts_audio_under_the_size_cap(client, auth_headers):
    import app.api.routes.voice as voice_module

    with patch.object(settings, "ASSEMBLYAI_API_KEY", "fake-key-for-test"), patch.object(
        voice_module, "MAX_AUDIO_SIZE_BYTES", 10_000
    ), patch("app.api.routes.voice.transcribe_audio", return_value="what is photosynthesis"):
        resp = client.post(
            "/api/voice/chat",
            files={"audio": ("voice.webm", b"short audio", "audio/webm")},
            headers=auth_headers,
        )
    assert resp.status_code == 200


def test_voice_chat_is_rate_limited_by_user(client, auth_headers, frozen_limiter_clock):
    with patch.object(settings, "ASSEMBLYAI_API_KEY", "fake-key-for-test"), patch(
        "app.api.routes.voice.transcribe_audio", return_value="what is photosynthesis"
    ):
        responses = [
            client.post(
                "/api/voice/chat",
                files={"audio": ("voice.webm", b"fake-audio-bytes", "audio/webm")},
                headers=auth_headers,
            )
            for _ in range(10)
        ]
        assert all(r.status_code == 200 for r in responses), [r.text for r in responses]

        blocked = client.post(
            "/api/voice/chat",
            files={"audio": ("voice.webm", b"fake-audio-bytes", "audio/webm")},
            headers=auth_headers,
        )
    assert blocked.status_code == 429

# ---------------------------------------------------------------------------
# Behind a proxy (uvicorn --proxy-headers) and bucket pruning
# ---------------------------------------------------------------------------


def test_limiter_gives_each_forwarded_client_its_own_bucket():
    """With uvicorn's proxy-headers handling (what the Dockerfile enables),
    request.client.host is the real client from X-Forwarded-For, so one
    user hitting the limit must not lock out another. Built on a tiny app so
    the test doesn't need the database."""
    from fastapi import Depends, FastAPI
    from fastapi.testclient import TestClient
    from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

    from app.core.rate_limit import RateLimitByIP

    tiny = FastAPI()

    @tiny.get("/ping", dependencies=[Depends(RateLimitByIP(times=2, seconds=60))])
    def ping():
        return {"ok": True}

    proxied = TestClient(ProxyHeadersMiddleware(tiny, trusted_hosts="*"))

    def hit(ip: str) -> int:
        return proxied.get("/ping", headers={"X-Forwarded-For": ip}).status_code

    assert [hit("203.0.113.1"), hit("203.0.113.1"), hit("203.0.113.1")] == [200, 200, 429]
    assert hit("203.0.113.2") == 200  # a different real client is unaffected

    # Without trusting the proxy, everyone looks like the same host (the bug).
    untrusted = TestClient(ProxyHeadersMiddleware(tiny, trusted_hosts="10.9.9.9"))
    codes = [untrusted.get("/ping", headers={"X-Forwarded-For": f"198.51.100.{n}"}).status_code for n in range(3)]
    assert codes[-1] == 429


def test_quiet_buckets_are_pruned():
    from app.core import rate_limit

    rate_limit._buckets.clear()
    rate_limit._check("ip:/x:1.1.1.1", times=5, seconds=60)
    rate_limit._check("ip:/x:2.2.2.2", times=5, seconds=60)
    newest = max(b[-1] for b in rate_limit._buckets.values())

    assert rate_limit._prune(newest + 30) == 0  # still inside their 60s window
    assert len(rate_limit._buckets) == 2
    assert rate_limit._prune(newest + 61) == 2  # now quiet: dropped
    assert len(rate_limit._buckets) == 0


def test_dockerfile_starts_uvicorn_with_proxy_headers():
    """Guards the deployment config that makes the limiter per-client."""
    from pathlib import Path

    dockerfile = (Path(__file__).resolve().parent.parent / "Dockerfile").read_text()
    assert "--proxy-headers" in dockerfile
    assert "--forwarded-allow-ips" in dockerfile
    assert "FORWARDED_ALLOW_IPS" in dockerfile
