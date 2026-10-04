import logging
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from langgraph.checkpoint.memory import MemorySaver

from app.core.config import settings

logger = logging.getLogger(__name__)

# Keeps the real Postgres checkpointer's underlying connection alive for
# the process lifetime — without a live reference somewhere, it's free
# to be garbage-collected, which silently closes the connection.
_open_checkpointer_cms: list = []


def _psycopg_conn_string() -> str:
    """SQLAlchemy/asyncpg needs 'postgresql+asyncpg://...?ssl=require';
    psycopg (used by the LangGraph Postgres checkpointer) needs plain
    'postgresql://...?sslmode=require' — different scheme AND different
    query param name for the same thing. Converting just the scheme and
    leaving `ssl=require` in place makes psycopg reject the URL outright
    (confirmed: raises "invalid URI query parameter: ssl").
    """
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(url)
    query = parse_qs(parsed.query)

    if "ssl" in query:
        query["sslmode"] = query.pop("ssl")

    new_query = urlencode(query, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


def build_default_checkpointer():
    """The checkpointer the graph is *compiled* with at import time —
    always MemorySaver, never Postgres. Import time runs before
    uvicorn's event loop exists, and a real Postgres connection opened
    through a throwaway `asyncio.run()` call right here would be bound
    to that call's event loop, which closes the instant it returns —
    reusing that connection later from the app's real serving loop then
    raises the same "attached to a different event loop" class of error
    `tests/conftest.py` already documents for the SQLAlchemy engine.
    `attach_postgres_checkpointer()` below does the real Postgres setup
    correctly instead, from inside `app.main`'s lifespan — i.e. after
    there's an actual, long-lived running loop to do it in.
    """
    return MemorySaver()


async def attach_postgres_checkpointer(graph) -> None:
    """Swaps `graph`'s placeholder MemorySaver for a real Postgres-backed
    one (the same Neon DB the app already uses), so chat sessions survive
    a process restart. Must be awaited from inside `app.main`'s lifespan,
    not at import time — see `build_default_checkpointer`'s docstring.

    Mutates `graph.checkpointer` in place rather than recompiling the
    graph, so every module that already did
    `from app.agents.graph import campus_ai_graph` sees the swap too —
    they all hold a reference to the same compiled graph object.

    **The actual bug this fixes:** the graph is always driven with
    `ainvoke()` (see `agent.py`'s `_run_graph`), and LangGraph's base
    checkpoint class raises `NotImplementedError` out of `aget_tuple`/
    `aput` unless the checkpointer genuinely implements the *async*
    interface. The old code used the *sync* `PostgresSaver` — it only
    implements the sync interface, so the very first real chat message
    crashed with `NotImplementedError` once Postgres was actually
    reachable (exactly what a real local run hits). This never surfaced
    while building the project because the sandbox it was built in can't
    reach a real Neon DB over the sync psycopg driver either, so the old
    `build_checkpointer()`'s try/except always took the except branch and
    silently fell back to `MemorySaver` — which implements both
    interfaces, so it never exposed the gap. The fix is using
    `AsyncPostgresSaver` instead, which only this day's real deployment
    work (a reachable Postgres) was ever going to catch.

    Falls back to leaving MemorySaver in place on any failure — logged,
    not raised, matching the old code's "degrade gracefully" behavior —
    rather than taking the whole app down over a checkpoint store that's
    allowed to be unavailable.
    """
    try:
        from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

        conn_string = _psycopg_conn_string()
        saver_cm = AsyncPostgresSaver.from_conn_string(conn_string)
        saver = await saver_cm.__aenter__()
        _open_checkpointer_cms.append(saver_cm)  # prevent GC from closing the connection
        await saver.setup()  # creates the checkpoint tables on first run

        graph.checkpointer = saver
        logger.info("Using Postgres-backed checkpointing (Neon)")
    except Exception as exc:
        logger.warning(
            "Postgres checkpointer unavailable (%s) — staying on in-memory checkpointing. "
            "Sessions will NOT survive a process restart.",
            exc,
        )