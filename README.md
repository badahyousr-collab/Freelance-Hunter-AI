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
- Freelancehunt discovery: official API token verification, encrypted token storage, and open-project ingestion are implemented in code and covered by mocked tests; live account verification remains pending.
- Other marketplace discovery, proposal submission, and client-reply synchronization are not implemented.
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
