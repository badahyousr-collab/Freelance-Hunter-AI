import asyncio
import os

import httpx
from aiogram import Bot, Dispatcher
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup

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
        [KeyboardButton(text="📊 Statistics"), KeyboardButton(text="🟢 Resume agent")],
        [KeyboardButton(text="⏸ Pause agent"), KeyboardButton(text="❓ Help")],
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
        "Welcome to Freelance Hunter AI.\n\n"
        "Link this bot to your website account with /link CODE. Generate the one-time code in the website Security page.\n\n"
        "Commands: /stats, /pause, /resume, /help",
        reply_markup=keyboard,
    )


@dp.message(Command("help"))
async def help_command(message: Message) -> None:
    await message.answer("/link CODE — link your website account\n/stats — view your workspace summary\n/pause — pause your agent\n/resume — enable your agent")


@dp.message(Command("link"))
async def link_account(message: Message, command: CommandObject) -> None:
    if not message.from_user:
        return
    code = (command.args or "").strip()
    if not code:
        await message.answer("Generate a one-time link code in the website Security page, then send /link CODE here.")
        return
    try:
        response = await api_request("POST", "/telegram/link", json={"code": code, "telegram_user_id": message.from_user.id})
        data = response.json()
        if response.is_success:
            await message.answer("Your Telegram account is linked. Use /stats to view your workspace summary.", reply_markup=keyboard)
        else:
            await message.answer(data.get("detail", "Could not link the account. Generate a fresh code and try again."))
    except (httpx.HTTPError, ValueError):
        await message.answer("The API is temporarily unavailable. Please try again later.")


@dp.message(Command("stats"))
async def stats(message: Message) -> None:
    if not message.from_user:
        return
    try:
        response = await api_request("GET", "/telegram/summary/" + str(message.from_user.id))
        data = response.json()
        if response.status_code == 404:
            await message.answer("Your Telegram account is not linked yet. Use /link CODE.")
            return
        if not response.is_success:
            await message.answer(data.get("detail", "Could not load statistics."))
            return
        await message.answer(
            "Freelance Hunter AI — workspace summary\n\n"
            f"Projects found: {data['projects_found']}\n"
            f"Matched projects: {data['matched_projects']}\n"
            f"Proposals sent: {data['proposals_sent']}\n"
            f"Client replies: {data['client_replies']}"
        )
    except (httpx.HTTPError, ValueError, KeyError):
        await message.answer("The API is temporarily unavailable. Please try again later.")


async def set_agent(message: Message, enabled: bool) -> None:
    if not message.from_user:
        return
    try:
        response = await api_request("POST", "/telegram/agent-control", json={"telegram_user_id": message.from_user.id, "enabled": enabled})
        data = response.json()
        if not response.is_success:
            await message.answer(data.get("detail", "Could not update agent state."))
            return
        await message.answer("Agent enabled." if enabled else "Agent paused.")
    except (httpx.HTTPError, ValueError):
        await message.answer("The API is temporarily unavailable. Please try again later.")


@dp.message(Command("pause"))
async def pause(message: Message) -> None:
    await set_agent(message, False)


@dp.message(Command("resume"))
async def resume(message: Message) -> None:
    await set_agent(message, True)


@dp.message(lambda message: message.text == "📊 Statistics")
async def stats_button(message: Message) -> None:
    await stats(message)


@dp.message(lambda message: message.text == "🟢 Resume agent")
async def resume_button(message: Message) -> None:
    await set_agent(message, True)


@dp.message(lambda message: message.text == "⏸ Pause agent")
async def pause_button(message: Message) -> None:
    await set_agent(message, False)


@dp.message(lambda message: message.text == "❓ Help")
async def help_button(message: Message) -> None:
    await help_command(message)


async def main() -> None:
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
