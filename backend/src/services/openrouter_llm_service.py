import logging

from openai import OpenAI

from ..config.settings import settings

logger = logging.getLogger(__name__)

_llm_client: OpenAI | None = None


def _get_llm_client() -> OpenAI:
    global _llm_client
    if _llm_client is None:
        api_key = settings.openrouter_api_key
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        _llm_client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": settings.app_origin,
                "X-Title": settings.app_name,
            },
        )
    return _llm_client


def _extract_text(response) -> str:
    content = None
    data = None
    if hasattr(response, "model_dump"):
        try:
            data = response.model_dump()
        except Exception:
            data = None

    choices = getattr(response, "choices", None)
    if not choices and isinstance(data, dict):
        choices = data.get("choices")

    if choices:
        first = choices[0]
        message = None
        if isinstance(first, dict):
            message = first.get("message")
        else:
            message = getattr(first, "message", None)

        if isinstance(message, dict):
            content = message.get("content")
        else:
            content = getattr(message, "content", None)

    if not content and isinstance(data, dict):
        content = data.get("output_text")

    if not content:
        logger.error("LLM returned empty content; response=%s", data or response)
        raise RuntimeError("LLM returned empty content")

    return content


def generate_response(system_content: str | None, user_content: str, temperature: float = 0.2) -> str:
    model = settings.openrouter_model
    if not model:
        raise RuntimeError("OPENROUTER_MODEL is not set")

    messages = []
    if system_content:
        messages.append({"role": "system", "content": system_content})
    messages.append({"role": "user", "content": user_content})

    client = _get_llm_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return _extract_text(response)
