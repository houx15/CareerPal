"""add project items

Revision ID: 0005_project_items
Revises: 0004_experience_items
Create Date: 2026-05-07 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0005_project_items"
down_revision: str | None = "0004_experience_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tech_stack", sa.JSON(), nullable=False),
        sa.Column("achievements", sa.JSON(), nullable=False),
        sa.Column("link", sa.String(length=500), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_projects_profile_id"), "projects", ["profile_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_projects_profile_id"), table_name="projects")
    op.drop_table("projects")
