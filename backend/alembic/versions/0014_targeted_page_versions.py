"""targeted page versions

Revision ID: 0014_targeted_page_versions
Revises: 0013_job_description_analyses
Create Date: 2026-05-11 03:20:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0014_targeted_page_versions"
down_revision: str | None = "0013_job_description_analyses"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("generated_pages", sa.Column("source_match_id", sa.String(length=36), nullable=True))
    op.add_column("generated_pages", sa.Column("target_role", sa.String(length=255), nullable=True))
    op.add_column("generated_pages", sa.Column("target_company", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_generated_pages_source_match_id"), "generated_pages", ["source_match_id"], unique=False)
    op.add_column("job_description_analyses", sa.Column("saved_page_id", sa.String(length=36), nullable=True))
    op.add_column("job_description_analyses", sa.Column("saved_page_version", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("job_description_analyses", "saved_page_version")
    op.drop_column("job_description_analyses", "saved_page_id")
    op.drop_index(op.f("ix_generated_pages_source_match_id"), table_name="generated_pages")
    op.drop_column("generated_pages", "target_company")
    op.drop_column("generated_pages", "target_role")
    op.drop_column("generated_pages", "source_match_id")
