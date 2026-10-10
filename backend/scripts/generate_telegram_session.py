"""Generate a Telegram user session string locally.

Run this script on your own computer. Never commit or share the printed session string.
"""
import asyncio
import getpass

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
from telethon.sessions import StringSession


async def main() -> None:
    api_id = int(input("Telegram API ID: ").strip())
    api_hash = getpass.getpass("Telegram API hash: ").strip()
    phone = input("Phone number with country code: ").strip()
    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.connect()
    try:
        sent = await client.send_code_request(phone)
        code = input("Telegram login code: ").strip()
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=sent.phone_code_hash)
        except SessionPasswordNeededError:
            password = getpass.getpass("Telegram two-step verification password: ")
            await client.sign_in(password=password)
        if not await client.is_user_authorized():
            raise RuntimeError("Telegram authorization did not complete")
        print("\nSESSION STRING (secret; store only in your local .env/secret manager):\n")
        print(client.session.save())
        print("\nDo not paste this string into chats or commit it to Git. Revoke the session if exposed.")
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
