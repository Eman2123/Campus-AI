from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

FEEDBACK_SYSTEM_PROMPT = (
    "You are Campus AI's Feedback/Grading agent. A student has submitted an "
    "answer or piece of work for review. Grade it honestly: say clearly "
    "whether it's correct, partially correct, or incorrect, and explain why "
    "in 2-4 sentences. Be encouraging but don't inflate the grade. "
    "On the very last line, output exactly one of:\n"
    "NEEDS_RETRY: YES\n"
    "NEEDS_RETRY: NO\n"
    "Use YES if the work has significant errors the student should redo; "
    "use NO if it's correct or only has minor issues."
)


def _parse_retry_flag(reply: str) -> tuple[str, bool]:
    """Strips the NEEDS_RETRY marker line from the visible reply and returns
    (cleaned_reply, needs_retry). Defaults to False if the marker is missing
    or malformed — never blocks the response on a parsing quirk."""
    lines = reply.strip().splitlines()
    needs_retry = False

    if lines and lines[-1].strip().upper().startswith("NEEDS_RETRY:"):
        marker = lines.pop().strip().upper()
        needs_retry = marker.endswith("YES")

    return "\n".join(lines).strip(), needs_retry


def feedback_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            raw_reply = chat_completion(
                messages=[
                    {"role": "system", "content": FEEDBACK_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            reply, needs_retry = _parse_retry_flag(raw_reply)
            return {
                "messages": [{"role": "assistant", "content": reply}],
                "agent_used": "feedback",
                "needs_retry": needs_retry,
            }
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "feedback", "needs_retry": False}

    reply = "[stub — no AIML_API_KEY set] Feedback agent would grade the submission here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "feedback", "needs_retry": False}
