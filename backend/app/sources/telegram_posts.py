import re
from datetime import datetime
from typing import Any

from app.sources.base import NormalizedProject, SourceCapabilities

_BUDGET_RE = re.compile(r"(?P<a>\d[\d\s.,]*)\s*(?:-|–|—|до|to)\s*(?P<b>\d[\d\s.,]*)\s*(?P<cur>₽|руб(?:лей|ля)?|RUB|\$|USD|€|EUR)", re.IGNORECASE)
_SINGLE_BUDGET_RE = re.compile(r"(?:бюджет|budget|оплата|payment|цена|стоимость)\s*[:—-]?\s*(?P<a>\d[\d\s.,]*)\s*(?P<cur>₽|руб(?:лей|ля)?|RUB|\$|USD|€|EUR)", re.IGNORECASE)


def _number(value: str) -> float | None:
    try:
        return float(re.sub(r"\s", "", value).replace(",", "."))
    except ValueError:
        return None


def _currency(raw: str) -> str | None:
    value = raw.lower()
    if "₽" in value or "руб" in value or value == "rub": return "RUB"
    if "$" in value or "usd" in value: return "USD"
    if "€" in value or "eur" in value: return "EUR"
    return None


def _payment_method(text: str) -> str | None:
    lowered = text.lower()
    if any(word in lowered for word in ("crypto", "криптовалют", "usdt", "usdc", "btc", "bitcoin", "ethereum")): return "crypto"
    if any(word in lowered for word in ("на карту", "банковск", "bank transfer", "bank card", "карта", "перевод на счёт")): return "bank"
    return None


def _public_post_url(channel: str, message_id: int) -> str:
    name = channel.strip().lstrip("@")
    if name.isdigit() or name.startswith("-"):
        numeric = name.lstrip("-")
        if numeric.startswith("100"): numeric = numeric[3:]
        return f"https://t.me/c/{numeric}/{message_id}"
    return f"https://t.me/{name}/{message_id}"


def parse_telegram_post(channel: str, message: Any) -> NormalizedProject | None:
    text = str(getattr(message, "text", None) or getattr(message, "message", None) or "").strip()
    message_id = getattr(message, "id", None)
    if not text or not isinstance(message_id, int): return None
    lines = [line.strip(" \\t•-*—") for line in text.splitlines() if line.strip()]
    title = next((line for line in lines if len(line) >= 8), "")[:500]
    if not title: return None
    budget_min = budget_max = None
    currency = None
    range_match = _BUDGET_RE.search(text)
    single_match = _SINGLE_BUDGET_RE.search(text)
    if range_match:
        budget_min, budget_max = _number(range_match.group("a")), _number(range_match.group("b"))
        currency = _currency(range_match.group("cur"))
    elif single_match:
        budget_min = budget_max = _number(single_match.group("a"))
        currency = _currency(single_match.group("cur"))
    cyrillic_count = len(re.findall(r"[а-яё]", text.lower()))
    latin_count = len(re.findall(r"[a-z]", text.lower()))
    date = getattr(message, "date", None)
    return NormalizedProject(
        source="telegram",
        source_project_id=f"{channel.strip().lstrip('@')}:{message_id}",
        url=_public_post_url(channel, message_id),
        title=title,
        description=text[:30000],
        language="ru" if cyrillic_count >= latin_count else "en",
        budget_min=budget_min,
        budget_max=budget_max,
        currency=currency,
        payment_method=_payment_method(text),
        published_at=date if isinstance(date, datetime) else None,
    )


class TelegramPostParser:
    name = "telegram"
    capabilities = SourceCapabilities(discovery=True, account_connection=False, proposal_submission=False, reply_sync=False)

    @staticmethod
    def parse(channel: str, message: Any) -> NormalizedProject | None:
        return parse_telegram_post(channel, message)
