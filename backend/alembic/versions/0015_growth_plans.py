"""growth plans

Revision ID: 0015_growth_plans
Revises: 0014_targeted_page_versions
Create Date: 2026-05-11 03:40:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0015_growth_plans"
down_revision: str | None = "0014_targeted_page_versions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "growth_plans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("goal", sa.Text(), nullable=False),
        sa.Column("nodes", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_growth_plans_user_id"),
    )
    op.create_index(op.f("ix_growth_plans_user_id"), "growth_plans", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_growth_plans_user_id"), table_name="growth_plans")
    op.drop_table("growth_plans")
