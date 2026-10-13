import logging
import os

import httpx
from openai import APIConnectionError, OpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


LLM_BUILD = "llm-v3"


def _proxy_diag() -> str:
    """Names of proxy env vars + whether they carry a scheme (never the values)."""
    parts = []
    for k, v in os.environ.items():
        if k.upper() in {"HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"}:
            parts.append(f"{k}:{'scheme' if '://' in v else 'NO-scheme'}")
    return ",".join(parts) or "none"


def get_llm_client(trust_env: bool = True) -> OpenAI:
    """AIML API is OpenAI-compatible — same SDK, different base_url."""
    # Explicit timeout + a couple of automatic retries (the SDK backs off on
    # connection errors, 408/409/429 and 5xx) so a slow or flaky provider
    # can't hang a chat request forever or fail on the first hiccup.
    return OpenAI(
        api_key=settings.AIML_API_KEY,
        base_url=settings.AIML_API_BASE_URL,
        timeout=settings.LLM_TIMEOUT_SECONDS,
        max_retries=settings.LLM_MAX_RETRIES,
        # trust_env=False makes httpx ignore HTTP(S)_PROXY & friends entirely.
        http_client=None if trust_env else httpx.Client(trust_env=False, timeout=settings.LLM_TIMEOUT_SECONDS),
    )


def describe_llm_error(exc: Exception) -> str:
    """The SDK's APIConnectionError says just 'Connection error.' — dig out the real cause."""
    cause = exc.__cause__ or exc.__context__
    return f"{exc} ({type(cause).__name__}: {cause})" if cause else str(exc)


def chat_completion(messages: list[dict], model: str | None = None, temperature: float = 0.3) -> str:
    """Raises whatever the OpenAI SDK raises (auth errors, timeouts, etc.) —
    callers decide whether to fall back to a non-LLM path."""
    kwargs = dict(model=model or settings.AIML_MODEL, messages=messages, temperature=temperature)
    try:
        response = get_llm_client().chat.completions.create(**kwargs)
    except APIConnectionError as exc:
        detail = describe_llm_error(exc)
        logger.error("AIML connection failed [%s] (proxy env: %s): %s", LLM_BUILD, _proxy_diag(), detail)
        if "UnsupportedProtocol" in detail or "missing an 'http" in detail:
            # Broken proxy env on the host — retry ignoring the environment.
            try:
                response = get_llm_client(trust_env=False).chat.completions.create(**kwargs)
                logger.warning("AIML call succeeded with trust_env=False; host proxy env is broken")
                return response.choices[0].message.content
            except APIConnectionError as exc2:
                detail = describe_llm_error(exc2)
        raise RuntimeError(
            f"[{LLM_BUILD}] Connection error to {settings.AIML_API_BASE_URL}: {detail} | proxy env: {_proxy_diag()}"
        ) from exc
    return response.choices[0].message.content
