import asyncio

import pytest

from app.ai_service import generate_proposal
from app.config import settings


def test_ai_proposal_requires_provider_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "llm_base_url", None)
    monkeypatch.setattr(settings, "llm_api_key", None)
    monkeypatch.setattr(settings, "llm_model", None)
    with pytest.raises(RuntimeError, match="AI provider is not configured"):
        asyncio.run(generate_proposal(None, None))  # type: ignore[arg-type]
