from app.agents.state import AgentState
from app.agents.supervisor import get_last_user_text
from app.core.config import settings
from app.core.llm import chat_completion

NOTES_SYSTEM_PROMPT = (
    "You are Campus AI's Notes/Summary agent. A student wants a concise "
    "summary of material they've described. Produce clear, well-organized "
    "notes: use short headings and bullet points, not long paragraphs. "
    "Keep only the key facts, definitions, and relationships — cut filler. "
    "If the topic is broad, group related points under sub-headings."
)


def notes_node(state: AgentState) -> dict:
    user_text = get_last_user_text(state)

    if settings.AIML_API_KEY:
        try:
            reply = chat_completion(
                messages=[
                    {"role": "system", "content": NOTES_SYSTEM_PROMPT},
                    {"role": "user", "content": user_text},
                ]
            )
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "notes"}
        except Exception as exc:
            reply = f"[AIML API error, falling back to stub: {exc}]"
            return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "notes"}

    reply = "[stub — no AIML_API_KEY set] Notes agent would produce a bullet-point summary here."
    return {"messages": [{"role": "assistant", "content": reply}], "agent_used": "notes"}
