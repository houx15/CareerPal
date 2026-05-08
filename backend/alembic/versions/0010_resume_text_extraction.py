"""add resume text extraction fields

Revision ID: 0010_resume_text_extraction
Revises: 0009_resume_files
Create Date: 2026-05-08 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0010_resume_text_extraction"
down_revision: str | None = "0009_resume_files"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("resume_files", sa.Column("parsed_text", sa.Text(), nullable=True))
    op.add_column("resume_files", sa.Column("parse_error", sa.Text(), nullable=True))
    op.add_column("resume_files", sa.Column("parsed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("resume_files", "parsed_at")
    op.drop_column("resume_files", "parse_error")
    op.drop_column("resume_files", "parsed_text")
