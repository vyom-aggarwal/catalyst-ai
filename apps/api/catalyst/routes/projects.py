"""Projects list — the data behind screen §5.1."""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlmodel import Session, col

from catalyst.db import get_session
from catalyst.models import Experiment, Measurement, Project, Run, Target

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectRow(BaseModel):
    id: uuid.UUID
    name: str
    organism: str | None
    objective: str | None
    target_name: str | None
    target_count: int
    run_count: int
    measured_variant_count: int
    last_activity_at: datetime | None
    created_at: datetime


@router.get("", response_model=list[ProjectRow])
def list_projects(session: Session = Depends(get_session)) -> list[ProjectRow]:
    """One row per project, with the counts the table shows.

    Counts are computed as correlated scalar subqueries rather than joins, so a
    project with many targets does not multiply its own run count.

    Model attributes are wrapped in ``col()`` throughout: SQLModel declares fields
    with their Python type, so ``Run.project_id == Project.id`` reads to a type
    checker as a bool comparison rather than a SQL expression.
    """
    run_count = (
        select(func.count(col(Run.id)))
        .where(col(Run.project_id) == col(Project.id))
        .scalar_subquery()
    )
    target_count = (
        select(func.count(col(Target.id)))
        .where(col(Target.project_id) == col(Project.id))
        .scalar_subquery()
    )
    # A measured variant is one this lab has actually put on the bench and recorded a
    # value for. Rows that failed to join to a known variant are excluded — they are
    # unresolved imports, not measurements of anything yet.
    measured_variant_count = (
        select(func.count(func.distinct(col(Measurement.variant_id))))
        .select_from(Measurement)
        .join(Experiment, col(Experiment.id) == col(Measurement.experiment_id))
        .where(
            col(Experiment.project_id) == col(Project.id),
            col(Measurement.variant_id).is_not(None),
        )
        .scalar_subquery()
    )
    first_target_name = (
        select(col(Target.name))
        .where(col(Target.project_id) == col(Project.id))
        .order_by(col(Target.created_at))
        .limit(1)
        .scalar_subquery()
    )

    statement = select(
        col(Project.id),
        col(Project.name),
        col(Project.organism),
        col(Project.objective),
        first_target_name.label("target_name"),
        target_count.label("target_count"),
        run_count.label("run_count"),
        measured_variant_count.label("measured_variant_count"),
        col(Project.last_activity_at),
        col(Project.created_at),
    ).order_by(
        # Projects with recent bench activity first; brand-new projects fall back to
        # their creation time rather than sorting to the bottom.
        func.coalesce(col(Project.last_activity_at), col(Project.created_at)).desc()
    )

    rows = session.execute(statement).all()
    return [ProjectRow.model_validate(row, from_attributes=True) for row in rows]
