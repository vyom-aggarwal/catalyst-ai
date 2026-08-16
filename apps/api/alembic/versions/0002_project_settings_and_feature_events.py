"""Project-level scientific settings, and a provenance kind for derived features.

Two changes, both in service of the same rule: a derived number is as traceable
as a model score.

* `project.settings` holds the RSA cutoffs separating core from boundary from
  surface. They are a project setting rather than a constant because they are a
  scientific decision, and the value in force when a run executes is copied into
  that run's provenance record — so changing the setting later cannot rewrite
  what an earlier run reported.

* `provenanceeventkind` gains `FEATURES_COMPUTED`, which carries the reference
  table and its DOI, the van der Waals radii set, the probe radius, the point
  count, the coordinate source, whether those coordinates were a monomer or an
  assembly, and how ligands were handled.

Revision ID: 0002_features
Revises: 0001_initial
Create Date: 2026-08-16
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002_features"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "project",
        sa.Column(
            "settings",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    # Postgres 12+ permits ADD VALUE inside a transaction as long as the new
    # value is not itself used in the same transaction. Nothing here uses it.
    op.execute("ALTER TYPE provenanceeventkind ADD VALUE IF NOT EXISTS 'FEATURES_COMPUTED'")


def downgrade() -> None:
    op.drop_column("project", "settings")
    # Postgres cannot remove a value from an enum type. Leaving it in place is
    # harmless: no row references it once the feature events are gone, and
    # inventing a type-rebuild here would risk the provenance table for nothing.
