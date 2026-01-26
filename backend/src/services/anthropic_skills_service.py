import json
import logging
from typing import Optional

import anthropic

from ..config.settings import settings

logger = logging.getLogger(__name__)

_llm_client: anthropic.Anthropic | None = None
SKILLS_BETA = "skills-2025-10-02"
CODE_EXEC_BETA = "code-execution-2025-08-25"


def _get_llm_client() -> anthropic.Anthropic:
    global _llm_client
    if _llm_client is None:
        api_key = settings.anthropic_api_key
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")
        _llm_client = anthropic.Anthropic(api_key=api_key)
    return _llm_client


def _get(obj, key: str, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _normalize_skill(obj) -> Optional[dict]:
    skill_id = _get(obj, "id")
    if not skill_id:
        return None
    return {
        "id": skill_id,
        "title": _get(obj, "display_title") or _get(obj, "title") or skill_id,
        "source": _get(obj, "source") or "anthropic",
        "version": _get(obj, "latest_version"),
        "description": _get(obj, "description"),
    }


def list_skills():
    client = _get_llm_client()
    response = client.beta.skills.list(betas=[SKILLS_BETA])
    return response.data or []


def list_skills_metadata() -> list[dict]:
    skills = list_skills()
    out: list[dict] = []
    for s in skills:
        item = _normalize_skill(s)
        if item:
            out.append(item)
    return out


def get_skill_metadata(skill_id: str) -> Optional[dict]:
    for item in list_skills_metadata():
        if item["id"] == skill_id:
            return item
    return None


def _extract_text(response) -> str:
    content = getattr(response, "content", None)
    if content and len(content) > 0:
        return content[0].text
    raise RuntimeError("LLM returned empty content")


def _extract_json(text: str) -> dict:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def select_skill_for_query(query: str) -> tuple[Optional[dict], Optional[str]]:
    skills = list_skills_metadata()
    if not skills:
        return None, "no_skills_available"

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

    if not skill_id:
        return None, reason

    selected = get_skill_metadata(skill_id)
    if not selected:
        return None, "selected_skill_not_found"

    return selected, reason


def execute_with_skill(query: str, skill_id: str, skill_source: str) -> str:
    client = _get_llm_client()
    model = settings.anthropic_model
    if not model:
        raise RuntimeError("ANTHROPIC_MODEL is not set")

    response = client.beta.messages.create(
        model=model,
        max_tokens=4096,
        betas=[CODE_EXEC_BETA, SKILLS_BETA],
        container={
            "skills": [
                {
                    "type": skill_source,  # "custom" or "anthropic"
                    "skill_id": skill_id,
                    "version": "latest",
                }
            ]
        },
        messages=[{"role": "user", "content": query}],
        tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    )
    return _extract_text(response)


def execute_plain(query: str) -> str:
    client = _get_llm_client()
    model = settings.anthropic_model
    if not model:
        raise RuntimeError("ANTHROPIC_MODEL is not set")

    response = client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": query}],
    )
    return _extract_text(response)
