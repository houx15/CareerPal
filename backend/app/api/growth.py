from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.api.profile import _current_profile
from app.core.config import get_settings
from app.db.session import get_db
from app.models.growth import GrowthPlan, GrowthProgressLog
from app.models.match import JobDescriptionAnalysis
from app.models.user import User
from app.schemas.growth import (
    GrowthPlanGenerateRequest,
    GrowthPlanResponse,
    GrowthPlanUpsert,
    GrowthProgressLogCreate,
    GrowthProgressResponse,
)
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
    return _growth_plan_response(plan, db)


@router.put("/plan", response_model=GrowthPlanResponse)
def upsert_growth_plan(
    payload: GrowthPlanUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrowthPlanResponse:
    plan = _persist_growth_plan(db, current_user, payload)
    return _growth_plan_response(plan, db)


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

    return _growth_plan_response(plan, db)


@router.post("/plan/nodes/{node_id}/progress", response_model=GrowthProgressResponse, status_code=status.HTTP_201_CREATED)
def log_growth_progress(
    node_id: str,
    payload: GrowthProgressLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrowthProgressResponse:
    plan = db.scalar(select(GrowthPlan).where(GrowthPlan.user_id == current_user.id))
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Growth plan not found")

    target = next((node for node in plan.nodes if node.get("id") == node_id), None)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Growth node not found")
    if target.get("state") == "locked":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Growth node is locked")

    current_quality = float(target.get("quality", 0))
    next_quality = round(min(1.0, current_quality + 0.12), 2)
    next_nodes = []
    for node in plan.nodes:
        if node.get("id") == node_id:
            next_nodes.append({**node, "quality": next_quality, "state": "done" if next_quality >= 0.95 else "active"})
        else:
            next_nodes.append(node)

    plan.nodes = next_nodes
    plan.updated_at = datetime.now(timezone.utc)
    log = GrowthProgressLog(
        user_id=current_user.id,
        growth_plan_id=plan.id,
        node_id=node_id,
        node_label=str(target.get("label") or node_id),
        evidence=payload.evidence,
        quality_delta=round(next_quality - current_quality, 2),
    )
    profile = _current_profile(current_user, db)
    profile.comment = _append_growth_note(profile.comment, log.node_label, payload.evidence)
    profile.updated_at = datetime.now(timezone.utc)

    db.add_all([plan, log, profile])
    db.commit()
    db.refresh(plan)
    db.refresh(log)
    return GrowthProgressResponse(plan=_growth_plan_response(plan, db), log=log)


def _persist_growth_plan(db: Session, current_user: User, payload: GrowthPlanUpsert) -> GrowthPlan:
    plan = db.scalar(select(GrowthPlan).where(GrowthPlan.user_id == current_user.id))
    nodes = [node.model_dump() for node in payload.nodes]
    if plan is None:
        plan = GrowthPlan(user_id=current_user.id, goal=payload.goal, nodes=nodes)
    else:
        db.execute(delete(GrowthProgressLog).where(GrowthProgressLog.growth_plan_id == plan.id))
        plan.goal = payload.goal
        plan.nodes = nodes

    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def _growth_plan_response(plan: GrowthPlan, db: Session | None = None) -> GrowthPlanResponse:
    logs = []
    if db is not None:
        logs = list(
            db.scalars(
                select(GrowthProgressLog)
                .where(GrowthProgressLog.growth_plan_id == plan.id)
                .order_by(GrowthProgressLog.created_at.desc())
            )
        )
    return GrowthPlanResponse(
        id=plan.id,
        goal=plan.goal,
        nodes=plan.nodes,
        progress_logs=logs,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


def _append_growth_note(current: str | None, node_label: str, evidence: str) -> str:
    note = f"Growth evidence - {node_label}: {_short_evidence(evidence)}"
    if current and current.strip():
        return f"{current.strip()}\n{note}"
    return note


def _short_evidence(evidence: str, max_length: int = 160) -> str:
    compact = " ".join(evidence.split())
    if len(compact) <= max_length:
        return compact
    return f"{compact[: max_length - 1].rstrip()}..."
