from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.growth import GrowthPlan
from app.models.user import User
from app.schemas.growth import GrowthPlanResponse, GrowthPlanUpsert

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
    return _growth_plan_response(plan)


def _growth_plan_response(plan: GrowthPlan) -> GrowthPlanResponse:
    return GrowthPlanResponse(
        id=plan.id,
        goal=plan.goal,
        nodes=plan.nodes,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )
