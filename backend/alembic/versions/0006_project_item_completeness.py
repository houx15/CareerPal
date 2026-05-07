"""add project item completeness

Revision ID: 0006_project_item_completeness
Revises: 0005_project_items
Create Date: 2026-05-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0006_project_item_completeness"
down_revision: str | None = "0005_project_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column("completeness", sa.String(length=20), nullable=False, server_default="partial"),
    )


def downgrade() -> None:
    op.drop_column("projects", "completeness")
