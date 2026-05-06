"""add profile contact fields

Revision ID: 0002_profile_contact_fields
Revises: 0001_initial
Create Date: 2026-05-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_profile_contact_fields"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column("profiles", sa.Column("contact_email", sa.String(length=255), nullable=True))
    op.add_column("profiles", sa.Column("location", sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "location")
    op.drop_column("profiles", "contact_email")
    op.drop_column("profiles", "phone")
