from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

HOMEWORK_SYSTEM_PROMPT = (
    "You are Campus AI's Homework Helper agent. A student needs help with an "
    "assignment or problem. Walk through the solution step by step, showing "
    "your reasoning at each step — don't just state the final answer. Where "
    "there's a concept the student might be shaky on, briefly explain it "
    "inline before using it. End with the final answer clearly labeled."
)


def homework_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": HOMEWORK_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "homework"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "homework"}

    reply = "[stub — no AIML_API_KEY set] Homework agent would walk through the solution here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "homework"}
