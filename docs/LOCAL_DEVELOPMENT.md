# Local development

The primary free deployment target is Cloudflare Workers + D1. Email/SMTP configuration is not required and must not be added to the Telegram-only account flow.

## Optional local stack

1. Copy `.env.example` to `.env` for the optional FastAPI/PostgreSQL development stack.
2. Set unique local-only `JWT_SECRET` and `BOT_API_SECRET` values. Generate `INTEGRATION_ENCRYPTION_KEY` with `python backend/scripts/generate_integration_key.py` only if testing encrypted integration storage.
3. Start the optional local stack with `docker compose up --build -d`.
4. Start the web UI from `apps/web`: copy `.env.example` to `.env.local`, run `npm install`, then `npm run dev`.
5. The website account flow uses Telegram one-time codes. Configure the Cloudflare Worker secrets for a live Telegram login; no email address or password is used.
6. The Python polling bot is an optional local development alternative. Set `TELEGRAM_BOT_TOKEN` and `BOT_API_SECRET`, then run `docker compose --profile bot up --build -d bot`.

The local web app is available at http://localhost:3000; the optional FastAPI service is at http://localhost:8000 and its docs at http://localhost:8000/docs.

## Tests

- Backend: `pip install -e "./backend[dev]" && python -m pytest backend/tests`
- Backend migrations: `cd backend && DATABASE_URL=sqlite:///./migration-test.db alembic upgrade head`
- Frontend: `cd apps/web && npm install && npm run lint && npm run test:e2e && npm run build`
- Cloudflare Worker: `cd cloudflare-api && npm install && npm run typecheck && npm test && python3 tests/migrations.test.py`
- Python bot syntax: `python -m py_compile apps/bot/bot.py`

Never use production secrets in local test environments. A green CI run does not verify the deployed Cloudflare database, bot webhook, AI provider, or live source scans.
