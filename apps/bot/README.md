# Telegram companion bot

The primary deployment uses the Cloudflare Worker webhook in `cloudflare-api/src/index.ts`. The Python aiogram bot is an optional local-development alternative that calls the FastAPI service.

Commands:
- `/start` - setup instructions and persistent keyboard.
- `/link CODE` - link Telegram to the signed-in website account using a short-lived, single-use code in the Python/FastAPI mode.
- `/stats` - show project, match, submission, and reply counts.
- `/projects` - show up to five latest projects visible through the linked user's enabled sources, with a button to open each listing.
- `/pause` and `/resume` - pause or enable the linked user's agent.
- `/help` - show instructions.

For the Cloudflare Worker webhook mode, website login and registration use a one-time 9-digit code sent as a plain message after pressing Start; no `/link` command is needed for authentication. In the optional Python/FastAPI mode, account linking uses the Security page's one-time code with `/link CODE`.

Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `BOT_API_SECRET` as private Cloudflare Worker secrets for webhook mode. The optional Python bot uses `TELEGRAM_BOT_TOKEN` and `BOT_API_SECRET` as local secrets.

The Cloudflare Worker can notify linked users about newly inserted projects if `notify_new_projects` is enabled. After manual Freelancehunt status sync, it can also notify a linked Telegram account about a provider-confirmed rejected bid or winner selection when `notify_application_updates` is enabled. The Python polling bot remains an on-demand companion and does not independently send push notifications. Message-thread conversations are not synchronized.
