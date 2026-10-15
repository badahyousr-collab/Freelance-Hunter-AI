# Cloudflare D1 API

This directory contains the first Cloudflare-native API implementation for Freelance Hunter AI. It uses a D1 database and does not require a paid PostgreSQL, Redis, or background-worker host.

## What is implemented

- D1 schema for users, sessions, profiles, agent settings, source configurations, projects, applications, integrations, and Telegram link codes.
- Registration, password hashing with PBKDF2, login, logout, and cookie-backed sessions.
- D1-backed per-IP rate limits on registration (5/15 min), email verification (10/15 min), and login (10/15 min); excess requests receive HTTP 429.
- Per-user data filtering on profile, sources, projects, applications, and settings.
- Dashboard summary and CRUD for saved source configurations.
- Same-origin frontend proxy is implemented in `apps/web/src/app/api/backend/[...path]/route.ts`.

## Important limitations

- Email delivery is not configured, so verification emails cannot be sent. Do not treat the current registration flow as production-ready email verification.
- Public Telegram channel preview scanning is implemented for manual scans and a 15-minute Cron Trigger when the user has enabled the AI agent. It reads public previews only; private channels and provider-specific marketplace adapters are not supported yet.
- Kwork, Freelancehunt, Upwork, and FL.ru live adapters are not active. Profile-grounded AI proposal drafting is implemented but requires an AI provider key and model configuration. Real marketplace submission, push notifications, and reply synchronization are not active. The Telegram bot can run directly as a Cloudflare Worker webhook, so a separate always-on bot host is not required.
- Integration secrets are not stored until encrypted secret storage is configured. Never add credentials to source files or commit them.
- D1 has free-plan quotas; it is not unlimited.

## Cloudflare Workers Builds setup

Create a separate Worker build project connected to this same GitHub repository.

- Root directory: `cloudflare-api`
- Build command: `npm install && npx wrangler d1 migrations apply freelance-hunter-db --remote`
- Deploy command: `npx wrangler deploy`
- The Cloudflare API token used by the build needs permission to edit Workers and D1 databases for the selected account.

The `wrangler.toml` already names the D1 database `freelance-hunter-db` and includes the database ID provided during setup. Check that the ID matches the D1 database in your account before deploying. Apply all checked-in migrations, including `0003_telegram_link_uniqueness.sql`, before enabling the bot.

After deployment, open the Worker URL and append `/health`. A successful response should report `"status":"ok"` and `"database":"connected"`.

## Connect the frontend

In the existing frontend Worker project's environment variables, add a **runtime variable**:

- Name: `CLOUDFLARE_API_URL`
- Value: the deployed API Worker URL, for example `https://freelance-hunter-api.<your-account-subdomain>.workers.dev` (use the actual URL shown by Cloudflare).

Save the variable and redeploy the frontend. Do not set `NEXT_PUBLIC_API_URL`: browser requests should go through the same-origin `/api/backend` proxy so the session cookie belongs to the frontend hostname.

## Database migration

The first deployment build applies the checked-in D1 migration remotely. If the build token cannot apply migrations, use Cloudflare Dashboard → D1 → `freelance-hunter-db` → Console and execute the contents of `migrations/0001_init.sql` once, then redeploy. Do not execute the same `CREATE TABLE` migration twice against an already initialized database.

## AI proposal drafting

The Projects page calls `POST /applications/{project_id}/draft`. It verifies project ownership, passes only the saved profile and listing facts to an OpenAI-compatible chat-completions endpoint, and saves the response as a `draft` application. It does not submit proposals.

Configure:
- `AI_API_KEY` as a Worker secret.
- `AI_MODEL` as a Worker variable.
- `AI_API_BASE_URL` as an optional Worker variable. The default is `https://api.openai.com/v1`; compatible providers can use their own base URL.

The prompt prohibits invented experience, portfolio items, results, and credentials. A provider key is not included in API responses or browser code.

## Telegram bot configuration

For the Cloudflare-native webhook bot, configure these as **Worker secrets** (not plain variables): `TELEGRAM_BOT_TOKEN` (a newly issued token), `TELEGRAM_WEBHOOK_SECRET` (a random string of 32+ characters using letters, digits, `_` or `-`), and `BOT_API_SECRET` (a separate strong random secret used to protect setup and server-to-server endpoints). After the secrets are saved, send an authenticated `POST` request to `/telegram/webhook/setup` with header `X-Bot-Secret: <BOT_API_SECRET>`; the Worker registers its webhook URL and Telegram commands. The Python long-polling bot in `apps/bot` remains available for local development, but it is not needed for the free Cloudflare deployment.

The website linking flow is **Security → Telegram → Generate one-time code**, then send `/link CODE` to the bot. The bot exposes `/stats`, `/projects`, `/pause`, `/resume`, and `/help`. New-project and client-reply push notifications are not implemented yet. Public Telegram sources can be scanned from the AI-agent page; scheduled scans run every 15 minutes only while the agent is enabled.

If a bot token has been pasted into chat, a ticket, or source control, revoke it in `@BotFather` and use a newly issued token only as a deployment secret.
