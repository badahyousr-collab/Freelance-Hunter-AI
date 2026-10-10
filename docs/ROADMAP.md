# Implementation roadmap

## Phase 1 — Specification and foundation
- [x] Record product goals, system boundaries, architecture, and acceptance criteria.
- [x] Establish repository conventions and environment template.
- [x] Define source adapter contract and initial database schema/migrations.

## Phase 2 — Backend, persistence, and identity
- [x] FastAPI configuration and health endpoints.
- [x] PostgreSQL models and Alembic migrations.
- [x] Email registration, verification, login, and logout.
- [x] HTTP-only cookie session and password hashing.
- [x] Per-user authorization checks for workspace, source, application, and integration endpoints.
- [x] Tests for authentication, malformed input, and selected ownership boundaries.
- [ ] Password reset flow and rate limiting.
- [ ] Configure a real SMTP provider and verify delivery outside development.

## Phase 3 — Web control panel
- [x] Dark responsive dashboard and navigation.
- [x] Projects, applications, sources, AI agent, analytics, settings, integrations, security, registration, login, and email verification pages.
- [x] Dashboard statistics and project lists use persisted API data rather than fabricated counts.
- [x] Profile preferences and source configuration forms call the API.
- [ ] Add end-to-end browser tests and production session-expiry handling.

## Phase 4 — Source ingestion
- [x] Normalized source adapter contract.
- [x] Telegram post parser, public channel adapter, scheduled worker, retry behavior, deduplication, and per-source scan health.
- [x] Per-user source subscriptions and enabled-agent filtering.
- [ ] Configure Telegram API credentials and an authorized server session.
- [ ] Implement and verify provider-specific marketplace discovery adapters.
- [x] Add an authenticated user-scoped manual scan endpoint.
- [ ] Add an operational monitoring dashboard.

## Phase 5 — Matching and proposal drafting
- [x] Deterministic hard filters for language, minimum budget, currency, payment method, and excluded keywords.
- [x] Explainable baseline score and reasons.
- [x] OpenAI-compatible proposal drafting endpoint with profile-grounded instructions.
- [ ] Configure and test an AI provider in the deployment environment.
- [ ] Improve multilingual budget parsing and evaluate matching against a labeled test set.

## Phase 6 — Marketplace integrations and application tracking
- [x] Per-user integration records with Fernet-encrypted credentials.
- [x] API never returns saved credentials and requires an encryption key.
- [ ] Implement provider-specific OAuth/API authorization and credential verification.
- [ ] Implement proposal submission only for providers with a verified supported capability.
- [ ] Implement reliable reply/status synchronization and submission idempotency.

## Phase 7 — Telegram companion
- [x] One-time expiring website-to-Telegram account linking.
- [x] Statistics, pause/resume, and help commands.
- [x] Bot API secret and server-side identity checks.
- [ ] Configure a BotFather token and run the bot service.
- [ ] Add push notifications for new matches and tracked client replies.

## Phase 8 — Quality and deployment
- [x] Backend unit/API tests.
- [x] Alembic migration upgrade and downgrade check in CI.
- [x] Frontend lint and production build in CI.
- [x] Python syntax checks for bot and local setup scripts.
- [ ] Validate Docker Compose end-to-end and deploy to a real host.
- [ ] Add production database backups, rate limiting, alerting, and dependency/security scanning.

## Phase 9 — Portfolio
- [x] README, architecture, roadmap, acceptance checklist, and setup guides.
- [ ] Capture real screenshots and a demo recording after the app is configured.
- [ ] Publish an accurate case study with verified runtime measurements.

## Working rules
1. Work in small, reviewable increments.
2. Compare every requirement with implementation and tests after each phase.
3. Do not mark an item complete solely because code was written.
4. Keep secrets out of Git and logs.
5. Treat listing descriptions and Telegram posts as untrusted input.
6. Keep source-specific behavior behind adapters.
