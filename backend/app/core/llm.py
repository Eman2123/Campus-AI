from functools import lru_cache

from openai import OpenAI

from app.core.config import settings


@lru_cache(maxsize=4)
def _build_client(api_key: str, base_url: str, timeout: float, max_retries: int) -> OpenAI:
    return OpenAI(api_key=api_key, base_url=base_url, timeout=timeout, max_retries=max_retries)


def get_llm_client() -> OpenAI:
    """AIML API is OpenAI-compatible — same SDK, different base_url."""
    # Explicit timeout + a couple of automatic retries (the SDK backs off on
    # connection errors, 408/409/429 and 5xx) so a slow or flaky provider
    # can't hang a chat request forever or fail on the first hiccup. The
    # client (and its connection pool) is built once per distinct settings
    # tuple and reused, instead of on every call.
    return _build_client(
        settings.AIML_API_KEY,
        settings.AIML_API_BASE_URL,
        settings.LLM_TIMEOUT_SECONDS,
        settings.LLM_MAX_RETRIES,
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
