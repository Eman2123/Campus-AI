from openai import OpenAI

from app.core.config import settings


def get_llm_client() -> OpenAI:
    """AIML API is OpenAI-compatible — same SDK, different base_url."""
    # Explicit timeout + a couple of automatic retries (the SDK backs off on
    # connection errors, 408/409/429 and 5xx) so a slow or flaky provider
    # can't hang a chat request forever or fail on the first hiccup.
    return OpenAI(
        api_key=settings.AIML_API_KEY,
        base_url=settings.AIML_API_BASE_URL,
        timeout=settings.LLM_TIMEOUT_SECONDS,
        max_retries=settings.LLM_MAX_RETRIES,
    )


def chat_completion(messages: list[dict], model: str | None = None, temperature: float = 0.3) -> str:
    """Raises whatever the OpenAI SDK raises (auth errors, timeouts, etc.) —
    callers decide whether to fall back to a non-LLM path."""
    client = get_llm_client()
    response = client.chat.completions.create(
        model=model or settings.AIML_MODEL,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content
