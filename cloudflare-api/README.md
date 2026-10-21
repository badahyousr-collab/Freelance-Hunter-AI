# Cloudflare D1 API

This directory contains the first Cloudflare-native API implementation for Freelance Hunter AI. It uses a D1 database and does not require a paid PostgreSQL, Redis, or background-worker host.

## What is implemented

- D1 schema for users, sessions, profiles, agent settings, source configurations, projects, applications, integrations, and Telegram link codes.
- Telegram one-time-code registration/login, logout, and HTTP-only cookie-backed sessions.
- D1-backed rate limits on Telegram code creation/status checks and AI drafting; excess requests receive HTTP 429.
- Per-user data filtering on profile, sources, projects, applications, and settings.
- Dashboard summary and CRUD for saved source configurations.
- Same-origin frontend proxy is implemented in `apps/web/src/app/api/backend/[...path]/route.ts`.

## Important limitations

- Email/password authentication and email delivery are disabled. Account creation and login use the Telegram bot only. Apply all checked-in D1 migrations through `0014_profile_portfolio_url.sql` before relying on the latest identity, notifications, provider-submission, or profile portfolio behavior.
- Public Telegram channel previews and Freelancehunt projects are collected only when a publication date is known and no more than 72 hours old. Enabling the AI agent starts a scan; a 15-minute Cron Trigger rotates through bounded source batches while it is enabled. With 13 enabled sources, one full rotation spans five Cron ticks (about 75 minutes); each tick does not scan every source. Telegram scanning reads public previews only.
- Supported discovery adapters are Freelancehunt's official API, FL.ru's public RSS feed, Freelance.ru tasks marked visible to everyone, and public Telegram channel previews. FL.ru and Freelance.ru are read-only discovery sources; review and submit their saved drafts manually. Freelancehunt bid submission uses its official API and a user API token. Automatic sending is available only for fresh, matched listings with a listed supported budget and a clearly parsed deadline, when enabled by the user and under the daily cap. Only a provider-confirmed bid ID marks an application sent. Telegram posts and other marketplaces are never submitted as bids. Kwork, Upwork, Fiverr, Freelancer.com, and other unimplemented providers are not supported connections. Profile-grounded AI drafting requires a configured AI provider. Message-thread reply synchronization is not implemented. The Telegram bot runs as a Cloudflare Worker webhook, so a separate always-on bot host is not required.
- Freelancehunt API tokens are validated and encrypted before storage; unsupported provider secrets are rejected. Never add credentials to source files or commit them.
- D1 has free-plan quotas; it is not unlimited.

## Cloudflare Workers Builds setup

Create a separate Worker build project connected to this same GitHub repository.

- Root directory: `cloudflare-api`
- Build command: `npm install && npx wrangler d1 migrations apply freelance-hunter-db --remote`
- Deploy command: `npx wrangler deploy`
- The Cloudflare API token used by the build needs permission to edit Workers and D1 databases for the selected account.

The `wrangler.toml` already names the D1 database `freelance-hunter-db` and includes the database ID provided during setup. Check that the ID matches the D1 database in your account before deploying. Apply all checked-in migrations through `0012_auto_submission.sql` before enabling the updated bot and submission workflow.

After deployment, open the Worker URL and append `/health`. A successful response should report `"status":"ok"` and `"database":"connected"`.

## Connect the frontend

The frontend Worker's `wrangler.jsonc` already points `CLOUDFLARE_API_URL` to `https://plain-voice-c13ffreelance-hunter-api.badahyousr.workers.dev`. If the API Worker is renamed, update this runtime variable and redeploy the frontend. Do not set `NEXT_PUBLIC_API_URL`: browser requests should go through the same-origin `/api/backend` proxy so the session cookie belongs to the frontend hostname.

## Database migration

The first deployment build applies the checked-in D1 migration remotely. If the build token cannot apply migrations, use Cloudflare Dashboard → D1 → `freelance-hunter-db` → Console and execute the contents of `migrations/0001_init.sql` once, then redeploy. Do not execute the same `CREATE TABLE` migration twice against an already initialized database.

## Telegram-only identity

The website creates a single-use 9-digit Telegram code with a 10-minute expiry. The user opens the configured bot and sends the code as a plain message. The Worker validates the code, binds the Telegram identity, and issues an HTTP-only session cookie. Email/password routes return HTTP 410 and are not a supported authentication path. Before production use, apply the checked-in D1 migrations and verify login, logout, session expiry, and cross-account isolation against the deployed Worker.

## Marketplace credentials

Freelancehunt is the only marketplace credential adapter currently enabled. FL.ru and Freelance.ru need no credentials for their public discovery feeds. Set `INTEGRATION_ENCRYPTION_KEY` as a Cloudflare Worker secret before connecting a token. It must contain at least 32 characters. Generate a strong random value with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Tokens are validated against the official API and encrypted with AES-GCM before they are stored. Losing the key makes saved tokens unrecoverable. Never put the token or encryption key in frontend variables or Git.

## AI proposal drafting

The scheduled agent can prepare a draft for a fresh matching project when automatic preparation is enabled. The API verifies project ownership, passes only the saved profile and listing facts to an OpenAI-compatible chat-completions endpoint, and saves the response as a `draft` application. If automatic sending is also enabled and the source is a connected Freelancehunt account, the Worker can submit through the official API within the configured daily cap.

Configure:
- `AI_API_KEY` as a Worker secret.
- `AI_MODEL` as a Worker variable.
- `AI_API_BASE_URL` as an optional Worker variable. The default is `https://api.openai.com/v1`; compatible providers can use their own base URL.

The prompt prohibits invented experience, portfolio items, results, and credentials. A provider key is not included in API responses or browser code.

## Telegram bot configuration

For the Cloudflare-native webhook bot, configure these as **Worker secrets** (not plain variables): `TELEGRAM_BOT_TOKEN` (a newly issued token), `TELEGRAM_WEBHOOK_SECRET` (a random string of 32+ characters using letters, digits, `_` or `-`), and `BOT_API_SECRET` (a separate strong random secret used to protect setup and server-to-server endpoints). After the secrets are saved, send an authenticated `POST` request to `/telegram/webhook/setup` with header `X-Bot-Secret: <BOT_API_SECRET>`; the Worker registers its webhook URL and Telegram commands. The Python long-polling bot in `apps/bot` remains available for local development, but it is not needed for the free Cloudflare deployment.

The website registration/login flow creates a one-time 9-digit code. Open the bot, press Start, then send the code as a normal message - no `/link` command is needed for authentication. The website provides a copy-code button and lets the user refresh an expired or rejected code. Registration detects an already-linked Telegram account and shows an error on both the bot and website; use the login page for an existing account. The bot exposes `/stats`, `/projects`, `/pause`, `/resume`, and `/help`. It provides a short summary of recent orders and application counts. Proposal drafts can be edited and prepared for submission or closed. Freelancehunt applications are marked sent only after the provider returns a bid ID. Client attempts to set `sent` or `replied` directly are rejected. Add public Telegram sources in the Sources page; scans run when the agent starts and every 15 minutes while it is enabled.

If a bot token has been pasted into chat, a ticket, or source control, revoke it in `@BotFather` and use a newly issued token only as a deployment secret.
