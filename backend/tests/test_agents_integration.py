"""
Day 14 — Integration testing: all core agents via real graph traversal.

These run the actual compiled LangGraph graph (app.agents.graph.build_graph),
not mocks of the graph itself. Where a test needs a specific LLM output
(e.g. to force the Feedback -> Homework loop), only the network-boundary
`chat_completion` call is mocked — routing, state, and graph wiring are real.

NOTE: checkpointing is genuinely durable now (Day 13, Postgres-backed).
That's a feature, not a test bug — but it means every thread_id used here
must be unique per run (uuid4), or a fixed thread_id would keep
accumulating history across repeated test runs and these assertions
would fail for the RIGHT reason (state really did persist).
"""
import uuid
from unittest.mock import patch

import pytest

from app.agents.graph import build_graph


def new_thread_id(label: str) -> dict:
    return {"configurable": {"thread_id": f"{label}-{uuid.uuid4()}"}}


@pytest.fixture
def graph():
    return build_graph()


@pytest.mark.parametrize(
    "message,expected_agent",
    [
        ("explain how photosynthesis works", "research"),
        ("help me solve this homework: 2x + 4 = 10", "homework"),
        ("quiz me on the French Revolution", "quiz"),
        ("summarize my notes on cell biology", "notes"),
        ("make flashcards for the water cycle", "flashcard"),
        ("please grade my answer to question 3", "feedback"),
        ("answer this using my uploaded file", "document"),
    ],
)
def test_core_agents_route_correctly(graph, message, expected_agent):
    """Each of the 6 core agents (Phase 2, Days 7-12) plus Document (Day 18)
    is reachable via real Supervisor classification + real conditional
    routing. Planner (Day 19) needs a real user_id + DB write, so it has
    its own dedicated tests in test_planner_agent.py instead."""
    result = graph.invoke(
        {"messages": [{"role": "user", "content": message}], "user_id": "test-user"},
        config=new_thread_id(f"day14-{expected_agent}"),
    )
    assert result["agent_used"] == expected_agent
    assert result["intent"] == expected_agent
    assert len(result["messages"]) >= 2  # at least the user turn + one reply


def test_route_after_supervisor_falls_back_to_pending_response(graph):
    """All 8 intents (research/homework/quiz/notes/flashcard/feedback/
    document/planner) are real nodes now (Days 7-12, 18, 19) — nothing
    routes to the generic stub anymore in normal operation. The fallback
    itself stays as a safety net for a genuinely unrecognized intent, so
    test it directly rather than via the classifier (which can never
    actually produce one)."""
    from app.agents.graph import route_after_supervisor

    assert route_after_supervisor({"intent": "not-a-real-intent"}) == "pending_response"


def test_feedback_loops_back_to_homework_on_retry(graph):
    """The one loop in the graph (Day 12): Feedback -> Homework when
    the LLM signals NEEDS_RETRY: YES."""
    with patch("app.agents.feedback.chat_completion") as mock_feedback_llm, \
         patch("app.agents.homework.chat_completion") as mock_homework_llm, \
         patch("app.agents.feedback.settings") as mock_settings:
        mock_settings.AIML_API_KEY = "fake-key-for-test"
        mock_feedback_llm.return_value = "That's incorrect.\nNEEDS_RETRY: YES"
        mock_homework_llm.return_value = "Let's try it again, step by step."

        result = graph.invoke(
            {"messages": [{"role": "user", "content": "grade my answer: 2+2=5"}], "user_id": "test-user"},
            config=new_thread_id("day14-feedback-loop"),
        )

        assert result["agent_used"] == "homework"  # last node to run
        assert result["needs_retry"] is True
        assert len(result["messages"]) == 3  # user -> feedback -> homework retry
        assert "NEEDS_RETRY" not in result["messages"][1].content


def test_session_memory_persists_across_turns(graph):
    """Checkpointing (Day 13) — same thread_id should accumulate history
    across separate .invoke() calls within a single test run."""
    config = new_thread_id("day14-memory-test")
    graph.invoke({"messages": [{"role": "user", "content": "explain gravity"}], "user_id": "u1"}, config=config)
    result = graph.invoke({"messages": [{"role": "user", "content": "now quiz me on it"}]}, config=config)
    assert len(result["messages"]) == 4


def test_chat_endpoint_full_http_roundtrip(client, auth_headers):
    """Same coverage as above, but through the real FastAPI route —
    proves auth, request parsing, and the graph all work together."""
    response = client.post(
        "/api/chat",
        json={"message": "explain how gravity works", "session_id": f"day14-http-{uuid.uuid4()}"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["intent"] == "research"
    assert body["agent_used"] == "research"
    assert len(body["reply"]) > 0
