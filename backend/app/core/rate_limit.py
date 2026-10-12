"""Day 38 — rate limiting.

An in-memory sliding-window limiter, not a Redis-backed one. LangGraph's
checkpointing moved to Postgres on Day 13 (see app/core/checkpointer.py),
and no other caching layer exists, so standing up Redis for rate-limiting
alone would be a bigger and riskier change than this module's scope calls
for. The honest limitation this creates: counts are per-process, not
shared across multiple uvicorn workers and reset on restart — fine for
this project's single-worker deployment target (see DEPLOY.md), but the
first thing to swap for a multi-worker or multi-instance deployment is
this module's in-memory `_buckets` for a Redis (or Postgres) backed store
with the same `_check()` interface.
"""
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User

# key -> deque of monotonic timestamps of recent hits within the window.
_buckets: dict[str, deque] = defaultdict(deque)

# Keys that go quiet are dropped by a periodic sweep so a long-running
# process facing many distinct IPs/users doesn't grow `_buckets` forever.
# Every limiter window in this app is far shorter than this, so a key idle
# for this long can never still be inside its window.
_MAX_IDLE_SECONDS = 3600
_SWEEP_EVERY_N_CALLS = 500
_calls_since_sweep = 0


def _now() -> float:
    """Single clock source for the limiter. Tests patch this (rather than
    the global `time.monotonic`) to make window expiry deterministic."""
    return time.monotonic()


def _sweep(now: float) -> None:
    idle_cutoff = now - _MAX_IDLE_SECONDS
    stale = [key for key, bucket in _buckets.items() if not bucket or bucket[-1] < idle_cutoff]
    for key in stale:
        del _buckets[key]


def _check(key: str, times: int, seconds: int) -> None:
    global _calls_since_sweep

    now = _now()

    _calls_since_sweep += 1
    if _calls_since_sweep >= _SWEEP_EVERY_N_CALLS:
        _calls_since_sweep = 0
        _sweep(now)

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


def _client_ip(request: Request) -> str:
    """The caller's IP, for per-IP limits.

    By default only the socket peer address is used, which can't be
    spoofed. When the app sits behind reverse proxies you control, set
    TRUSTED_PROXY_COUNT to how many there are: the real client is then the
    Nth entry from the *right* of X-Forwarded-For (each trusted proxy
    appends the address it saw), so anything a client forges on the left
    is ignored. If the header is missing or shorter than expected, fall
    back to the peer address rather than trusting a partial chain.
    """
    hops = settings.TRUSTED_PROXY_COUNT
    if hops > 0:
        forwarded = request.headers.get("x-forwarded-for", "")
        parts = [part.strip() for part in forwarded.split(",") if part.strip()]
        if len(parts) >= hops:
            return parts[-hops]
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
