"""Day 38 — security pass: rate limiting + input validation.

Secrets-audit (backend/.gitignore) has no code behavior to test, so it's
documented in README.md instead; nothing to assert here.
"""
import uuid
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.core import rate_limit
from app.core.config import settings


@pytest.fixture(autouse=True)
def _frozen_limiter_clock():
    """The limiter uses a 60-second sliding window. Tests that send 10-20
    requests to hit the limit are only valid if all of them land inside one
    window — with a slow database (or real LLM calls) the early requests
    would otherwise expire before the last one is sent and the expected 429
    never comes. Freezing the limiter's own clock makes that independent of
    how fast the machine or network is."""
    with patch("app.core.rate_limit._now", return_value=1000.0):
        yield


def _signup(client, email: str | None = None):
    return client.post(
        "/api/auth/signup",
        json={"email": email or f"ratelimit-{uuid.uuid4()}@campus.ai", "password": "testpass123"},
    )


# ---------------------------------------------------------------------------
# Rate limiting — /auth/signup, /auth/signin (by IP)
# ---------------------------------------------------------------------------


def test_signup_allows_up_to_the_limit_then_429s(client):
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


def test_signin_is_rate_limited_independently_of_signup(client):
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


def test_chat_rate_limit_is_per_user_not_per_ip(client):
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


def test_chat_and_chat_stream_have_independent_buckets(client, auth_headers):
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


def test_voice_chat_is_rate_limited_by_user(client, auth_headers):
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
# Limiter internals — client IP resolution, window expiry, idle-key sweep
# ---------------------------------------------------------------------------


def _fake_request(forwarded: str | None, peer: str | None = "10.0.0.5"):
    headers = {"x-forwarded-for": forwarded} if forwarded is not None else {}
    client = SimpleNamespace(host=peer) if peer else None
    return SimpleNamespace(headers=headers, client=client)


def test_client_ip_ignores_x_forwarded_for_by_default():
    with patch.object(settings, "TRUSTED_PROXY_COUNT", 0):
        assert rate_limit._client_ip(_fake_request("1.2.3.4")) == "10.0.0.5"


def test_client_ip_uses_the_entry_added_by_the_trusted_proxy():
    # A client can forge the left-hand entries; the trusted proxy appends the
    # address it actually saw, so with one trusted proxy the rightmost wins.
    with patch.object(settings, "TRUSTED_PROXY_COUNT", 1):
        assert rate_limit._client_ip(_fake_request("6.6.6.6, 203.0.113.9")) == "203.0.113.9"


def test_client_ip_skips_two_trusted_hops():
    with patch.object(settings, "TRUSTED_PROXY_COUNT", 2):
        assert rate_limit._client_ip(_fake_request("6.6.6.6, 203.0.113.9, 10.1.1.1")) == "203.0.113.9"


def test_client_ip_falls_back_to_peer_when_header_is_missing_or_too_short():
    with patch.object(settings, "TRUSTED_PROXY_COUNT", 2):
        assert rate_limit._client_ip(_fake_request(None)) == "10.0.0.5"
        assert rate_limit._client_ip(_fake_request("203.0.113.9")) == "10.0.0.5"
    with patch.object(settings, "TRUSTED_PROXY_COUNT", 0):
        assert rate_limit._client_ip(_fake_request(None, peer=None)) == "unknown"


def test_limiter_allows_again_once_the_window_has_passed():
    from fastapi import HTTPException

    clock = {"t": 1000.0}
    with patch("app.core.rate_limit._now", side_effect=lambda: clock["t"]):
        for _ in range(3):
            rate_limit._check("test:window", times=3, seconds=60)

        with pytest.raises(HTTPException) as blocked:
            rate_limit._check("test:window", times=3, seconds=60)
        assert blocked.value.status_code == 429

        clock["t"] += 61
        rate_limit._check("test:window", times=3, seconds=60)  # window passed -> allowed again


def test_sweep_drops_idle_and_empty_keys_but_keeps_recent_ones():
    now = 10_000.0
    rate_limit._buckets["idle"].append(now - rate_limit._MAX_IDLE_SECONDS - 1)
    rate_limit._buckets["recent"].append(now - 5)
    rate_limit._buckets["empty"].clear()  # touching a defaultdict key creates an empty bucket

    rate_limit._sweep(now)

    assert "idle" not in rate_limit._buckets
    assert "empty" not in rate_limit._buckets
    assert "recent" in rate_limit._buckets


def test_check_runs_the_sweep_periodically():
    rate_limit._buckets["stale"].append(0.0)
    with patch("app.core.rate_limit._now", return_value=rate_limit._MAX_IDLE_SECONDS + 10.0), patch.object(
        rate_limit, "_calls_since_sweep", rate_limit._SWEEP_EVERY_N_CALLS - 1
    ):
        rate_limit._check("test:trigger", times=5, seconds=60)

    assert "stale" not in rate_limit._buckets
