import json
import logging
from typing import Optional

import anthropic

from ..config.settings import settings
from .local_skills_registry import get_skill_by_id, list_skills_metadata

logger = logging.getLogger(__name__)

_llm_client: anthropic.Anthropic | None = None


def _get_llm_client() -> anthropic.Anthropic:
    global _llm_client
    if _llm_client is None:
        api_key = settings.anthropic_api_key
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")
        
        kwargs = {"api_key": api_key}
        if settings.anthropic_base_url:
            kwargs["base_url"] = settings.anthropic_base_url
            logger.info("Using Anthropic base_url: %s", settings.anthropic_base_url)
        
        _llm_client = anthropic.Anthropic(**kwargs)
    return _llm_client


def _extract_text(response) -> str:
    content = getattr(response, "content", None)
    if content:
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text" and block.get("text"):
                    return block["text"]
            else:
                if getattr(block, "type", None) == "text" and getattr(block, "text", None):
                    return block.text
    raise RuntimeError("LLM returned empty content")


def _extract_json(text: str) -> dict:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def generate_response(system_content: str | None, user_content: str, temperature: float = 0.2) -> str:
    """
    Generate a response using Anthropic API.
    Compatible with the OpenRouter interface for easy replacement.
    """
    client = _get_llm_client()
    
    messages = [{"role": "user", "content": user_content}]
    
    kwargs = {
        "model": settings.anthropic_model,
        "max_tokens": 2048,
        "temperature": temperature,
        "messages": messages,
    }
    
    if system_content:
        kwargs["system"] = system_content
    
    response = client.messages.create(**kwargs)
    return _extract_text(response)


def select_skill_for_query(query: str) -> tuple[Optional[dict], Optional[str]]:
    skills = list_skills_metadata()
    if not skills:
        return None, "no_skills_available"

    logger.info("Skills discovered=%s", [s["id"] for s in skills])

    skills_info = "\n".join(
        [
            f"- id: {s['id']}\n  title: {s['title']}\n  source: {s['source']}\n  description: {s.get('description') or ''}"
            for s in skills
        ]
    )

    prompt = f"""
You are a skill selection assistant.

Available skills:
{skills_info}

User query:
{query}

Return strict JSON:
{{"skill_id": "id or null", "reason": "short reason"}}
If no skill applies, set skill_id to null.
""".strip()

    client = _get_llm_client()
    response = client.messages.create(
        model=settings.anthropic_model,
        max_tokens=512,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    text = _extract_text(response)
    try:
        data = _extract_json(text)
    except Exception as exc:
        logger.warning("Skill selection JSON parse failed: %s", exc)
        return None, "invalid_selection_json"

    skill_id = data.get("skill_id")
    reason = data.get("reason")
    logger.info("Anthropic selection skill_id=%s reason=%s", skill_id, reason)

    if not skill_id:
        return None, reason

    selected = get_skill_by_id(skill_id)
    if not selected:
        return None, "selected_skill_not_found"

    return selected, reason
