import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.profile import _current_profile, _profile_response
from app.core.config import get_settings
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.page import GeneratedPage
from app.models.user import User
from app.schemas.page import (
    CustomizePageRequest,
    GeneratePageRequest,
    GeneratedPagePreview,
    GeneratedPageVersion,
    GeneratedPageVersionsResponse,
    PageSettingsRequest,
)
from app.services.llm import build_llm_client
from app.services.page_generation import (
    build_page_customization_messages,
    generate_page_html,
    validate_page_html,
)
from app.services.pdf_export import render_profile_pdf, resume_filename

router = APIRouter(prefix="/page", tags=["page"])
MAX_PAGE_VERSION_ATTEMPTS = 3


@router.post("/generate", response_model=GeneratedPagePreview)
async def generate_page(
    payload: GeneratePageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPagePreview:
    profile = _current_profile(current_user, db)
    profile_payload = _profile_response(profile).model_dump()
    try:
        html_content = await generate_page_html(
            build_llm_client(get_settings()),
            profile_payload,
            payload.style_template,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Page generation failed") from exc

    try:
        page = _persist_generated_page(db, current_user, html_content, payload.style_template)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not allocate generated page version",
        ) from exc
    return _page_preview(page)


@router.post("/customize")
async def customize_page(
    payload: CustomizePageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conversation.context_type != "page":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Customization requires a page conversation",
        )

    latest_page = _latest_generated_page(db, current_user)
    if latest_page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No generated page found")

    profile = _current_profile(current_user, db)
    profile_payload = _profile_response(profile).model_dump()
    llm_client = build_llm_client(get_settings())
    messages = build_page_customization_messages(latest_page.html_content, profile_payload, payload.instruction)

    async def stream():
        html_chunks = []
        try:
            async for chunk in llm_client.stream_chat(messages):
                html_chunks.append(chunk)
                yield _sse_event("message", {"delta": chunk})

            html_content = validate_page_html("".join(html_chunks).strip())
            page = _persist_generated_page(db, current_user, html_content, latest_page.style_template)
            conversation.messages = [
                *(conversation.messages or []),
                {"role": "user", "content": payload.instruction},
                {"role": "assistant", "content": f"Updated page version {page.version}."},
            ]
            db.add(conversation)
            db.commit()
            yield f"event: done\ndata: {_page_preview(page).model_dump_json()}\n\n"
        except IntegrityError:
            db.rollback()
            yield _sse_event("error", {"message": "Could not allocate generated page version"})
        except Exception:
            db.rollback()
            yield _sse_event("error", {"message": "Page customization failed"})

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/preview", response_model=GeneratedPagePreview)
def get_latest_page_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPagePreview:
    page = _latest_generated_page(db, current_user)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No generated page found")
    return _page_preview(page)


@router.get("/versions", response_model=GeneratedPageVersionsResponse)
def get_page_versions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPageVersionsResponse:
    pages = db.execute(
        select(GeneratedPage)
        .where(GeneratedPage.user_id == current_user.id)
        .order_by(desc(GeneratedPage.version), desc(GeneratedPage.created_at))
    ).scalars()
    return GeneratedPageVersionsResponse(versions=[_page_version(page) for page in pages])


@router.get("/export/pdf")
def export_page_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    profile = _current_profile(current_user, db)
    profile_payload = _profile_response(profile)
    pdf = render_profile_pdf(profile_payload)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{resume_filename(profile_payload)}"'},
    )


@router.patch("/settings", response_model=GeneratedPagePreview)
def update_page_settings(
    payload: PageSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPagePreview:
    page = _latest_generated_page(db, current_user)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No generated page found")

    pages = db.execute(select(GeneratedPage).where(GeneratedPage.user_id == current_user.id)).scalars().all()
    for candidate in pages:
        candidate.is_public = False

    if payload.is_public:
        page.is_public = True

    db.add_all(pages)
    db.commit()
    db.refresh(page)
    return _page_preview(page)


def _latest_generated_page(db: Session, current_user: User) -> GeneratedPage | None:
    return db.execute(
        select(GeneratedPage)
        .where(GeneratedPage.user_id == current_user.id)
        .order_by(desc(GeneratedPage.version), desc(GeneratedPage.created_at))
        .limit(1)
    ).scalar_one_or_none()


def _next_page_version(db: Session, current_user: User) -> int:
    latest_version = db.execute(
        select(func.max(GeneratedPage.version)).where(GeneratedPage.user_id == current_user.id)
    ).scalar_one_or_none()
    return (latest_version or 0) + 1


def _persist_generated_page(
    db: Session,
    current_user: User,
    html_content: str,
    style_template: str,
) -> GeneratedPage:
    for attempt in range(MAX_PAGE_VERSION_ATTEMPTS):
        page = GeneratedPage(
            user_id=current_user.id,
            html_content=html_content,
            style_template=style_template,
            version=_next_page_version(db, current_user),
            is_public=False,
        )
        db.add(page)
        try:
            db.commit()
            db.refresh(page)
            return page
        except IntegrityError:
            db.rollback()
            if attempt == MAX_PAGE_VERSION_ATTEMPTS - 1:
                raise
    raise RuntimeError("Unable to persist generated page")


def _sse_event(event: str, data: dict[str, str]) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _page_preview(page: GeneratedPage) -> GeneratedPagePreview:
    return GeneratedPagePreview(
        id=page.id,
        html_content=page.html_content,
        style_template=page.style_template,
        version=page.version,
        is_public=page.is_public,
        created_at=page.created_at,
    )


def _page_version(page: GeneratedPage) -> GeneratedPageVersion:
    return GeneratedPageVersion(
        id=page.id,
        style_template=page.style_template,
        version=page.version,
        is_public=page.is_public,
        created_at=page.created_at,
    )
