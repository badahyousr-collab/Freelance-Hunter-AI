# Telegram setup

## Account sign-in

The website uses Telegram as its only account identity. Registration and sign-in use a one-time code with a 10-minute expiry. The website does not ask for an email address or a password.

1. Create or select the project bot through Telegram's official BotFather.
2. Configure `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `BOT_API_SECRET` as Cloudflare Worker secrets.
3. Configure the bot webhook to point to the deployed API Worker webhook endpoint, using the webhook secret expected by the Worker.
4. Open the website's Login or Register page, request a code, and send that code to the bot as a plain message after pressing Start.
5. The Worker creates or finds the Telegram identity and issues an HTTP-only website session. Do not send codes to anyone else.

For account-to-bot linking in an existing workspace, use the one-time code on the Security page and send `/link CODE` to the bot. Linking codes expire and can only be used once.

## Public Telegram job channels

The Cloudflare Worker reads public Telegram web previews at `https://t.me/s/CHANNEL`. It does not need a Telegram user session, API ID, or API hash for these public previews. Private channels are not supported.

1. Open the website's Sources page.
2. Add a suggested channel or enter its public username, for example `@tgram_jobs`.
3. Set up the skill profile and filters, then press **Scan now**.
4. Check the scan result and the source's last-scan status. A source is only verified after the Worker successfully reads it and stores relevant, non-duplicate projects.
5. The Worker has a 15-minute Cron Trigger configured for enabled users. Verify an actual scheduled run in production; configuration alone does not prove the trigger has executed.

## Deploying the API Worker

From `cloudflare-api`, run:

```bash
npm install
npm run deploy
```

The deploy script publishes the compatibility Worker first, then applies pending remote D1 migrations. The compatibility code supports both the old and Telegram-only D1 schema during the rollout. Confirm the deploy and migration commands both succeed before relying on the new schema.

## Secrets

- `TELEGRAM_BOT_TOKEN`: token from BotFather.
- `TELEGRAM_WEBHOOK_SECRET`: secret used to validate webhook requests.
- `BOT_API_SECRET`: shared secret for bot-to-API calls.
- `AI_API_KEY` and `AI_MODEL`: required before AI provider features can be tested.
- `AI_API_BASE_URL`: optional OpenAI-compatible API base URL.

Keep secrets in Cloudflare Worker secrets or a local untracked `.env`. Never commit them or paste them into chat.
