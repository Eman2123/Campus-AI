from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

QUIZ_SYSTEM_PROMPT = (
    "You are Campus AI's Quiz/Practice agent. A student wants to test their "
    "understanding of a topic. Generate 3-5 practice questions on the topic "
    "they mention (mix of multiple-choice and short-answer). Number them "
    "clearly. Do NOT reveal the answers in the same message — end by asking "
    "if they'd like the answer key, so they attempt the questions first."
)


def quiz_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": QUIZ_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "quiz"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "quiz"}

    reply = "[stub — no AIML_API_KEY set] Quiz agent would generate practice questions here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "quiz"}
