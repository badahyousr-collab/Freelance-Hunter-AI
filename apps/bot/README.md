# Telegram companion bot

Implemented commands:
- /start — help and keyboard.
- /link CODE — link the Telegram account to an authenticated website account using a short-lived, single-use code.
- /stats — show stored project, match, submission, and reply counts.
- /pause and /resume — update the linked user's agent-enabled flag.
- /help — show command instructions.

Set TELEGRAM_BOT_TOKEN and BOT_API_SECRET in the private environment. The same BOT_API_SECRET must be configured for the backend and bot. Start the optional service with docker compose --profile bot up --build -d bot.

The bot does not ask for website passwords. Do not commit bot tokens or API secrets. Notifications for new projects and replies are not implemented yet.
