from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.page import GeneratedPage
from app.models.user import User
from app.schemas.page import GeneratedPagePreview, GeneratedPageVersion, GeneratedPageVersionsResponse

router = APIRouter(prefix="/page", tags=["page"])


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


def _latest_generated_page(db: Session, current_user: User) -> GeneratedPage | None:
    return db.execute(
        select(GeneratedPage)
        .where(GeneratedPage.user_id == current_user.id)
        .order_by(desc(GeneratedPage.version), desc(GeneratedPage.created_at))
        .limit(1)
    ).scalar_one_or_none()


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
