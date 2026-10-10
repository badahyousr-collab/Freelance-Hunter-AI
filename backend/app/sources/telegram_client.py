from telethon import TelegramClient
from telethon.sessions import StringSession

from app.config import settings
from app.sources.base import NormalizedProject, SourceCapabilities
from app.sources.telegram_posts import parse_telegram_post


class TelegramChannelSource:
    """Read recent posts from configured public channels using a pre-authorized Telegram session."""

    name = "telegram"
    capabilities = SourceCapabilities(discovery=True, account_connection=True, proposal_submission=False, reply_sync=False)

    async def discover(self, channels: list[str], limit: int = 50) -> list[NormalizedProject]:
        if not settings.telegram_api_id or not settings.telegram_api_hash or not settings.telegram_session:
            raise RuntimeError("Telegram API ID, API hash, and an authorized session are required")
        if not channels:
            return []
        client = TelegramClient(StringSession(settings.telegram_session), settings.telegram_api_id, settings.telegram_api_hash)
        await client.connect()
        try:
            if not await client.is_user_authorized():
                raise RuntimeError("Telegram session is not authorized; create a session locally and configure it securely")
            found: list[NormalizedProject] = []
            for channel in channels:
                async for message in client.iter_messages(channel, limit=max(1, min(limit, 200))):
                    project = parse_telegram_post(channel, message)
                    if project is not None:
                        found.append(project)
            return found
        finally:
            await client.disconnect()
