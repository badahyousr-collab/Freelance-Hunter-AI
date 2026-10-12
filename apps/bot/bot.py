import asyncio
import html
import os

import httpx
from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, Message, ReplyKeyboardMarkup

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000").rstrip("/")
BOT_API_SECRET = os.getenv("BOT_API_SECRET", "").strip()
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
if not BOT_API_SECRET:
    raise RuntimeError("BOT_API_SECRET is required")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="📊 Статистика"), KeyboardButton(text="🧲 Новые заказы")],
        [KeyboardButton(text="▶️ Возобновить агента"), KeyboardButton(text="⏸ Пауза агента")],
        [KeyboardButton(text="❓ Помощь")],
    ],
    resize_keyboard=True,
)


async def api_request(method: str, path: str, **kwargs):
    headers = kwargs.pop("headers", {})
    headers["X-Bot-Secret"] = BOT_API_SECRET
    async with httpx.AsyncClient(timeout=12) as client:
        return await client.request(method, API_BASE_URL + path, headers=headers, **kwargs)


@dp.message(CommandStart())
async def start(message: Message) -> None:
    await message.answer(
        "Привет! Это Telegram-бот Freelance Hunter AI.\n\n"
        "Чтобы связать аккаунт:\n"
        "1. Открой сайт и перейди в Security → Telegram.\n"
        "2. Сгенерируй одноразовый код.\n"
        "3. Отправь сюда /link КОД.\n\n"
        "Команды: /stats — статистика, /projects — новые заказы, "
        "/pause — пауза агента, /resume — возобновить, /help — помощь.",
        reply_markup=keyboard,
    )


@dp.message(Command("help"))
async def help_command(message: Message) -> None:
    await message.answer(
        "/link КОД — связать аккаунт сайта\n"
        "/stats — статистика проектов и откликов\n"
        "/projects — последние найденные заказы\n"
        "/pause — приостановить агента\n"
        "/resume — возобновить агента\n\n"
        "Код привязки создаётся на сайте в разделе Security → Telegram. "
        "Он действует 10 минут и используется один раз.",
        reply_markup=keyboard,
    )


@dp.message(Command("link"))
async def link_account(message: Message, command: CommandObject) -> None:
    if not message.from_user:
        return
    code = (command.args or "").strip()
    if not code:
        await message.answer("Сгенерируй одноразовый код на сайте в Security → Telegram и отправь /link КОД.")
        return
    try:
        response = await api_request(
            "POST",
            "/telegram/link",
            json={"code": code, "telegram_user_id": message.from_user.id},
        )
        data = response.json()
        if response.is_success:
            await message.answer("✅ Аккаунт сайта подключён. Используй /stats для статистики или /projects для заказов.", reply_markup=keyboard)
        else:
            await message.answer(data.get("detail", "Не удалось подключить аккаунт. Создай новый код и попробуй ещё раз."))
    except (httpx.HTTPError, ValueError):
        await message.answer("API временно недоступен. Попробуй позже.")


@dp.message(Command("stats"))
async def stats(message: Message) -> None:
    if not message.from_user:
        return
    try:
        response = await api_request("GET", "/telegram/summary/" + str(message.from_user.id))
        data = response.json()
        if response.status_code == 404:
            await message.answer("Аккаунт не подключён. Открой на сайте Security → Telegram и отправь /link КОД.")
            return
        if not response.is_success:
            await message.answer(data.get("detail", "Не удалось загрузить статистику."))
            return
        await message.answer(
            "📊 <b>Статистика Freelance Hunter AI</b>\n\n"
            f"Найдено проектов: <b>{data['projects_found']}</b>\n"
            f"Подходящих проектов: <b>{data['matched_projects']}</b>\n"
            f"Отправлено откликов: <b>{data['proposals_sent']}</b>\n"
            f"Ответов клиентов: <b>{data['client_replies']}</b>",
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    except (httpx.HTTPError, ValueError, KeyError):
        await message.answer("API временно недоступен. Попробуй позже.")


@dp.message(Command("projects"))
async def projects(message: Message) -> None:
    if not message.from_user:
        return
    try:
        response = await api_request(
            "GET",
            "/telegram/projects/" + str(message.from_user.id),
            params={"limit": 5},
        )
        data = response.json()
        if response.status_code == 404:
            await message.answer("Аккаунт не подключён. Открой на сайте Security → Telegram и выполни /link КОД.")
            return
        if not response.is_success:
            await message.answer(data.get("detail", "Не удалось загрузить заказы."))
            return
        items = data.get("items", [])
        if not items:
            await message.answer("Пока нет заказов из подключённых источников. Добавь публичные каналы в разделе Sources на сайте.")
            return
        await message.answer(f"🧲 Последние заказы: {len(items)}")
        for item in items:
            low, high, currency = item.get("budget_min"), item.get("budget_max"), item.get("currency")
            if low is not None and high is not None:
                budget = f"{low:g}–{high:g} {currency or ''}".strip()
            elif high is not None:
                budget = f"до {high:g} {currency or ''}".strip()
            elif low is not None:
                budget = f"от {low:g} {currency or ''}".strip()
            else:
                budget = "бюджет не указан"
            title = html.escape(str(item.get("title") or "Без названия")[:700])
            source = html.escape(str(item.get("source") or "—"))
            url = str(item.get("url") or "")
            markup = InlineKeyboardMarkup(
                inline_keyboard=[[InlineKeyboardButton(text="Открыть заказ", url=url)]]
            ) if url.startswith("https://") else None
            await message.answer(
                f"🧩 <b>{title}</b>\nИсточник: {source}\nБюджет: {html.escape(budget)}",
                parse_mode="HTML",
                reply_markup=markup,
            )
    except (httpx.HTTPError, ValueError, KeyError):
        await message.answer("API временно недоступен. Попробуй позже.")


async def set_agent(message: Message, enabled: bool) -> None:
    if not message.from_user:
        return
    try:
        response = await api_request(
            "POST",
            "/telegram/agent-control",
            json={"telegram_user_id": message.from_user.id, "enabled": enabled},
        )
        data = response.json()
        if not response.is_success:
            await message.answer(data.get("detail", "Не удалось изменить состояние агента."))
            return
        await message.answer("▶️ Агент возобновлён." if enabled else "⏸ Агент поставлен на паузу.", reply_markup=keyboard)
    except (httpx.HTTPError, ValueError):
        await message.answer("API временно недоступен. Попробуй позже.")


@dp.message(Command("pause"))
async def pause(message: Message) -> None:
    await set_agent(message, False)


@dp.message(Command("resume"))
async def resume(message: Message) -> None:
    await set_agent(message, True)


@dp.message(lambda message: message.text == "📊 Статистика")
async def stats_button(message: Message) -> None:
    await stats(message)


@dp.message(lambda message: message.text == "🧲 Новые заказы")
async def projects_button(message: Message) -> None:
    await projects(message)


@dp.message(lambda message: message.text == "▶️ Возобновить агента")
async def resume_button(message: Message) -> None:
    await set_agent(message, True)


@dp.message(lambda message: message.text == "⏸ Пауза агента")
async def pause_button(message: Message) -> None:
    await set_agent(message, False)


@dp.message(lambda message: message.text == "❓ Помощь")
async def help_button(message: Message) -> None:
    await help_command(message)


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
