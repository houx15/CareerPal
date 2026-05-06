"""add education items

Revision ID: 0003_education_items
Revises: 0002_profile_contact_fields
Create Date: 2026-05-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_education_items"
down_revision: str | None = "0002_profile_contact_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "educations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("profile_id", sa.String(length=36), nullable=False),
        sa.Column("school", sa.String(length=255), nullable=False),
        sa.Column("degree", sa.String(length=255), nullable=False),
        sa.Column("time", sa.String(length=120), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["profile_id"], ["profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_educations_profile_id"), "educations", ["profile_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_educations_profile_id"), table_name="educations")
    op.drop_table("educations")
