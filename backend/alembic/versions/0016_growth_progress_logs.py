"""growth progress logs

Revision ID: 0016_growth_progress_logs
Revises: 0015_growth_plans
Create Date: 2026-05-11 04:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0016_growth_progress_logs"
down_revision: str | None = "0015_growth_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "growth_progress_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("growth_plan_id", sa.String(length=36), nullable=False),
        sa.Column("node_id", sa.String(length=120), nullable=False),
        sa.Column("node_label", sa.String(length=160), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("quality_delta", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["growth_plan_id"], ["growth_plans.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_growth_progress_logs_growth_plan_id"), "growth_progress_logs", ["growth_plan_id"], unique=False)
    op.create_index(op.f("ix_growth_progress_logs_node_id"), "growth_progress_logs", ["node_id"], unique=False)
    op.create_index(op.f("ix_growth_progress_logs_user_id"), "growth_progress_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_growth_progress_logs_user_id"), table_name="growth_progress_logs")
    op.drop_index(op.f("ix_growth_progress_logs_node_id"), table_name="growth_progress_logs")
    op.drop_index(op.f("ix_growth_progress_logs_growth_plan_id"), table_name="growth_progress_logs")
    op.drop_table("growth_progress_logs")
