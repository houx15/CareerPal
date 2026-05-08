import json
import re
from typing import Any

from app.schemas.page import StyleTemplate
from app.services.llm import LLMClient, LLMMessage

STYLE_REFERENCES: dict[StyleTemplate, str] = {
    "clean-professional": (
        "<!doctype html><html><head><style>"
        ".cp-clean-page{font-family:Inter,Arial,sans-serif;color:#1d1d1f;background:#fff;}"
        ".cp-clean-page h1{font-family:Georgia,serif;font-weight:500;}"
        ".cp-clean-section{border-top:1px solid #deded8;padding:28px 0;}"
        ".cp-clean-meta{font-family:ui-monospace,SFMono-Regular,monospace;color:#6f6f68;}"
        "</style></head><body class=\"cp-clean-page\">"
        "<header><p class=\"cp-clean-meta\">Profile</p><h1>Student Name</h1></header>"
        "<section class=\"cp-clean-section\">Focused, high-contrast resume storytelling.</section>"
        "</body></html>"
    ),
    "modern-creative": (
        "<!doctype html><html><head><style>"
        ".cp-modern-page{font-family:Inter,Arial,sans-serif;background:#fbf9ff;color:#202124;}"
        ".cp-modern-hero{background:linear-gradient(135deg,#efebff,#fff);border:1px solid #d8d0ff;}"
        ".cp-modern-card{border:1px solid #e5e1f8;border-radius:8px;transition:transform .18s ease;}"
        ".cp-modern-card:hover{transform:translateY(-2px);}"
        "</style></head><body class=\"cp-modern-page\">"
        "<header class=\"cp-modern-hero\"><h1>Student Name</h1></header>"
        "<section class=\"cp-modern-card\">Card-based portfolio section.</section>"
        "</body></html>"
    ),
    "technical": (
        "<!doctype html><html><head><style>"
        ".cp-technical-page{font-family:ui-monospace,SFMono-Regular,monospace;background:#15161c;color:#f4f4f5;}"
        ".cp-technical-page h1{color:#8ea2ff;}"
        ".cp-technical-card{border:1px solid #343746;background:#20222b;border-radius:8px;}"
        ".cp-technical-tag{display:inline-block;border:1px solid #5367f3;color:#cfd6ff;padding:4px 8px;}"
        "</style></head><body class=\"cp-technical-page\">"
        "<header><p>// living resume</p><h1>Student Name</h1></header>"
        "<section class=\"cp-technical-card\"><span class=\"cp-technical-tag\">Tech</span></section>"
        "</body></html>"
    ),
}

HTML_DOCUMENT_RE = re.compile(r"\A\s*(?:<!doctype\s+html>\s*)?<html\b[\s\S]*</html>\s*\Z", re.IGNORECASE)

SCALAR_PROFILE_FIELDS = ["name", "phone", "contact_email", "location", "headline", "target_direction", "comment"]
SECTION_FIELDS = ["education", "experience", "projects", "skills", "certificates"]


def filtered_profile_payload(profile_payload: dict[str, Any]) -> dict[str, Any]:
    filtered: dict[str, Any] = {}
    for field in SCALAR_PROFILE_FIELDS:
        value = profile_payload.get(field)
        if _has_content(value):
            filtered[field] = value
    for field in SECTION_FIELDS:
        items = [_filter_item(item) for item in profile_payload.get(field, [])]
        items = [item for item in items if item]
        if items:
            filtered[field] = items
    return filtered


async def generate_page_html(
    llm_client: LLMClient,
    profile_payload: dict[str, Any],
    style_template: StyleTemplate,
) -> str:
    messages = build_page_generation_messages(profile_payload, style_template)
    chunks = []
    async for chunk in llm_client.stream_chat(messages):
        chunks.append(chunk)
    html = "".join(chunks).strip()
    if not html:
        raise ValueError("LLM returned empty page HTML")
    if not HTML_DOCUMENT_RE.fullmatch(html):
        raise ValueError("LLM returned non-HTML page content")
    return html


def build_page_generation_messages(
    profile_payload: dict[str, Any],
    style_template: StyleTemplate,
) -> list[LLMMessage]:
    filtered_payload = filtered_profile_payload(profile_payload)
    profile_json = json.dumps(filtered_payload, ensure_ascii=False, default=str, indent=2)
    return [
        LLMMessage(
            role="system",
            content=(
                "You are a web designer creating a personal profile page. "
                "Return only complete self-contained HTML with inline CSS."
            ),
        ),
        LLMMessage(
            role="user",
            content=(
                "Student profile data:\n"
                f"{profile_json}\n\n"
                "Style reference:\n"
                f"{STYLE_REFERENCES[style_template]}\n\n"
                "Rules:\n"
                "- Generate a complete, self-contained HTML page with inline CSS\n"
                "- Only use information from the provided profile data - never invent content\n"
                "- The page must be responsive for mobile and desktop\n"
                "- Follow the visual style of the reference closely\n"
                "- Structure: header with name/headline, then only the sections present in the profile data\n"
                "- Each section should be engaging and visually distinct, not a plain list\n"
                "- Include subtle interactions such as hover effects or smooth scrolls, but no JavaScript frameworks\n"
                "- Output HTML only, with no markdown fences or explanation"
            ),
        ),
    ]


def _filter_item(item: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in item.items() if _has_content(value)}


def _has_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(_has_content(item) for item in value)
    if isinstance(value, dict):
        return any(_has_content(item) for item in value.values())
    return True
