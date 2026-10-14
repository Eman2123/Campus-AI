"""Day 38 — rate limiting.

An in-memory sliding-window limiter, not a Redis-backed one. `REDIS_URL`
has existed in settings since Day 1, but nothing in this codebase has
ever actually connected to Redis with it — LangGraph's checkpointing
moved to Postgres on Day 13 (see app/core/checkpointer.py), and no
other caching layer was ever added. Standing up a real Redis connection
for rate-limiting alone, in a sandbox that can't verify one is even
reachable, would be a bigger and riskier change than this day's scope
calls for. The honest limitation this creates: counts are per-process,
not shared across multiple uvicorn workers — fine for this project's
single-worker deployment target (see the Day 39 deployment notes),
but the first thing to swap for a real multi-worker or multi-instance
deployment is this module's in-memory `_buckets` for a Redis (or
Postgres) backed store with the same `_check()` interface.
"""
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.models.user import User

# key -> deque of monotonic timestamps of recent hits within the window.
_buckets: dict[str, deque] = defaultdict(deque)
# key -> monotonic time after which every hit in its bucket has expired.
# Used by _prune() so keys that go quiet (one-off IPs, deleted users)
# don't pile up for the life of the process.
_expires_at: dict[str, float] = {}
_PRUNE_EVERY_SECONDS = 60.0
_last_prune = 0.0


def _prune(now: float) -> None:
    """Drop buckets whose window has fully passed. Runs at most once per
    _PRUNE_EVERY_SECONDS, so the cost is amortised across requests."""
    global _last_prune
    if now - _last_prune < _PRUNE_EVERY_SECONDS:
        return
    _last_prune = now
    for key in [k for k, expires in _expires_at.items() if expires <= now]:
        _expires_at.pop(key, None)
        _buckets.pop(key, None)


def _check(key: str, times: int, seconds: int) -> None:
    now = time.monotonic()
    _prune(now)
    bucket = _buckets[key]
    cutoff = now - seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= times:
        retry_after = max(1, int(bucket[0] + seconds - now))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests — please slow down and try again shortly.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)
    _expires_at[key] = max(_expires_at.get(key, 0.0), now + seconds)


def _client_ip(request: Request) -> str:
    # request.client.host is whatever the ASGI server reports. Behind a
    # reverse proxy (Render, FastAPI Cloud, ...) that would be the proxy's
    # own address for every user — one shared bucket. So the container
    # starts uvicorn with --proxy-headers and --forwarded-allow-ips
    # (FORWARDED_ALLOW_IPS, see backend/Dockerfile and DEPLOY.md), which
    # makes uvicorn rewrite client.host from X-Forwarded-For, but only for
    # requests coming from a trusted proxy. We deliberately don't parse
    # X-Forwarded-For here: that would trust a client-supplied header.
    return request.client.host if request.client else "unknown"


class RateLimitByIP:
    """Rate-limits by client IP + route — for endpoints called before
    there's any authenticated user to key on (signup, signin). Used as
    `Depends(RateLimitByIP(times=5, seconds=60))`.
    """

    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds

    def __call__(self, request: Request) -> None:
        key = f"ip:{request.url.path}:{_client_ip(request)}"
        _check(key, self.times, self.seconds)


class RateLimitByUser:
    """Rate-limits by authenticated user + route — for endpoints that
    already require a logged-in user (chat, voice chat). Depends on
    get_current_user itself, so FastAPI's per-request dependency cache
    means this doesn't cost a second DB lookup when the route handler
    also depends on get_current_user directly (the common case).
    """

    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds

    def __call__(self, request: Request, current_user: User = Depends(get_current_user)) -> None:
        key = f"user:{request.url.path}:{current_user.id}"
        _check(key, self.times, self.seconds)