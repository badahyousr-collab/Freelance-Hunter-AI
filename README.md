# Pipisso - Freelance Hunter

Freelance Hunter is part of the Pipisso ecosystem. It discovers freelance opportunities, ranks them against a user's profile, and helps manage proposals through a web workspace and Telegram bot.

## Product goals

- Discover projects from freelance marketplaces and public Telegram channels.
- Normalize and deduplicate listings through source adapters.
- Match opportunities against skills, language, budget, freshness, and payment preferences.
- Draft personalized proposals in Russian or English without inventing experience.
- Track the proposal lifecycle and report only confirmed outcomes.
- Keep user data and integration credentials isolated and protected.
- Use Telegram as the only account registration and sign-in method. Email/password authentication is disabled.

## Repository layout

- `apps/web` - Next.js + TypeScript web application.
- `apps/bot` - Telegram bot (aiogram).
- `backend` - FastAPI application and domain modules.
- `sources` - source-adapter contracts and integrations.
- `docs` - product specification, architecture, roadmap, and acceptance criteria.

## Current implementation status

- Website: https://freelance-hunter-ai.badahyousr.workers.dev/
- API health endpoint: https://plain-voice-c13ffreelance-hunter-api.badahyousr.workers.dev/health
- Telegram sign-in: one-time code with a short expiry and HTTP-only session cookie.
- Public Telegram channel and Freelancehunt listings are accepted only when their publication time is known and no more than 72 hours old. Enabling the agent starts an initial scan; a 15-minute Cron Trigger continues while it remains enabled.
- AI proposals: require an OpenAI-compatible provider configuration and use profile-grounded natural-writing instructions. When the agent and auto-submit are enabled, eligible fresh Freelancehunt listings are submitted through the official API without per-proposal confirmation, subject to a configurable daily cap. A proposal is marked sent only after the API returns a verifiable bid ID. Missing or unsupported budget/currency, unavailable credentials, Telegram listings, and unimplemented marketplace adapters are not auto-submitted.
- Operational alerts: optional Telegram alerts for scheduled scan and notification failures require `WORKER_ALERT_CHAT_ID` plus the configured bot token.
- Freelancehunt client-response notifications: after manual status sync confirms a rejected bid or winner selection, the bot can notify the linked Telegram account; this can be disabled in AI-agent settings.
- Marketplace discovery: Freelancehunt official API, FL.ru public RSS, and Freelance.ru public tasks. Automatic bid submission is only supported for Freelancehunt; FL.ru and Freelance.ru require manual submission. Upwork, Kwork, Fiverr, Freelancer.com, and other unsupported marketplaces remain unavailable pending an official permitted access path.
- Live deployment verification and browser end-to-end checks remain required.

Email/password authentication is not a supported feature. D1 migration `0007_telegram_only_identity.sql` removes the legacy identity columns; migration `0008_new_project_notifications.sql` adds the per-user notification preference. The migrations must be applied and verified against the deployed D1 database before claiming the production environment is up to date.

A green CI run does not replace an end-to-end test against the deployed Cloudflare account. An application must never report a proposal as sent unless the source adapter confirms the result.

## Local development

Prerequisites: Docker Compose, Python 3.12+, Node.js 20+.

1. Copy `.env.example` to `.env` and fill in local values.
2. Start infrastructure and API: `docker compose up --build -d`. The API container applies database migrations before serving requests.
3. Follow the backend and web instructions in their respective directories.
4. Run tests with `cd backend && python -m pytest`.

See [the roadmap](docs/ROADMAP.md), [architecture](docs/ARCHITECTURE.md), [acceptance checklist](docs/ACCEPTANCE.md), [local development](docs/LOCAL_DEVELOPMENT.md), [operations and recovery](docs/OPERATIONS.md), [case study](docs/CASE_STUDY.md), [Telegram setup](docs/TELEGRAM_SETUP.md), [public Telegram sources](docs/TELEGRAM_SOURCES.md), and [integration notes](docs/INTEGRATIONS.md).
