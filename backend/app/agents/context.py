from app.agents.state import AgentState
from app.agents.supervisor import _is_human, _text_of

DEFAULT_MAX_MESSAGES = 10


def build_llm_messages(state: AgentState, system_prompt: str, max_messages: int = DEFAULT_MAX_MESSAGES) -> list[dict]:
    """The messages to send to the model: the system prompt, then the recent
    conversation as role/content dicts.

    Agents used to send only the student's last message, so follow-ups such as
    "explain more" or "quiz me on that" had no context even though the
    checkpointer keeps the whole conversation. This sends the last
    `max_messages` turns instead.

    * Roles are "user" for the student and "assistant" for everything the
      agents said (works for dicts and LangChain message objects).
    * The conversation always ENDS at the student's latest message. Anything
      after it is dropped: when Feedback asks for a retry, Homework runs with
      the Feedback reply as the newest message, and Homework must answer the
      student's own question, not respond to that reply.
    * It never starts with a dangling assistant message after trimming.
    """
    history: list[dict] = []
    for message in state["messages"]:
        text = _text_of(message)
        if not text:
            continue
        history.append({"role": "user" if _is_human(message) else "assistant", "content": text})

    while history and history[-1]["role"] != "user":
        history.pop()

    history = history[-max_messages:] if max_messages > 0 else history
    while history and history[0]["role"] != "user":
        history.pop(0)

    return [{"role": "system", "content": system_prompt}, *history]
