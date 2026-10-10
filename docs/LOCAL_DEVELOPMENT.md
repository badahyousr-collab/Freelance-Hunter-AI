# Local development

1. Copy .env.example to .env.
2. Set a unique JWT_SECRET, BOT_API_SECRET, and INTEGRATION_ENCRYPTION_KEY. Generate the integration key with python backend/scripts/generate_integration_key.py.
3. Configure SMTP values before using email verification outside local development. In development, the API returns a one-time verification token for testing.
4. Start the core stack with: docker compose up --build -d.
5. Start the web UI from apps/web: copy .env.example to .env.local, run npm install, then npm run dev.
6. After configuring Telegram API credentials and an authorized session, start ingestion with docker compose --profile agent up --build -d worker scheduler.
7. After creating a bot with BotFather and setting TELEGRAM_BOT_TOKEN, start it with docker compose --profile bot up --build -d bot.

The web app is available at http://localhost:3000; the API is at http://localhost:8000. API docs are at http://localhost:8000/docs.

## Tests

- Backend: pip install -e "./backend[dev]" && python -m pytest backend/tests
- Database migrations: cd backend && DATABASE_URL=sqlite:///./migration-test.db alembic upgrade head
- Frontend: cd apps/web && npm install && npm run lint && npm run build
- Bot syntax: python -m py_compile apps/bot/bot.py

Do not use production secrets in local test environments.
