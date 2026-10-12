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


def test_document_agent_is_reachable_through_the_chat_endpoint(client, auth_headers):
    """Document does async DB retrieval and has no sync implementation, so it
    can't go through the sync `graph.invoke` parametrized test above — drive
    it through the real endpoint (and its event loop) instead."""
    resp = client.post(
        "/api/chat",
        json={"message": "answer this using my uploaded file", "session_id": new_thread_id("day14-document")["configurable"]["thread_id"]},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["agent_used"] == "document"
    assert body["intent"] == "document"


# ---------------------------------------------------------------------------
# Fix 4 — the Feedback agent's grade must reach the student
# ---------------------------------------------------------------------------

GRADE_TEXT = "That's incorrect: 2+2 is 4, not 5."
HOMEWORK_TEXT = "Let's try it again, step by step."


def _mock_feedback_retry(graph_input_text: str = "grade my answer: 2+2=5"):
    """Patches the three LLM boundaries: the supervisor routes to feedback,
    feedback says NEEDS_RETRY: YES, homework answers. Returns the homework mock
    so a test can see what the Homework agent was actually asked."""
    from app.core.config import settings

    homework_llm = patch("app.agents.homework.chat_completion", return_value=HOMEWORK_TEXT)
    return (
        patch.object(settings, "AIML_API_KEY", "fake-key-for-test"),
        patch("app.agents.supervisor.chat_completion", return_value="feedback"),
        patch("app.agents.feedback.chat_completion", return_value=f"{GRADE_TEXT}\nNEEDS_RETRY: YES"),
        homework_llm,
    )


def test_get_last_user_text_returns_the_last_human_message_not_the_last_message():
    from langchain_core.messages import AIMessage, HumanMessage

    from app.agents.supervisor import get_last_user_text

    as_dicts = {"messages": [{"role": "user", "content": "my question"}, {"role": "assistant", "content": "agent reply"}]}
    as_objects = {"messages": [HumanMessage(content="my question"), AIMessage(content="agent reply")]}
    assert get_last_user_text(as_dicts) == "my question"
    assert get_last_user_text(as_objects) == "my question"
    assert get_last_user_text({"messages": [HumanMessage(content="a"), AIMessage(content="b"), HumanMessage(content="c")]}) == "c"


def test_homework_retry_gets_the_original_question_and_the_reply_keeps_the_grade(graph):
    key, sup, fb, hw = _mock_feedback_retry()
    with key, sup, fb, hw as homework_llm:
        result = graph.invoke(
            {"messages": [{"role": "user", "content": "grade my answer: 2+2=5"}], "user_id": "u"},
            config=new_thread_id("fix4-retry"),
        )

    # Homework was asked the student's own question, not Feedback's reply.
    (_, kwargs) = homework_llm.call_args
    sent = [m["content"] for m in kwargs["messages"] if m["role"] == "user"]
    assert sent == ["grade my answer: 2+2=5"]

    final = result["messages"][-1].content
    assert GRADE_TEXT in final and HOMEWORK_TEXT in final
    assert final.index(GRADE_TEXT) < final.index(HOMEWORK_TEXT)
    assert "NEEDS_RETRY" not in final
    assert result["agent_used"] == "homework"


def test_retry_state_does_not_leak_into_the_next_turn(graph):
    """needs_retry / feedback_text live in the checkpointed state, so the next
    turn must start clean: a plain homework question must not get a stale grade."""
    key, sup, fb, hw = _mock_feedback_retry()
    config = new_thread_id("fix4-no-leak")
    with key, sup, fb, hw:
        graph.invoke({"messages": [{"role": "user", "content": "grade my answer: 2+2=5"}], "user_id": "u"}, config=config)

    with patch("app.core.config.settings.AIML_API_KEY", "fake-key-for-test"), patch(
        "app.agents.supervisor.chat_completion", return_value="homework"
    ), patch("app.agents.homework.chat_completion", return_value="Plain answer."):
        second = graph.invoke({"messages": [{"role": "user", "content": "solve x+1=2"}]}, config=config)

    assert second["messages"][-1].content == "Plain answer."


def test_chat_endpoint_shows_the_student_the_grade(client, auth_headers):
    key, sup, fb, hw = _mock_feedback_retry()
    with key, sup, fb, hw:
        resp = client.post(
            "/api/chat",
            json={"message": "grade my answer: 2+2=5", "session_id": f"fix4-{uuid.uuid4()}"},
            headers=auth_headers,
        )
    assert resp.status_code == 200
    reply = resp.json()["reply"]
    assert GRADE_TEXT in reply and HOMEWORK_TEXT in reply
