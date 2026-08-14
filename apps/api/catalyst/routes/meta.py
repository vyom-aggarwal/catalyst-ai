"""Service metadata, including the demo-mode flag the entire interface keys off."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from catalyst.config import get_settings

router = APIRouter(tags=["meta"])


class Meta(BaseModel):
    demo_mode: bool = Field(
        description="True when a provider that fabricates numbers is active. The web "
        "app renders a persistent 'Demo data — not model output' bar whenever this is "
        "true and badges every number the mock produced."
    )
    providers: list[str]


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/meta", response_model=Meta)
def meta() -> Meta:
    settings = get_settings()
    return Meta(demo_mode=settings.demo_mode, providers=list(settings.providers))
