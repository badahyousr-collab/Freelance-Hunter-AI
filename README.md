# Pipisso — Freelance Hunter

Freelance Hunter is one of the systems in the Pipisso ecosystem, focused on AI-assisted freelance opportunity discovery and proposal management through a web workspace and Telegram companion bot.

## Product goals

- Discover projects from freelance marketplaces and public Telegram channels.
- Normalize and deduplicate listings from independent source adapters.
- Match opportunities against each user's skills, language, budget, freshness, and payment preferences.
- Draft personalized proposals in Russian or English.
- Track proposal lifecycle and report accurate statistics in the web dashboard and Telegram.
- Keep user data and integration credentials isolated and protected.

## Repository layout

- `apps/web` — Next.js + TypeScript web application.
- `apps/bot` — Telegram bot (aiogram).
- `backend` — FastAPI application and domain modules.
- `sources` — source-adapter contracts and integrations.
- `docs` — product specification, architecture, roadmap, and acceptance criteria.

## Current status

The current Cloudflare implementation includes D1-backed accounts and sessions, email verification/password reset flows, per-user workspace data, public Telegram channel scanning, a Cloudflare webhook bot, and profile-grounded AI proposal drafts.

- Website: https://freelance-hunter-ai.badahyousr.workers.dev/
- API health endpoint: https://plain-voice-c13ffreelance-hunter-api.badahyousr.workers.dev/health
- Public Telegram channels: manual scan plus a 15-minute Cron Trigger while the agent is enabled.
- Telegram bot: Worker webhook mode; no separate always-on bot server is required.
- Proposal drafting: OpenAI-compatible API configuration is required; drafts are saved but never reported as sent.
- Still pending: production secrets/email sender setup, live runtime verification, provider-specific marketplace adapters, actual proposal submission, reply synchronization, and push notifications.

GitHub CI verifies the backend tests/migrations, frontend lint/build, and Cloudflare Worker typecheck. A green CI run does not replace the final end-to-end test against the deployed Cloudflare account. The application must never report a proposal as sent unless the source adapter confirms the result.

## Local development

Prerequisites: Docker Compose, Python 3.12+, Node.js 20+.

1. Copy `.env.example` to `.env` and fill in local values.
2. Start infrastructure and API: `docker compose up --build -d`. The API container applies database migrations before serving requests.
3. Follow the backend and web instructions in their respective directories.
4. Run tests with `cd backend && python -m pytest`.

See [the roadmap](docs/ROADMAP.md), [architecture](docs/ARCHITECTURE.md), [acceptance checklist](docs/ACCEPTANCE.md), [local development](docs/LOCAL_DEVELOPMENT.md), [Telegram setup](docs/TELEGRAM_SETUP.md), and [integration notes](docs/INTEGRATIONS.md).
