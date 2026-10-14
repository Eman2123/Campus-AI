"""Fix 6 — the model must see the conversation, not only the last message.

Every agent used to send just the student's latest message to the LLM, so
follow-ups ("explain more", "quiz me on that") had no context even though the
checkpointer kept the whole conversation. These tests drive the real graph
over two turns on one thread and check what each agent actually sends.
"""
import uuid
from unittest.mock import patch

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agents.context import build_llm_messages
from app.agents.graph import build_graph
from app.core.config import settings


def _state(*messages):
    return {"messages": list(messages)}


# ---------------------------------------------------------------------------
# build_llm_messages
# ---------------------------------------------------------------------------


def test_system_prompt_first_then_roles_user_and_assistant():
    state = _state(
        {"role": "user", "content": "what is gravity"},
        {"role": "assistant", "content": "a force"},
        {"role": "user", "content": "explain more"},
    )
    assert build_llm_messages(state, "SYS") == [
        {"role": "system", "content": "SYS"},
        {"role": "user", "content": "what is gravity"},
        {"role": "assistant", "content": "a force"},
        {"role": "user", "content": "explain more"},
    ]


def test_langchain_message_objects_are_converted_too():
    state = _state(HumanMessage(content="hi"), AIMessage(content="hello"), HumanMessage(content="again"))
    roles = [m["role"] for m in build_llm_messages(state, "SYS")]
    assert roles == ["system", "user", "assistant", "user"]


def test_only_the_last_n_messages_are_kept_and_it_starts_on_a_user_turn():
    turns = []
    for i in range(10):
        turns += [{"role": "user", "content": f"q{i}"}, {"role": "assistant", "content": f"a{i}"}]
    turns.append({"role": "user", "content": "latest"})

    built = build_llm_messages(_state(*turns), "SYS", max_messages=5)
    assert built[0]["role"] == "system"
    assert built[1]["role"] == "user"  # a dangling leading assistant turn is dropped
    assert built[-1] == {"role": "user", "content": "latest"}
    assert len(built) - 1 <= 5


def test_the_conversation_ends_at_the_students_latest_message():
    """After Feedback asks for a retry the newest message is the Feedback
    reply; Homework must be asked the student's own question instead."""
    state = _state(
        {"role": "user", "content": "grade my answer: 2+2=5"},
        {"role": "assistant", "content": "That's incorrect."},
    )
    built = build_llm_messages(state, "SYS")
    assert built[-1] == {"role": "user", "content": "grade my answer: 2+2=5"}
    assert all("incorrect" not in m["content"] for m in built)


# ---------------------------------------------------------------------------
# Every agent, over a real two-turn conversation
# ---------------------------------------------------------------------------

# intent -> where that agent calls chat_completion
AGENTS = {
    "research": "app.agents.research.chat_completion",
    "homework": "app.agents.homework.chat_completion",
    "quiz": "app.agents.quiz.chat_completion",
    "notes": "app.agents.notes.chat_completion",
    "flashcard": "app.agents.flashcard.chat_completion",
    "feedback": "app.agents.feedback.chat_completion",
    "pending_response": "app.agents.graph.chat_completion",
}


@pytest.mark.parametrize("intent", list(AGENTS))
def test_each_agent_sends_earlier_turns_to_the_model(intent):
    graph = build_graph()
    config = {"configurable": {"thread_id": f"fix6-{intent}-{uuid.uuid4()}"}}
    # "pending_response" is what an unknown intent routes to.
    routed = "not-a-real-intent" if intent == "pending_response" else intent

    with patch.object(settings, "AIML_API_KEY", "fake-key-for-test"), patch(
        "app.agents.supervisor.classify_intent", return_value=routed
    ), patch(AGENTS[intent], return_value="first answer") as llm:
        graph.invoke({"messages": [{"role": "user", "content": "FIRST question about mitosis"}], "user_id": "u"}, config=config)
        llm.return_value = "second answer"
        graph.invoke({"messages": [{"role": "user", "content": "SECOND follow-up"}]}, config=config)

    sent = llm.call_args.kwargs["messages"]
    contents = [m["content"] for m in sent]
    assert sent[0]["role"] == "system"
    assert "FIRST question about mitosis" in contents
    assert "first answer" in contents  # the assistant's own earlier reply
    assert sent[-1] == {"role": "user", "content": "SECOND follow-up"}


def test_supervisor_classifies_only_the_latest_message():
    """History must not leak into intent classification."""
    graph = build_graph()
    config = {"configurable": {"thread_id": f"fix6-supervisor-{uuid.uuid4()}"}}

    with patch.object(settings, "AIML_API_KEY", "fake-key-for-test"), patch(
        "app.agents.supervisor.chat_completion", return_value="research"
    ) as classify, patch("app.agents.research.chat_completion", return_value="ok"):
        graph.invoke({"messages": [{"role": "user", "content": "first message"}], "user_id": "u"}, config=config)
        graph.invoke({"messages": [{"role": "user", "content": "second message"}]}, config=config)

    sent = classify.call_args.kwargs["messages"]
    assert [m["content"] for m in sent if m["role"] == "user"] == ["second message"]


def test_document_agent_keeps_excerpts_in_the_system_prompt_and_sends_history():
    import asyncio

    async def fake_retrieve(user_id, text):
        return [("bio-notes.txt", "Biology", "Mitosis has four phases: prophase, metaphase, anaphase, telophase.")], True

    graph = build_graph()
    config = {"configurable": {"thread_id": f"fix6-document-{uuid.uuid4()}"}}

    async def run(llm):
        with patch.object(settings, "AIML_API_KEY", "fake-key-for-test"), patch(
            "app.agents.supervisor.classify_intent", return_value="document"
        ), patch("app.agents.document.retrieve_chunks", fake_retrieve), patch(
            "app.agents.document.chat_completion", llm
        ):
            await graph.ainvoke({"messages": [{"role": "user", "content": "What does my document say about mitosis?"}], "user_id": "u"}, config=config)
            await graph.ainvoke({"messages": [{"role": "user", "content": "and what comes after that?"}]}, config=config)

    calls = []

    def llm(messages):
        calls.append(messages)
        return "grounded answer"

    asyncio.run(run(llm))

    sent = calls[-1]
    assert sent[0]["role"] == "system" and "Mitosis has four phases" in sent[0]["content"]  # excerpts stay in the system prompt
    contents = [m["content"] for m in sent]
    assert "What does my document say about mitosis?" in contents and "grounded answer" in contents
    assert sent[-1] == {"role": "user", "content": "and what comes after that?"}
