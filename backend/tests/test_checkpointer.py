"""Day 39 deployment-readiness fix — the graph used to crash on its very
first real message once Postgres was actually reachable (NotImplementedError
from the base checkpoint class's aget_tuple), because the old code built
a *sync* PostgresSaver for a graph that's always driven with ainvoke().
See app/core/checkpointer.py's docstrings for the full story.
"""
import asyncio
from unittest.mock import patch

from langgraph.checkpoint.memory import MemorySaver

from app.core.checkpointer import attach_postgres_checkpointer, build_default_checkpointer
from app.core.config import settings

# Plain `asyncio.run()` wrappers below, not `async def test_...` — this
# project has no pytest-asyncio installed (no async test exists anywhere
# else in the suite either), and adding a whole new test-only dependency
# just for two cases here isn't worth it when asyncio.run() does the job.


def test_build_default_checkpointer_is_always_memory_saver():
    """The graph must always compile successfully at import time, with
    zero dependency on Postgres being reachable yet."""
    checkpointer = build_default_checkpointer()
    assert isinstance(checkpointer, MemorySaver)


class _FakeGraph:
    def __init__(self, checkpointer):
        self.checkpointer = checkpointer


def test_attach_postgres_checkpointer_falls_back_quietly_on_bad_connection():
    """A bad/unreachable DATABASE_URL shouldn't raise and shouldn't touch
    the graph's existing (working) checkpointer — the old sync code's
    degrade-gracefully behavior, preserved for the new async path."""
    placeholder = MemorySaver()
    graph = _FakeGraph(placeholder)

    with patch.object(settings, "DATABASE_URL", "postgresql+asyncpg://nobody:nowhere@localhost:1/doesnotexist"):
        asyncio.run(attach_postgres_checkpointer(graph))

    # Unreachable DB -> except branch -> graph.checkpointer left exactly
    # as it was, never swapped out for a half-broken connection.
    assert graph.checkpointer is placeholder


def test_attach_postgres_checkpointer_swaps_in_a_real_async_saver():
    """Against the real DATABASE_URL (the same Neon DB every other test
    in this suite already uses), the swap should actually happen, and
    the resulting checkpointer must implement the ASYNC interface — this
    is the exact check that would have caught the original bug: a sync
    PostgresSaver has no `aget_tuple` override at all, so this isinstance
    check (via the aio module's class) is the regression guard.
    """
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

    placeholder = MemorySaver()
    graph = _FakeGraph(placeholder)

    asyncio.run(attach_postgres_checkpointer(graph))

    assert isinstance(graph.checkpointer, AsyncPostgresSaver)