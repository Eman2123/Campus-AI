from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

RESEARCH_SYSTEM_PROMPT = (
    "You are Campus AI's Research/Explainer agent. A student is asking you to "
    "explain a concept or answer a research-style question. Give a clear, "
    "well-structured explanation: define the core idea first, then add a "
    "concrete example or analogy. Keep it focused — a few short paragraphs, "
    "not an essay. Never invent citations or sources."
)


def research_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": RESEARCH_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "research"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "research"}

    reply = "[stub — no AIML_API_KEY set] Research agent would explain this concept here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "research"}
