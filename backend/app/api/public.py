from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.page import GeneratedPage
from app.models.user import User

router = APIRouter(tags=["public"])

PUBLIC_PAGE_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'none'; "
        "script-src 'none'; "
        "style-src 'unsafe-inline'; "
        "img-src data: https:; "
        "font-src data: https:; "
        "connect-src 'none'; "
        "object-src 'none'; "
        "base-uri 'none'; "
        "form-action 'none'; "
        "frame-ancestors 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
}


@router.get("/p/{username}", response_class=HTMLResponse)
def get_public_page(username: str, db: Session = Depends(get_db)) -> HTMLResponse:
    page = db.execute(
        select(GeneratedPage)
        .join(User, GeneratedPage.user_id == User.id)
        .where(User.username == username)
        .order_by(desc(GeneratedPage.version), desc(GeneratedPage.created_at))
        .limit(1)
    ).scalar_one_or_none()
    if page is None or not page.is_public:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")

    return HTMLResponse(page.html_content, headers=PUBLIC_PAGE_HEADERS)
