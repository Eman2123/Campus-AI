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
# Never explicitly pruned between requests for keys that go quiet — an
# old IP's empty-but-present deque is cheap (a handful of bytes), but a
# process that runs for a very long time against a very large number of
# distinct IPs/users will see this dict grow unbounded. Acceptable for
# this project's scale; a Redis-backed store would get TTL-based
# expiry for free instead.
_buckets: dict[str, deque] = defaultdict(deque)


def _check(key: str, times: int, seconds: int) -> None:
    now = time.monotonic()
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
    # No reverse-proxy X-Forwarded-For trust configured — this project
    # has no documented reverse-proxy deployment yet (Day 39 picks a
    # host), so trusting that header here would let a client spoof a
    # different rate-limit bucket for itself. request.client.host is
    # what the ASGI server itself observed, which can't be spoofed the
    # same way.
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