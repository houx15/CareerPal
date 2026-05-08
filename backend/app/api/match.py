from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.profile import _current_profile
from app.db.session import get_db
from app.models.match import JobDescriptionAnalysis
from app.models.user import User
from app.schemas.match import (
    JobDescriptionAnalysisResponse,
    JobDescriptionAnalyzeRequest,
    JobDescriptionHistoryResponse,
)
from app.services.match_analysis import analyze_job_description

router = APIRouter(prefix="/match", tags=["match"])


@router.post("/analyze", response_model=JobDescriptionAnalysisResponse, status_code=status.HTTP_201_CREATED)
def analyze_match(
    payload: JobDescriptionAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> JobDescriptionAnalysisResponse:
    profile = _current_profile(current_user, db)
    analysis_payload = analyze_job_description(profile, payload.job_description)
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
        created_at=analysis.created_at,
        updated_at=analysis.updated_at,
    )
