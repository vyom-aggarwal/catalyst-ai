"""Demo mode is the honesty switch — it decides whether the whole interface warns."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from catalyst.config import Settings, get_settings
from catalyst.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _settings(providers: tuple[str, ...]) -> Settings:
    return Settings(
        database_url="postgresql+psycopg://unused/unused",
        redis_url="redis://unused",
        cors_origins=("http://localhost:3000",),
        providers=providers,
    )


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_mock_provider_forces_demo_mode() -> None:
    assert _settings(("mock",)).demo_mode is True


def test_real_providers_do_not_set_demo_mode() -> None:
    assert _settings(("esm2_650m", "thermompnn")).demo_mode is False


def test_demo_mode_is_set_when_mock_is_mixed_with_real_providers() -> None:
    """One fabricating provider is enough. If any number on screen could be
    synthetic, the banner shows."""
    assert _settings(("esm2_650m", "mock")).demo_mode is True


def test_meta_endpoint_reports_demo_mode(client: TestClient) -> None:
    get_settings.cache_clear()
    response = client.get("/meta")
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"demo_mode", "providers"}
    assert isinstance(body["demo_mode"], bool)
