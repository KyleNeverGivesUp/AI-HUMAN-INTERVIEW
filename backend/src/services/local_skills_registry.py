from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)
SKILLS_DIR = Path(__file__).resolve().parents[2] / "skills"


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    lines = text.splitlines()
    if len(lines) < 3:
        return {}, text
    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        return {}, text
    meta_lines = lines[1:end_idx]
    body = "\n".join(lines[end_idx + 1 :]).lstrip("\n")
    meta: dict[str, str] = {}
    for line in meta_lines:
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta, body


def _skill_id_from_path(path: Path) -> str:
    if path.parent and path.parent.name:
        return path.parent.name
    return path.stem


def load_skills() -> dict[str, dict]:
    skills: dict[str, dict] = {}
    if not SKILLS_DIR.exists():
        return skills
    for skill_path in SKILLS_DIR.glob("**/SKILL.md"):
        try:
            content = skill_path.read_text(encoding="utf-8")
        except Exception:
            continue
        meta, body = _parse_frontmatter(content)
        skill_id = meta.get("name") or _skill_id_from_path(skill_path)
        skills[skill_id] = {
            "id": skill_id,
            "title": meta.get("name") or _skill_id_from_path(skill_path),
            "description": meta.get("description", ""),
            "source": "local",
            "path": str(skill_path),
            "body": body.strip(),
        }
    logger.info("Local skills loaded count=%s ids=%s", len(skills), list(skills.keys()))
    return skills


def list_skills_metadata() -> list[dict]:
    skills = load_skills()
    return [
        {
            "id": s["id"],
            "title": s["title"],
            "source": s["source"],
            "description": s.get("description", ""),
        }
        for s in skills.values()
    ]


def get_skill_by_id(skill_id: str) -> dict | None:
    skills = load_skills()
    return skills.get(skill_id)
