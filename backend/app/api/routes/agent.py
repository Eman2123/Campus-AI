import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.agents.graph import campus_ai_graph
from app.api.deps import get_current_user
from app.core.agent_usage import UNROUTED_AGENT_NAME, log_agent_call
from app.core.chat_history import get_or_create_session, save_turn
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.rate_limit import RateLimitByUser
from app.models.user import User

router = APIRouter()
logger = logging.getLogger("campus_ai.chat")

# Day 38 — these were unbounded strings until now: a `message` with no
# max length means a client can hand an arbitrarily huge string straight
# to the LLM prompt (cost, latency, context-window abuse) with nothing
# in the request layer stopping it before that happens. `session_id` is
# attacker-controlled too (it's just a thread-id string, not looked up
# against a real sessions table yet — see line 25's note), so it gets a
# sane bound as well rather than being trusted to stay short.
MAX_MESSAGE_LENGTH = 4000
MAX_SESSION_ID_LENGTH = 128


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    session_id: str = Field(default="dev-session", max_length=MAX_SESSION_ID_LENGTH)
    # real session creation lands with the frontend (Phase 4)


class ChatResponse(BaseModel):
    intent: str
    agent_used: str
    reply: str


async def _run_graph(message: str, session_id: str, user_id: str) -> dict:
    """The one place /chat, /chat/stream, and /voice/chat all actually
    invoke the graph — which makes it the one place Day 36's usage
    logging needs to sit, rather than duplicating a timer into all
    three routes (or three agents/* nodes) individually.
    """
    config = {"configurable": {"thread_id": session_id}}
    start = time.perf_counter()

    try:
        # Day 18: the Document node does real async DB retrieval, so the
        # graph must be driven with ainvoke() here — calling the sync
        # invoke() from inside this already-running event loop would
        # raise "asyncio.run() cannot be called from a running event
        # loop" as soon as a request routes through that node.
        result = await campus_ai_graph.ainvoke(
            {"messages": [{"role": "user", "content": message}], "user_id": user_id},
            config=config,
        )
    except Exception:
        duration_ms = (time.perf_counter() - start) * 1000
        # Whatever raised happened before the Supervisor's routing
        # decision could be trusted (or the graph wouldn't have raised
        # mid-run) — there's no real "agent_used" to attribute this to.
        await log_agent_call(UNROUTED_AGENT_NAME, duration_ms, success=False)
        raise

    duration_ms = (time.perf_counter() - start) * 1000
    await log_agent_call(result.get("agent_used", UNROUTED_AGENT_NAME), duration_ms, success=True, intent=result.get("intent"))
    return result


async def _persist_turn(user_id: uuid.UUID, raw_session_id: str, user_message: str, reply: str, agent_used: str) -> None:
    """Day 31 — closes the gap flagged on Day 28: sessions/messages have
    existed since Day 2 but nothing ever wrote to them. Own DB session,
    same reasoning as the background tasks (Days 17/20/22/23): don't
    depend on a request-scoped session that streaming responses in
    particular can outlive. Best-effort — a failure here shouldn't take
    down a chat reply that already succeeded, so it's logged, not raised.
    """
    try:
        async with AsyncSessionLocal() as db:
            session = await get_or_create_session(db, user_id, raw_session_id)
            await save_turn(db, session, user_message, reply, agent_used)
    except Exception as exc:
        logger.exception("failed to persist chat history for session=%s: %s", raw_session_id, exc)


@router.post(
    "/chat",
    response_model=ChatResponse,
    # Day 38 — by user, not by IP: this route already requires a logged
    # in user, and limiting by user means one person's heavy use can't
    # get a shared office/NAT IP rate-limited for everyone behind it.
    # 20/min is generous for real back-and-forth chat, tight for a script
    # looping requests to run up LLM-API cost.
    dependencies=[Depends(RateLimitByUser(times=20, seconds=60))],
)
async def chat(payload: ChatRequest, current_user: User = Depends(get_current_user)):
    result = await _run_graph(payload.message, payload.session_id, str(current_user.id))
    reply = result["messages"][-1].content
    agent_used = result["agent_used"]

    await _persist_turn(current_user.id, payload.session_id, payload.message, reply, agent_used)

    return ChatResponse(intent=result["intent"], agent_used=agent_used, reply=reply)


