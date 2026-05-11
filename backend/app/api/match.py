import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.page import MAX_PAGE_VERSION_ATTEMPTS, _page_preview
from app.api.profile import _current_profile
from app.core.config import get_settings
from app.db.session import get_db
from app.models.match import JobDescriptionAnalysis
from app.models.page import GeneratedPage
from app.models.user import User
from app.schemas.match import (
    JobDescriptionAnalysisResponse,
    JobDescriptionAnalyzeRequest,
    JobDescriptionHistoryResponse,
    SaveTargetedVersionRequest,
)
from app.schemas.page import GeneratedPagePreview
from app.services.llm import LLMProviderError, build_llm_client
from app.services.match_analysis import MatchAnalysisError, analyze_job_description
from app.services.page_generation import generate_targeted_page_html

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/analyze", response_model=JobDescriptionAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_match(
    payload: JobDescriptionAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobDescriptionAnalysisResponse:
    profile = _current_profile(current_user, db)
    try:
        analysis_payload = analyze_job_description(
            profile,
            payload.job_description,
            llm_client=build_llm_client(get_settings()),
        )
    except (LLMProviderError, MatchAnalysisError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM provider error: {exc}") from exc
    analysis = JobDescriptionAnalysis(user_id=current_user.id, **analysis_payload)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return _analysis_response(analysis)


@router.get("/history", response_model=JobDescriptionHistoryResponse)
def get_match_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobDescriptionHistoryResponse:
    analyses = db.scalars(
        select(JobDescriptionAnalysis)
        .where(JobDescriptionAnalysis.user_id == current_user.id)
        .order_by(desc(JobDescriptionAnalysis.created_at), desc(JobDescriptionAnalysis.id))
    ).all()
    return JobDescriptionHistoryResponse(analyses=[_analysis_response(analysis) for analysis in analyses])


@router.post(
    "/{analysis_id}/save-version",
    response_model=GeneratedPagePreview,
    response_model_exclude_none=True,
    status_code=status.HTTP_201_CREATED,
)
async def save_targeted_version(
    analysis_id: str,
    payload: SaveTargetedVersionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GeneratedPagePreview:
    analysis = db.scalar(
        select(JobDescriptionAnalysis).where(
            JobDescriptionAnalysis.id == analysis_id,
            JobDescriptionAnalysis.user_id == current_user.id,
        )
    )
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match analysis not found")

    profile = _current_profile(current_user, db)
    profile_payload = profile_to_payload(profile)
    match_payload = _analysis_response(analysis).model_dump()

    try:
        html_content = await generate_targeted_page_html(
            build_llm_client(get_settings()),
            profile_payload,
            match_payload,
            payload.style_template,
        )
        page = _persist_targeted_page_and_link(
            db,
            current_user,
            analysis,
            html_content,
            payload.style_template,
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Targeted version generation failed") from exc

    return _page_preview(page)


@router.get("/{analysis_id}", response_model=JobDescriptionAnalysisResponse)
def get_match_analysis(
    analysis_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobDescriptionAnalysisResponse:
    analysis = db.scalar(
        select(JobDescriptionAnalysis).where(
            JobDescriptionAnalysis.id == analysis_id,
            JobDescriptionAnalysis.user_id == current_user.id,
        )
    )
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match analysis not found")
    return _analysis_response(analysis)


def _analysis_response(analysis: JobDescriptionAnalysis) -> JobDescriptionAnalysisResponse:
    return JobDescriptionAnalysisResponse(
        id=analysis.id,
        job_description=analysis.job_description,
        company=analysis.company,
        role=analysis.role,
        score=analysis.score,
        strengths=analysis.strengths,
        gaps=analysis.gaps,
        suggestions=analysis.suggestions,
        saved_page_id=analysis.saved_page_id,
        saved_page_version=analysis.saved_page_version,
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
    )


def profile_to_payload(profile) -> dict:
    from app.api.profile import _profile_response

    return _profile_response(profile).model_dump()


def _persist_targeted_page_and_link(
    db: Session,
    current_user: User,
    analysis: JobDescriptionAnalysis,
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
            source_match_id=analysis.id,
            target_role=analysis.role,
            target_company=analysis.company,
        )
        db.add(page)
        try:
            db.flush()
            analysis.saved_page_id = page.id
            analysis.saved_page_version = page.version
            db.add(analysis)
            db.commit()
            db.refresh(page)
            db.refresh(analysis)
            return page
        except IntegrityError:
            db.rollback()
            if attempt == MAX_PAGE_VERSION_ATTEMPTS - 1:
                raise
    raise RuntimeError("Unable to persist targeted page")


def _next_page_version(db: Session, current_user: User) -> int:
    latest_version = db.execute(
        select(func.max(GeneratedPage.version)).where(GeneratedPage.user_id == current_user.id)
    ).scalar_one_or_none()
    return (latest_version or 0) + 1
