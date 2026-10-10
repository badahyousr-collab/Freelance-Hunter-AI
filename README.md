# Freelance Hunter AI

AI-assisted freelance opportunity discovery and proposal management, with a web control panel and Telegram companion bot.

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

Initial repository setup. Integrations and outbound application workflows must be implemented and verified source by source. The application must never report a proposal as sent unless the source adapter confirms the result.

## Local development

Prerequisites: Docker Compose, Python 3.12+, Node.js 20+.

1. Copy `.env.example` to `.env` and fill in local values.
2. Start infrastructure and API: `docker compose up --build -d`. The API container applies database migrations before serving requests.
3. Follow the backend and web instructions in their respective directories.
4. Run tests with `cd backend && python -m pytest`.

See [the roadmap](docs/ROADMAP.md), [architecture](docs/ARCHITECTURE.md), and [acceptance checklist](docs/ACCEPTANCE.md).
