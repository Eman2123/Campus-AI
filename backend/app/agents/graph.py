import logging

from langgraph.graph import END, StateGraph

from app.agents.document import document_node
from app.agents.flashcard import flashcard_node
from app.agents.feedback import feedback_node
from app.agents.homework import homework_node
from app.agents.notes import notes_node
from app.agents.planner import planner_node
from app.agents.quiz import quiz_node
from app.agents.research import research_node
from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text, supervisor_node
from app.core.checkpointer import build_default_checkpointer
from app.core.config import settings
from app.core.llm import chat_completion

logger = logging.getLogger("campus_ai.graph")

# Maps each classified intent to the node that will eventually handle it.
# Days 7-12 (core agents), Day 18 (document), and Day 19 (planner) add the
# real specialist nodes one at a time — just swap the mapping value here
# when a new one lands, the routing function itself doesn't change.
INTENT_ROUTES: dict[str, str] = {
    "homework": "homework",
    "quiz": "quiz",
    "notes": "notes",
    "flashcard": "flashcard",
    "research": "research",
    "planner": "planner",
    "document": "document",
    "feedback": "feedback",
}


def route_after_supervisor(state: AgentState) -> str:
    target = INTENT_ROUTES.get(state["intent"], "pending_response")
    logger.debug("routing intent=%s -> node=%s", state["intent"], target)
    return target


def route_after_feedback(state: AgentState) -> str:
    """The one loop in the graph, per the architecture diagram: if the
    Feedback agent decided the student's work needs another attempt,
    send them back to Homework instead of ending the turn."""
    needs_retry = state.get("needs_retry")
    if needs_retry:
        logger.info("feedback loop: retry needed, routing back to homework")
        return "homework"
    logger.debug("feedback loop: no retry needed, ending turn")
    return END


def pending_response_node(state: AgentState) -> dict:
    """Generates a real reply via the AIML API when a key is configured.
    Falls back to a stub if no key is set (or the call fails) so the graph
    stays runnable without credentials — specialist agents with real
    domain logic land in Phase 2 (Days 7-12); this is a generic assistant
    persona for now, just to prove the LLM wiring works end-to-end.
    """
    intent = state["intent"]
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            system_prompt = (
                f"You are Campus AI's {intent} assistant for students. "
                "Give a short, helpful, direct answer."
            )
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": intent}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": intent}

    reply = f"[stub — no AIML_API_KEY set] This would be handled by the '{intent}' agent."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": intent}


def build_graph():
    builder = StateGraph(AgentState)

    builder.add_node("supervisor", supervisor_node)
    builder.add_node("research", research_node)
    builder.add_node("homework", homework_node)
    builder.add_node("quiz", quiz_node)
    builder.add_node("notes", notes_node)
    builder.add_node("flashcard", flashcard_node)
    builder.add_node("feedback", feedback_node)
    builder.add_node("document", document_node)
    builder.add_node("planner", planner_node)
    builder.add_node("pending_response", pending_response_node)

    builder.set_entry_point("supervisor")
    builder.add_conditional_edges("supervisor", route_after_supervisor)
    builder.add_edge("research", END)
    builder.add_edge("homework", END)
    builder.add_edge("quiz", END)
    builder.add_edge("notes", END)
    builder.add_edge("flashcard", END)
    builder.add_edge("document", END)
    builder.add_edge("planner", END)
    builder.add_conditional_edges("feedback", route_after_feedback)  # the one loop: feedback -> homework or END
    builder.add_edge("pending_response", END)

    # Day 4 used an in-memory checkpointer. Day 13 intended to swap in a
    # real Postgres-backed one so sessions survive process restarts — but
    # that real swap only happens later, from app.main's lifespan, once
    # there's an actual running event loop to do it in safely (see
    # app/core/checkpointer.py's build_default_checkpointer /
    # attach_postgres_checkpointer docstrings for why). At import time,
    # the graph is always compiled with the safe, universally-working
    # MemorySaver placeholder.
    checkpointer = build_default_checkpointer()
    return builder.compile(checkpointer=checkpointer)


# Compiled once at import time and reused across requests.
campus_ai_graph = build_graph()