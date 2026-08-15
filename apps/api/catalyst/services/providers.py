"""Which predictors are active, and what that means for the whole interface.

The demo flag is derived here, from the predictors themselves, rather than from
the string ``mock`` appearing in an environment variable. Those two answers agree
today; they would drift the first time a provider was renamed or a real provider
shipped alongside a synthetic one, and the drift would be invisible — a screen
with no amber bar over numbers that were fabricated. Deriving it from
``Predictor.is_mock`` makes the flag a fact about what is running.

Registering a ``ModelVersion`` also lives here, because a score's traceability
starts before the score does: the row that a ``Score`` points at must exist, be
unique on (model, version, weights hash), and record whether it fabricates.
"""

from __future__ import annotations

from sqlmodel import Session, col, select

from catalyst.config import Settings, get_settings
from catalyst.domain.goal import Objective
from catalyst.models import ModelVersion
from catalyst.providers import Predictor, resolve
from catalyst.services.targets import ServiceError


def active(settings: Settings | None = None) -> list[Predictor]:
    """The predictors this deployment has switched on."""
    predictors, _ = resolve((settings or get_settings()).providers)
    return predictors


def unknown_ids(settings: Settings | None = None) -> list[str]:
    """Configured ids that match no predictor. Surfaced, never swallowed."""
    _, unknown = resolve((settings or get_settings()).providers)
    return unknown


def require_active(settings: Settings | None = None) -> list[Predictor]:
    """The active predictors, refusing to proceed if any id matched nothing."""
    settings = settings or get_settings()
    predictors, unknown = resolve(settings.providers)

    if unknown:
        raise ServiceError(
            f"CATALYST_PROVIDERS names {len(unknown)} unknown provider(s): "
            f"{', '.join(unknown)}.",
            "Correct the value, or remove it — a run started with a mistyped "
            "provider would quietly be missing a predictor.",
        )
    if not predictors:
        raise ServiceError(
            "No predictors are configured.",
            "Set CATALYST_PROVIDERS, for example to `mock`, and restart the API.",
        )
    return predictors


def demo_mode(settings: Settings | None = None) -> bool:
    """True when any active predictor fabricates its numbers.

    Drives the persistent amber bar on every screen, the badge on every
    individual number, export watermarking, and the refusal to emit primers.
    """
    return any(predictor.is_mock for predictor in active(settings))


def supported_objectives(settings: Settings | None = None) -> set[Objective]:
    """Objectives at least one active predictor can speak to.

    The goal composer greys out everything else rather than starting a run that
    would return something worthless. ``Objective.OTHER`` is never in this set:
    it is the bucket for an objective the parser could not name, and no provider
    can support what has not been named.
    """
    covered: set[Objective] = set()
    for predictor in active(settings):
        covered |= predictor.objectives
    return covered


def predictors_for(
    objective: Objective | None, settings: Settings | None = None
) -> list[Predictor]:
    """The active predictors that declare support for this objective."""
    if objective is None:
        return []
    return [predictor for predictor in active(settings) if objective in predictor.objectives]


def ensure_model_version(session: Session, predictor: Predictor) -> ModelVersion:
    """Find or create the row every score produced by this predictor points at.

    Keyed on (model id, version, weights hash) — the same triple the unique
    constraint uses — so a predictor whose weights change becomes a different
    ``ModelVersion`` rather than silently rewriting the identity of numbers that
    were produced by the old ones.
    """
    existing = session.exec(
        select(ModelVersion).where(
            col(ModelVersion.model_id) == predictor.id,
            col(ModelVersion.version) == predictor.version,
            col(ModelVersion.weights_hash) == predictor.weights_hash,
        )
    ).first()
    if existing is not None:
        return existing

    created = ModelVersion(
        model_id=predictor.id,
        name=predictor.name,
        version=predictor.version,
        weights_hash=predictor.weights_hash,
        modality=predictor.modality,
        citation=predictor.citation,
        is_mock=predictor.is_mock,
    )
    session.add(created)
    session.flush()
    return created
