"""SQLModel tables for the CatalystAI schema (specification §8).

Importing this package registers every table on ``SQLModel.metadata``, which is what
Alembic's autogenerate compares against. Any new table must be exported here or it
will be silently missing from migrations.
"""

from catalyst.models.base import TimestampedModel, UUIDModel, utcnow
from catalyst.models.enums import (
    AssayKind,
    ConstraintKind,
    Modality,
    NumberingKind,
    ProvenanceEventKind,
    Region,
    RunStatus,
    StageStatus,
    StructureSource,
)
from catalyst.models.experiment import (
    DesignSet,
    DesignSetMember,
    Experiment,
    Measurement,
)
from catalyst.models.project import (
    Constraint,
    Goal,
    NumberingScheme,
    Project,
    Structure,
    Target,
)
from catalyst.models.provenance import ProvenanceEvent
from catalyst.models.run import ModelVersion, Run, RunStage, Score, Variant

__all__ = [
    "AssayKind",
    "Constraint",
    "ConstraintKind",
    "DesignSet",
    "DesignSetMember",
    "Experiment",
    "Goal",
    "Measurement",
    "Modality",
    "ModelVersion",
    "NumberingKind",
    "NumberingScheme",
    "Project",
    "ProvenanceEvent",
    "ProvenanceEventKind",
    "Region",
    "Run",
    "RunStage",
    "RunStatus",
    "Score",
    "StageStatus",
    "Structure",
    "StructureSource",
    "Target",
    "TimestampedModel",
    "UUIDModel",
    "Variant",
    "utcnow",
]
