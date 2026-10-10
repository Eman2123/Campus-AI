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


def get_last_user_text(state: AgentState) -> str:
    last_message = state["messages"][-1]
    return last_message.content if hasattr(last_message, "content") else str(last_message)


def supervisor_node(state: AgentState) -> dict:
    text = get_last_user_text(state)
    intent = classify_intent(text)
    logger.info("classified intent=%s for message: %r", intent, text[:80])
    return {"intent": intent}
