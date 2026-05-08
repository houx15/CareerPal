"""job description analyses

Revision ID: 0013_job_description_analyses
Revises: 0012_generated_pages
Create Date: 2026-05-08 12:35:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0013_job_description_analyses"
down_revision: str | None = "0012_generated_pages"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "job_description_analyses",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("job_description", sa.Text(), nullable=False),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("role", sa.String(length=255), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("strengths", sa.JSON(), nullable=False),
        sa.Column("gaps", sa.JSON(), nullable=False),
        sa.Column("suggestions", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_job_description_analyses_user_id"), "job_description_analyses", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_job_description_analyses_user_id"), table_name="job_description_analyses")
    op.drop_table("job_description_analyses")
