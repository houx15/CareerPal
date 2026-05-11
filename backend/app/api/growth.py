import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.profile import _current_profile
from app.core.config import get_settings
from app.db.session import get_db
from app.models.growth import GrowthPlan
from app.models.match import JobDescriptionAnalysis
from app.models.user import User
from app.schemas.growth import GrowthPlanGenerateRequest, GrowthPlanResponse, GrowthPlanUpsert
from app.services.growth_roadmap import GrowthRoadmapError, generate_growth_roadmap
from app.services.llm import LLMProviderError, build_llm_client

router = APIRouter(prefix="/growth", tags=["growth"])


@router.get("/plan", response_model=GrowthPlanResponse)
def get_growth_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrowthPlanResponse:
    plan = db.scalar(select(GrowthPlan).where(GrowthPlan.user_id == current_user.id))
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Growth plan not found")
    return _growth_plan_response(plan)


@router.put("/plan", response_model=GrowthPlanResponse)
def upsert_growth_plan(
    payload: GrowthPlanUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrowthPlanResponse:
    plan = _persist_growth_plan(db, current_user, payload)
    return _growth_plan_response(plan)


@router.post("/plan/generate", response_model=GrowthPlanResponse, status_code=status.HTTP_201_CREATED)
def generate_growth_plan(
    payload: GrowthPlanGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrowthPlanResponse:
    analysis = db.scalar(
        select(JobDescriptionAnalysis).where(
            JobDescriptionAnalysis.id == payload.match_analysis_id,
            JobDescriptionAnalysis.user_id == current_user.id,
        )
    )
    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match analysis not found")

    profile = _current_profile(current_user, db)
    try:
        generated = generate_growth_roadmap(profile, analysis, build_llm_client(get_settings()))
        plan = _persist_growth_plan(db, current_user, generated)
    except (LLMProviderError, GrowthRoadmapError) as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"LLM provider error: {exc}") from exc

    return _growth_plan_response(plan)


def _persist_growth_plan(db: Session, current_user: User, payload: GrowthPlanUpsert) -> GrowthPlan:
    plan = db.scalar(select(GrowthPlan).where(GrowthPlan.user_id == current_user.id))
    nodes = [node.model_dump() for node in payload.nodes]
    if plan is None:
        plan = GrowthPlan(user_id=current_user.id, goal=payload.goal, nodes=nodes)
    else:
        plan.goal = payload.goal
        plan.nodes = nodes

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def _growth_plan_response(plan: GrowthPlan) -> GrowthPlanResponse:
    return GrowthPlanResponse(
        id=plan.id,
        goal=plan.goal,
        nodes=plan.nodes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )
