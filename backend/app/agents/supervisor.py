import logging

from app.agents.state import AgentState
from app.core.config import settings
from app.core.llm import chat_completion

logger = logging.getLogger("campus_ai.supervisor")

_INTENT_KEYWORDS: dict[str, list[str]] = {
    "homework": ["homework", "assignment", "solve", "problem"],
    "quiz": ["quiz", "test me", "practice questions"],
    "notes": ["summarize", "summary", "notes"],
    "flashcard": ["flashcard", "flash card"],
    "research": ["explain", "what is", "research", "how does"],
    "planner": ["plan", "schedule", "deadline", "exam date"],
    "document": ["my document", "uploaded file", "my notes pdf"],
    "feedback": ["grade", "feedback", "review my answer"],
}

VALID_INTENTS = list(_INTENT_KEYWORDS.keys())


def classify_intent_keywords(text: str) -> str:
    """Zero-dependency fallback — used when AIML_API_KEY isn't set, or the API call fails."""
    lowered = text.lower()
    for intent, keywords in _INTENT_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            return intent
    return "research"


def classify_intent_llm(text: str) -> str | None:
    if not settings.AIML_API_KEY:
        return None
    try:
        system_prompt = (
            "Classify the student's message into exactly one of these labels: "
            f"{', '.join(VALID_INTENTS)}. Reply with only the single label word, nothing else."
        )
        result = chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            temperature=0,
        )
        label = result.strip().lower()
        return label if label in VALID_INTENTS else None
    except Exception as exc:
        # AIML API down/misconfigured shouldn't take the whole graph down —
        # fall back to the keyword classifier below, but log it so it's
        # visible in the server logs rather than silently swallowed.
        logger.warning("LLM intent classification failed, falling back to keywords: %s", exc)
        return None


def classify_intent(text: str) -> str:
    return classify_intent_llm(text) or classify_intent_keywords(text)


def _is_human(message) -> bool:
    """True for a student's message, whether it is a plain dict (role "user")
    or a LangChain message object (type "human")."""
    if isinstance(message, dict):
        return message.get("role") in ("user", "human") or message.get("type") == "human"
    return getattr(message, "type", None) == "human"


def _text_of(message) -> str:
    if isinstance(message, dict):
        return str(message.get("content", ""))
    return message.content if hasattr(message, "content") else str(message)


def get_last_user_text(state: AgentState) -> str:
    """The student's most recent message. This must be the last HUMAN
    message, not simply the last message: after the Feedback agent has
    replied, the last message is the agent's own text, and the Homework
    agent would otherwise treat that as the student's question."""
    messages = state["messages"]
    for message in reversed(messages):
        if _is_human(message):
            return _text_of(message)
    return _text_of(messages[-1]) if messages else ""


def supervisor_node(state: AgentState) -> dict:
    text = get_last_user_text(state)
    intent = classify_intent(text)
    logger.info("classified intent=%s for message: %r", intent, text[:80])
    # Fresh turn: remember the student's own words, and clear the retry
    # bookkeeping the checkpointer would otherwise carry over from the last turn.
    return {"intent": intent, "student_text": text, "needs_retry": False, "feedback_text": None}
