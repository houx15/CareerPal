"""generated pages

Revision ID: 0012_generated_pages
Revises: 0011_resume_structuring
Create Date: 2026-05-08 07:30:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0012_generated_pages"
down_revision: str | None = "0011_resume_structuring"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "generated_pages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("html_content", sa.Text(), nullable=False),
        sa.Column("style_template", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("is_public", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "version", name="uq_generated_pages_user_version"),
    )
    op.create_index(op.f("ix_generated_pages_user_id"), "generated_pages", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_generated_pages_user_id"), table_name="generated_pages")
    op.drop_table("generated_pages")
