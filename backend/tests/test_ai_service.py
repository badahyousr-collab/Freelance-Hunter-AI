import asyncio

import pytest
from types import SimpleNamespace

from app.ai_service import generate_proposal
from app.config import settings


def test_ai_proposal_requires_provider_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    monkeypatch.setattr(settings, "llm_model", None)
    with pytest.raises(RuntimeError, match="AI provider is not configured"):
        asyncio.run(generate_proposal(None, None))  # type: ignore[arg-type]


def test_ai_proposal_receives_portfolio_link_without_inventing_its_contents(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", "https://provider.example/v1")
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    monkeypatch.setattr(settings, "llm_model", "test-model")
    captured = {}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, _url, **kwargs):
            captured.update(kwargs["json"])
            return SimpleNamespace(
                raise_for_status=lambda: None,
                json=lambda: {"choices": [{"message": {"content": "I can help with this task."}}]},
            )

    monkeypatch.setattr("app.ai_service.httpx.AsyncClient", lambda **_kwargs: FakeClient())
    project = SimpleNamespace(title="Build an API", description="Create a small API", language="en", budget_min=None, budget_max=None, currency="USD", source="telegram")
    profile = SimpleNamespace(display_name="Developer", portfolio_url="https://portfolio.example/work", skills=["Python"], languages=["en"])
    draft = asyncio.run(generate_proposal(project, profile))

    assert draft == "I can help with this task."
    payload = captured["messages"][1]["content"]
    assert '"portfolio_url": "https://portfolio.example/work"' in payload
    assert "do not claim what it contains" in captured["messages"][0]["content"]
