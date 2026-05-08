"""add resume structuring fields

Revision ID: 0011_resume_structuring
Revises: 0010_resume_text_extraction
Create Date: 2026-05-08 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0011_resume_structuring"
down_revision: str | None = "0010_resume_text_extraction"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("resume_files", sa.Column("structured_payload", sa.JSON(), nullable=True))
    op.add_column("resume_files", sa.Column("structure_error", sa.Text(), nullable=True))
    op.add_column("resume_files", sa.Column("structured_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("resume_files", "structured_at")
    op.drop_column("resume_files", "structure_error")
    op.drop_column("resume_files", "structured_payload")
