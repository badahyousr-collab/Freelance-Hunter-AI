# Telegram setup

## Bot account linking

1. Create a bot with Telegram's official BotFather and put the token in the local .env as TELEGRAM_BOT_TOKEN.
2. Generate a random shared secret for BOT_API_SECRET. Use the exact same secret for API and bot services.
3. Generate a one-time link code from the website Security page.
4. Open the bot and send /link CODE. The code expires after 10 minutes and can only be used once.
5. Use /stats, /pause, and /resume to review statistics and control the user's agent flag.

The API stores only the Telegram numeric user ID after linking. The bot never asks for the website password.

## Reading public Telegram channels

The channel ingestion adapter uses Telethon with a separately authorized Telegram user session. This is distinct from the bot token.

1. Create Telegram API credentials through Telegram's developer portal.
2. On your own computer, run python backend/scripts/generate_telegram_session.py.
3. Put TELEGRAM_API_ID, TELEGRAM_API_HASH, and TELEGRAM_SESSION in the server secret environment.
4. Do not commit the session string, paste it into a public issue, or send it in a chat. Treat it like a password. If it leaks, revoke the session from Telegram's active sessions.
5. Configure public channel usernames in the website Sources page.
6. Start the optional worker and scheduler with: docker compose --profile agent up --build -d worker scheduler.

The scheduler checks enabled subscriptions every 15 minutes. The current worker supports Telegram channel ingestion; marketplace entries remain pending until their provider-specific adapters are implemented and verified.
