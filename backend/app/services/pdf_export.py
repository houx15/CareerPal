from datetime import date
import re

import fitz

from app.schemas.profile import ProfileResponse

PAGE_WIDTH = 595
PAGE_HEIGHT = 842
MARGIN_X = 54
MARGIN_TOP = 54
MARGIN_BOTTOM = 54
LINE_HEIGHT = 13
SECTION_GAP = 16
TEXT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2)
SAFE_TEXT_WIDTH = TEXT_WIDTH * 0.55
FONT_NAME = "china-s"
LATIN_FONT_NAME = "helv"
FONTS = {
    FONT_NAME: fitz.Font(fontname=FONT_NAME),
    LATIN_FONT_NAME: fitz.Font(fontname=LATIN_FONT_NAME),
}


def render_profile_pdf(profile: ProfileResponse) -> bytes:
    document = fitz.open()
    page = document.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
    y = MARGIN_TOP

    def ensure_space(height: float) -> None:
        nonlocal page, y
        if y + height <= PAGE_HEIGHT - MARGIN_BOTTOM:
            return
        page = document.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
        y = MARGIN_TOP

    def add_text(text: str, *, size: int = 10, bold: bool = False, gap: int = 4) -> None:
        nonlocal y
        clean_text = " ".join(str(text).split())
        if not clean_text:
            return
        lines = _wrap(clean_text, size=size)
        line_box_height = max(LINE_HEIGHT + 5, int(size * 1.8))
        ensure_space((len(lines) * line_box_height) + gap)
        for line in lines:
            page.insert_text(
                (MARGIN_X, y + size),
                line,
                fontsize=size,
                fontname=_font_name(line),
                color=(0, 0, 0),
            )
            y += line_box_height
        y += gap

    def add_section(title: str) -> None:
        nonlocal y
        ensure_space(SECTION_GAP + LINE_HEIGHT)
        y += SECTION_GAP
        add_text(title.upper(), size=10, bold=True, gap=6)

    add_text(profile.name or "CareerPal Resume", size=20, bold=True, gap=8)
    add_text(profile.headline or "", size=12, bold=True, gap=5)
    add_text(" | ".join(_present([profile.contact_email, profile.phone, profile.location])), size=9, gap=10)
    add_text(profile.target_direction or "", size=10, gap=4)
    add_text(profile.comment or "", size=10, gap=8)

    if profile.experience:
        add_section("Experience")
        for item in profile.experience:
            add_text(" - ".join(_present([item.role, item.company, item.time])), size=10, bold=True, gap=2)
            add_text(item.description, size=10, gap=2)
            for achievement in item.achievements:
                add_text(f"- {achievement}", size=10, gap=1)

    if profile.projects:
        add_section("Projects")
        for item in profile.projects:
            add_text(item.name, size=10, bold=True, gap=2)
            add_text(item.description, size=10, gap=2)
            if item.tech_stack:
                add_text(f"Tech: {', '.join(item.tech_stack)}", size=9, gap=2)
            if item.link:
                add_text(item.link, size=9, gap=2)
            for achievement in item.achievements:
                add_text(f"- {achievement}", size=10, gap=1)

    if profile.skills:
        add_section("Skills")
        grouped: dict[str, list[str]] = {}
        for item in profile.skills:
            grouped.setdefault(item.category, []).append(f"{item.name} ({item.proficiency})")
        for category, skills in grouped.items():
            add_text(f"{category}: {', '.join(skills)}", size=10, gap=2)

    if profile.education:
        add_section("Education")
        for item in profile.education:
            add_text(" - ".join(_present([item.degree, item.school, item.time])), size=10, bold=True, gap=2)
            add_text(item.comment or "", size=10, gap=2)

    if profile.certificates:
        add_section("Certifications")
        for item in profile.certificates:
            add_text(" - ".join(_present([item.name, item.issuer, _date_text(item.date)])), size=10, bold=True, gap=2)
            add_text(item.comment or "", size=10, gap=2)

    pdf = document.tobytes()
    document.close()
    return pdf


def resume_filename(profile: ProfileResponse) -> str:
    return f"careerpal_resume_{_slug(profile.name or 'resume')}.pdf"


def _present(values: list[str | None]) -> list[str]:
    return [value.strip() for value in values if value and value.strip()]


def _date_text(value: date) -> str:
    return value.isoformat()


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "resume"


def _wrap(text: str, *, size: int) -> list[str]:
    words = [chunk for word in text.split() for chunk in _split_long_word(word, size=size)]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if _text_width(candidate, size=size) <= SAFE_TEXT_WIDTH:
            current = candidate
            continue
        if current:
            lines.append(current)
        current = word
    if current:
        lines.append(current)
    return lines or [text]


def _split_long_word(word: str, *, size: int) -> list[str]:
    if _text_width(word, size=size) <= SAFE_TEXT_WIDTH:
        return [word]

    chunks: list[str] = []
    current = ""
    for character in word:
        candidate = f"{current}{character}"
        if current and _text_width(candidate, size=size) > SAFE_TEXT_WIDTH:
            chunks.append(current)
            current = character
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def _text_width(text: str, *, size: int) -> float:
    return FONTS[_font_name(text)].text_length(text, fontsize=size)


def _font_name(text: str) -> str:
    return LATIN_FONT_NAME if text.isascii() else FONT_NAME
