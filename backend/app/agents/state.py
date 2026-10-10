from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Shared state that flows through every node in the graph.

    `messages` accumulates via LangGraph's `add_messages` reducer
    (append-only, dedupes by id) — this is what gives each session
    conversational memory once Redis checkpointing is wired (Day 13).
    """

    messages: Annotated[list, add_messages]
    intent: str | None          # set by the Supervisor, e.g. "homework", "quiz", "notes"
    session_id: str | None
    user_id: str | None
    agent_used: str | None      # which specialist node actually produced the reply (for logging)
    needs_retry: bool | None    # set by Feedback node — True routes back to Homework