def _sse(data: dict, event: str | None = None) -> str:
    prefix = f"event: {event}\n" if event else ""
    return f"{prefix}data: {json.dumps(data)}\n\n"


async def _stream_graph_reply(message: str, session_id: str, user_id: uuid.UUID):
    """Day 30 — streaming response rendering.

    Important honesty note: this is chunked delivery of the graph's
    already-complete reply, not true token-by-token LLM generation.
    Real mid-generation streaming would need LangGraph's astream_events,
    which only captures token deltas from LangChain-wrapped chat models
    (e.g. langchain_openai.ChatOpenAI) — every one of our 8 agent nodes
    calls the raw OpenAI SDK directly instead (a deliberate Day 5
    simplicity choice), so those events never fire. Retrofitting real
    per-token streaming would mean either swapping every agent onto a
    LangChain model wrapper, or duplicating each agent's prompt-building
    logic into a second, streaming-only code path outside the graph —
    both bigger and riskier than one day's scope, and both create room
    for the streaming and non-streaming paths to drift apart.

    What's real here: genuine SSE transport, a real word-chunked
    progressive send, and real incremental rendering on the client. The
    graph itself (routing, side effects like Planner's schedule save,
    fallback handling) is byte-for-byte the same code /api/chat uses —
    zero duplicated agent logic, zero risk of the two endpoints
    disagreeing about what the "real" answer was.
    """
    try:
        result = await _run_graph(message, session_id, str(user_id))
    except Exception as exc:
        logger.exception("chat stream: graph execution failed: %s", exc)
        yield _sse({"message": "Something went wrong generating a response."}, event="error")
        return

    intent = result["intent"]
    agent_used = result["agent_used"]
    reply = result["messages"][-1].content

    words = reply.split(" ")
    chunk_size = max(settings.STREAM_CHUNK_WORDS, 1)
    for i in range(0, len(words), chunk_size):
        chunk_words = words[i : i + chunk_size]
        chunk = " ".join(chunk_words)
        if i + chunk_size < len(words):
            chunk += " "
        yield _sse({"content": chunk}, event="token")
        await asyncio.sleep(settings.STREAM_CHUNK_DELAY_MS / 1000)

    await _persist_turn(user_id, session_id, message, reply, agent_used)

    yield _sse({"intent": intent, "agent_used": agent_used}, event="done")


@router.post(
    "/chat/stream",
    # Day 38 — same reasoning and same bucket shape as /chat above. Note
    # this is a *separate* bucket from /chat (the rate-limit key includes
    # request.url.path), so a user gets 20/min on each endpoint rather
    # than sharing one combined budget — simpler to reason about, and
    # the two endpoints are different enough call patterns (one-shot vs.
    # streamed) that sharing a budget would just confuse whichever one a
    # given frontend happens to call first.
    dependencies=[Depends(RateLimitByUser(times=20, seconds=60))],
)
async def chat_stream(payload: ChatRequest, current_user: User = Depends(get_current_user)):
    """Same request shape as /chat, same graph, same final answer — the
    only difference is *how* the reply reaches the client. Browsers'
    native EventSource can't attach an Authorization header (or even
    make POST requests), so this is meant to be consumed via fetch() +
    a manual ReadableStream reader on the client, not new EventSource()
    — see frontend/lib/chat.ts's streamMessage for that half.
    """
    return StreamingResponse(
        _stream_graph_reply(payload.message, payload.session_id, current_user.id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable proxy buffering if ever deployed behind nginx
        },
    )