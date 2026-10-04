from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

FLASHCARD_SYSTEM_PROMPT = (
    "You are Campus AI's Flashcard agent. A student wants flashcards for a "
    "topic they mention. Generate 5-8 flashcards as a numbered list, each in "
    "the exact format 'Q: <question>' followed by 'A: <answer>' on the next "
    "line. Keep each question focused on one fact or concept — no compound "
    "questions. Keep answers short (one sentence or a short phrase)."
)


def flashcard_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": FLASHCARD_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "flashcard"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "flashcard"}

    reply = "[stub — no AIML_API_KEY set] Flashcard agent would generate Q/A cards here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "flashcard"}
