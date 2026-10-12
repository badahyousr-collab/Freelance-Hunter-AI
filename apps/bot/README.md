# Telegram companion bot

Russian-language bot interface for the Freelance Hunter AI website.

Commands:
- `/start` — setup instructions and persistent keyboard.
- `/link CODE` — link Telegram to the signed-in website account using a short-lived, single-use code.
- `/stats` — show project, match, submission, and reply counts.
- `/projects` — show up to five latest projects visible through the linked user's enabled sources, with a button to open each listing.
- `/pause` and `/resume` — pause or enable the linked user's agent.
- `/help` — show instructions.

Website linking: open **Security → Telegram**, generate a one-time code, then send `/link CODE` to the bot. The code expires after 10 minutes and can be used only once.

Set `TELEGRAM_BOT_TOKEN` and `BOT_API_SECRET` as private environment secrets. The same `BOT_API_SECRET` must be configured for the backend and bot. Start the optional service with `docker compose --profile bot up --build -d bot`.

Never commit bot tokens or API secrets. Push notifications for new projects and client replies are not implemented yet; `/projects` is an on-demand list, not a notification feed.
