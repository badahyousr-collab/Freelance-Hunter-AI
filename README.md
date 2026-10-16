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
- Public Telegram channel ingestion: manual scan and a 15-minute Cron Trigger while the agent is enabled.
- AI proposal drafts: require an OpenAI-compatible provider configuration and are saved as drafts, never marked as sent.
- Marketplace discovery and proposal submission: provider-specific adapters are not yet implemented.
- Live deployment verification and browser end-to-end checks remain required.

Email login, password recovery, and email verification routes in the Cloudflare API return HTTP 410. The legacy database schema still contains compatibility fields for older accounts; removing those columns requires a migration validated against the deployed D1 database and the parallel FastAPI schema. The product must not present email as an account feature.

A green CI run does not replace an end-to-end test against the deployed Cloudflare account. An application must never report a proposal as sent unless the source adapter confirms the result.

## Local development

Prerequisites: Docker Compose, Python 3.12+, Node.js 20+.

1. Copy `.env.example` to `.env` and fill in local values.
2. Start infrastructure and API: `docker compose up --build -d`. The API container applies database migrations before serving requests.
3. Follow the backend and web instructions in their respective directories.
4. Run tests with `cd backend && python -m pytest`.

See [the roadmap](docs/ROADMAP.md), [architecture](docs/ARCHITECTURE.md), [acceptance checklist](docs/ACCEPTANCE.md), [local development](docs/LOCAL_DEVELOPMENT.md), [Telegram setup](docs/TELEGRAM_SETUP.md), [public Telegram sources](docs/TELEGRAM_SOURCES.md), and [integration notes](docs/INTEGRATIONS.md).
