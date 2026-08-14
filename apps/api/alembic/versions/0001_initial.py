"""Initial schema (specification section 8).

Generated from SQLModel metadata rather than by autogenerate against a live
database. Regenerating is not how this file should ever be updated -- subsequent
migrations are produced with `alembic revision --autogenerate`.

The NOT NULL foreign keys on `score.model_version_id` and `score.run_id` are the
integrity rule the product rests on: a number that cannot be traced to a model
version and a run must not be storable. No later migration may relax them.

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-13
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "modelversion",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_id", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("version", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("weights_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column(
            "modality",
            sa.Enum("STABILITY", "FITNESS", "STRUCTURE", "GENERATIVE", name="modality"),
            nullable=False,
        ),
        sa.Column("citation", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("is_mock", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_id", "version", "weights_hash", name="uq_model_version"),
    )
    op.create_index("ix_modelversion_created_at", "modelversion", ["created_at"], unique=False)
    op.create_index("ix_modelversion_is_mock", "modelversion", ["is_mock"], unique=False)
    op.create_index("ix_modelversion_modality", "modelversion", ["modality"], unique=False)
    op.create_index("ix_modelversion_model_id", "modelversion", ["model_id"], unique=False)

    op.create_table(
        "project",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("organism", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("objective", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_created_at", "project", ["created_at"], unique=False)
    op.create_index("ix_project_name", "project", ["name"], unique=False)

    op.create_table(
        "designset",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("budget_currency", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("budget_amount", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_designset_created_at", "designset", ["created_at"], unique=False)
    op.create_index("ix_designset_project_id", "designset", ["project_id"], unique=False)

    op.create_table(
        "target",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("organism", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("uniprot_accession", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("sequence", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_target_created_at", "target", ["created_at"], unique=False)
    op.create_index("ix_target_project_id", "target", ["project_id"], unique=False)
    op.create_index("ix_target_uniprot_accession", "target", ["uniprot_accession"], unique=False)

    op.create_table(
        "constraint",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "CATALYTIC",
                "LIGAND_CONTACT",
                "COFACTOR_CONTACT",
                "BINDING_INTERFACE",
                "DISULFIDE",
                "SIGNAL_PEPTIDE",
                "PURIFICATION_TAG",
                "DO_NOT_TOUCH",
                name="constraintkind",
            ),
            nullable=False,
        ),
        sa.Column("positions", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("note", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("created_by", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_constraint_created_at", "constraint", ["created_at"], unique=False)
    op.create_index("ix_constraint_kind", "constraint", ["kind"], unique=False)
    op.create_index("ix_constraint_target_id", "constraint", ["target_id"], unique=False)

    op.create_table(
        "experiment",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("design_set_id", sa.Uuid(), nullable=True),
        sa.Column(
            "assay",
            sa.Enum(
                "THERMAL_STABILITY", "ACTIVITY", "EXPRESSION", "BINDING", "OTHER", name="assaykind"
            ),
            nullable=False,
        ),
        sa.Column("protocol", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("performed_on", sa.Date(), nullable=True),
        sa.Column("operator", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(["design_set_id"], ["designset.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_experiment_assay", "experiment", ["assay"], unique=False)
    op.create_index("ix_experiment_created_at", "experiment", ["created_at"], unique=False)
    op.create_index("ix_experiment_design_set_id", "experiment", ["design_set_id"], unique=False)
    op.create_index("ix_experiment_project_id", "experiment", ["project_id"], unique=False)

    op.create_table(
        "goal",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("raw_text", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("parsed_spec", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goal_created_at", "goal", ["created_at"], unique=False)
    op.create_index("ix_goal_project_id", "goal", ["project_id"], unique=False)
    op.create_index("ix_goal_target_id", "goal", ["target_id"], unique=False)

    op.create_table(
        "numberingscheme",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("SEQUENCE", "PDB_AUTHOR", "CONSTRUCT", name="numberingkind"),
            nullable=False,
        ),
        sa.Column("label", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("offsets", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_canonical", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("target_id", "kind", "label", name="uq_numbering_target"),
    )
    op.create_index(
        "ix_numberingscheme_created_at", "numberingscheme", ["created_at"], unique=False
    )
    op.create_index("ix_numberingscheme_kind", "numberingscheme", ["kind"], unique=False)
    op.create_index("ix_numberingscheme_target_id", "numberingscheme", ["target_id"], unique=False)
    op.create_index(
        "uq_numbering_canonical",
        "numberingscheme",
        ["target_id"],
        unique=True,
        postgresql_where=sa.text("is_canonical"),
    )

    op.create_table(
        "structure",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column(
            "source",
            sa.Enum("ALPHAFOLD_DB", "UPLOADED_PDB", "ESMFOLD", "PDB", name="structuresource"),
            nullable=False,
        ),
        sa.Column("identifier", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("file_path", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("chain", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("content_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_structure_content_hash", "structure", ["content_hash"], unique=False)
    op.create_index("ix_structure_created_at", "structure", ["created_at"], unique=False)
    op.create_index("ix_structure_target_id", "structure", ["target_id"], unique=False)

    op.create_table(
        "variant",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("mutations", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=True),
        sa.Column("region", sa.Enum("CORE", "BOUNDARY", "SURFACE", name="region"), nullable=True),
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_variant_code", "variant", ["code"], unique=False)
    op.create_index("ix_variant_created_at", "variant", ["created_at"], unique=False)
    op.create_index("ix_variant_position", "variant", ["position"], unique=False)
    op.create_index("ix_variant_region", "variant", ["region"], unique=False)
    op.create_index("ix_variant_target_id", "variant", ["target_id"], unique=False)

    op.create_table(
        "designsetmember",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("design_set_id", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=False),
        sa.Column("included_via_override", sa.Boolean(), nullable=False),
        sa.Column("override_reason", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(["design_set_id"], ["designset.id"]),
        sa.ForeignKeyConstraint(["variant_id"], ["variant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("design_set_id", "variant_id", name="uq_design_set_member"),
    )
    op.create_index(
        "ix_designsetmember_created_at", "designsetmember", ["created_at"], unique=False
    )
    op.create_index(
        "ix_designsetmember_design_set_id", "designsetmember", ["design_set_id"], unique=False
    )
    op.create_index(
        "ix_designsetmember_variant_id", "designsetmember", ["variant_id"], unique=False
    )

    op.create_table(
        "measurement",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("experiment_id", sa.Uuid(), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=True),
        sa.Column("raw_label", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("metric", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("unit", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("sd", sa.Float(), nullable=True),
        sa.Column("replicate", sa.Integer(), nullable=True),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["experiment_id"], ["experiment.id"]),
        sa.ForeignKeyConstraint(["variant_id"], ["variant.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_measurement_created_at", "measurement", ["created_at"], unique=False)
    op.create_index("ix_measurement_experiment_id", "measurement", ["experiment_id"], unique=False)
    op.create_index("ix_measurement_metric", "measurement", ["metric"], unique=False)
    op.create_index("ix_measurement_variant_id", "measurement", ["variant_id"], unique=False)

    op.create_table(
        "run",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("goal_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", name="runstatus"),
            nullable=False,
        ),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("input_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("parent_run_id", sa.Uuid(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(["goal_id"], ["goal.id"]),
        sa.ForeignKeyConstraint(["parent_run_id"], ["run.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["target_id"], ["target.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_run_created_at", "run", ["created_at"], unique=False)
    op.create_index("ix_run_goal_id", "run", ["goal_id"], unique=False)
    op.create_index("ix_run_input_hash", "run", ["input_hash"], unique=False)
    op.create_index("ix_run_project_id", "run", ["project_id"], unique=False)
    op.create_index("ix_run_status", "run", ["status"], unique=False)
    op.create_index("ix_run_target_id", "run", ["target_id"], unique=False)

    op.create_table(
        "provenanceevent",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "PROJECT_CREATED",
                "TARGET_ADDED",
                "NUMBERING_RECONCILED",
                "CONSTRAINT_ADDED",
                "CONSTRAINT_OVERRIDDEN",
                "GOAL_PARSED",
                "GOAL_CONFIRMED",
                "RUN_STARTED",
                "RUN_STAGE_COMPLETED",
                "RUN_COMPLETED",
                "RUN_CANCELLED",
                "SCORES_WRITTEN",
                "DESIGN_SET_CREATED",
                "EXPORT_GENERATED",
                "MEASUREMENTS_IMPORTED",
                name="provenanceeventkind",
            ),
            nullable=False,
        ),
        sa.Column("project_id", sa.Uuid(), nullable=True),
        sa.Column("run_id", sa.Uuid(), nullable=True),
        sa.Column("subject_type", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("subject_id", sa.Uuid(), nullable=True),
        sa.Column("actor", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["run.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_provenanceevent_created_at", "provenanceevent", ["created_at"], unique=False
    )
    op.create_index("ix_provenanceevent_kind", "provenanceevent", ["kind"], unique=False)
    op.create_index(
        "ix_provenanceevent_project_id", "provenanceevent", ["project_id"], unique=False
    )
    op.create_index("ix_provenanceevent_run_id", "provenanceevent", ["run_id"], unique=False)
    op.create_index(
        "ix_provenanceevent_subject_id", "provenanceevent", ["subject_id"], unique=False
    )
    op.create_index(
        "ix_provenanceevent_subject_type", "provenanceevent", ["subject_type"], unique=False
    )

    op.create_table(
        "runstage",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("model_version_id", sa.Uuid(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "RUNNING",
                "SUCCEEDED",
                "FAILED",
                "SKIPPED",
                "CANCELLED",
                name="stagestatus",
            ),
            nullable=False,
        ),
        sa.Column("input_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("runtime_ms", sa.Integer(), nullable=True),
        sa.Column("logs", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("error", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.ForeignKeyConstraint(["model_version_id"], ["modelversion.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["run.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_runstage_created_at", "runstage", ["created_at"], unique=False)
    op.create_index("ix_runstage_run_id", "runstage", ["run_id"], unique=False)
    op.create_index("ix_runstage_status", "runstage", ["status"], unique=False)

    op.create_table(
        "score",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("variant_id", sa.Uuid(), nullable=False),
        sa.Column("model_version_id", sa.Uuid(), nullable=False),
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("metric", sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("uncertainty", sa.Float(), nullable=True),
        sa.Column("ci_low", sa.Float(), nullable=True),
        sa.Column("ci_high", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["model_version_id"], ["modelversion.id"]),
        sa.ForeignKeyConstraint(["run_id"], ["run.id"]),
        sa.ForeignKeyConstraint(["variant_id"], ["variant.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("variant_id", "model_version_id", "run_id", "metric", name="uq_score"),
    )
    op.create_index("ix_score_created_at", "score", ["created_at"], unique=False)
    op.create_index("ix_score_metric", "score", ["metric"], unique=False)
    op.create_index("ix_score_model_version_id", "score", ["model_version_id"], unique=False)
    op.create_index("ix_score_run_id", "score", ["run_id"], unique=False)
    op.create_index("ix_score_variant_id", "score", ["variant_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_score_created_at", table_name="score")
    op.drop_index("ix_score_metric", table_name="score")
    op.drop_index("ix_score_model_version_id", table_name="score")
    op.drop_index("ix_score_run_id", table_name="score")
    op.drop_index("ix_score_variant_id", table_name="score")
    op.drop_table("score")
    op.drop_index("ix_runstage_created_at", table_name="runstage")
    op.drop_index("ix_runstage_run_id", table_name="runstage")
    op.drop_index("ix_runstage_status", table_name="runstage")
    op.drop_table("runstage")
    op.drop_index("ix_provenanceevent_created_at", table_name="provenanceevent")
    op.drop_index("ix_provenanceevent_kind", table_name="provenanceevent")
    op.drop_index("ix_provenanceevent_project_id", table_name="provenanceevent")
    op.drop_index("ix_provenanceevent_run_id", table_name="provenanceevent")
    op.drop_index("ix_provenanceevent_subject_id", table_name="provenanceevent")
    op.drop_index("ix_provenanceevent_subject_type", table_name="provenanceevent")
    op.drop_table("provenanceevent")
    op.drop_index("ix_run_created_at", table_name="run")
    op.drop_index("ix_run_goal_id", table_name="run")
    op.drop_index("ix_run_input_hash", table_name="run")
    op.drop_index("ix_run_project_id", table_name="run")
    op.drop_index("ix_run_status", table_name="run")
    op.drop_index("ix_run_target_id", table_name="run")
    op.drop_table("run")
    op.drop_index("ix_measurement_created_at", table_name="measurement")
    op.drop_index("ix_measurement_experiment_id", table_name="measurement")
    op.drop_index("ix_measurement_metric", table_name="measurement")
    op.drop_index("ix_measurement_variant_id", table_name="measurement")
    op.drop_table("measurement")
    op.drop_index("ix_designsetmember_created_at", table_name="designsetmember")
    op.drop_index("ix_designsetmember_design_set_id", table_name="designsetmember")
    op.drop_index("ix_designsetmember_variant_id", table_name="designsetmember")
    op.drop_table("designsetmember")
    op.drop_index("ix_variant_code", table_name="variant")
    op.drop_index("ix_variant_created_at", table_name="variant")
    op.drop_index("ix_variant_position", table_name="variant")
    op.drop_index("ix_variant_region", table_name="variant")
    op.drop_index("ix_variant_target_id", table_name="variant")
    op.drop_table("variant")
    op.drop_index("ix_structure_content_hash", table_name="structure")
    op.drop_index("ix_structure_created_at", table_name="structure")
    op.drop_index("ix_structure_target_id", table_name="structure")
    op.drop_table("structure")
    op.drop_index("ix_numberingscheme_created_at", table_name="numberingscheme")
    op.drop_index("ix_numberingscheme_kind", table_name="numberingscheme")
    op.drop_index("ix_numberingscheme_target_id", table_name="numberingscheme")
    op.drop_index("uq_numbering_canonical", table_name="numberingscheme")
    op.drop_table("numberingscheme")
    op.drop_index("ix_goal_created_at", table_name="goal")
    op.drop_index("ix_goal_project_id", table_name="goal")
    op.drop_index("ix_goal_target_id", table_name="goal")
    op.drop_table("goal")
    op.drop_index("ix_experiment_assay", table_name="experiment")
    op.drop_index("ix_experiment_created_at", table_name="experiment")
    op.drop_index("ix_experiment_design_set_id", table_name="experiment")
    op.drop_index("ix_experiment_project_id", table_name="experiment")
    op.drop_table("experiment")
    op.drop_index("ix_constraint_created_at", table_name="constraint")
    op.drop_index("ix_constraint_kind", table_name="constraint")
    op.drop_index("ix_constraint_target_id", table_name="constraint")
    op.drop_table("constraint")
    op.drop_index("ix_target_created_at", table_name="target")
    op.drop_index("ix_target_project_id", table_name="target")
    op.drop_index("ix_target_uniprot_accession", table_name="target")
    op.drop_table("target")
    op.drop_index("ix_designset_created_at", table_name="designset")
    op.drop_index("ix_designset_project_id", table_name="designset")
    op.drop_table("designset")
    op.drop_index("ix_project_created_at", table_name="project")
    op.drop_index("ix_project_name", table_name="project")
    op.drop_table("project")
    op.drop_index("ix_modelversion_created_at", table_name="modelversion")
    op.drop_index("ix_modelversion_is_mock", table_name="modelversion")
    op.drop_index("ix_modelversion_modality", table_name="modelversion")
    op.drop_index("ix_modelversion_model_id", table_name="modelversion")
    op.drop_table("modelversion")

    # Enum types are created implicitly with the columns that use them and are
    # not dropped with those columns, so they are removed explicitly.
    sa.Enum(name="assaykind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="constraintkind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="modality").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="numberingkind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="provenanceeventkind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="region").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="runstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="stagestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="structuresource").drop(op.get_bind(), checkfirst=True)
