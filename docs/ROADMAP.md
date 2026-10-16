# Implementation roadmap

## Phase 1 - Specification and foundation
- [x] Record product goals, system boundaries, architecture, and acceptance criteria.
- [x] Establish repository conventions and environment template.
- [x] Define source adapter contract and initial database schema/migrations.

## Phase 2 - Backend, persistence, and Telegram identity
- [x] FastAPI configuration and health endpoints.
- [x] PostgreSQL models and Alembic migrations.
- [x] Telegram one-time-code sign-in and sign-out session.
- [x] HTTP-only cookie session and per-user authorization checks.
- [x] Tests for authentication, malformed input, and selected ownership boundaries.
- [x] Disable email/password login, email verification, and password-reset API routes in Cloudflare API.
- [x] Remove email login and recovery screens from the website.
- [ ] Remove legacy email/password columns and email-delivery code from all active schemas/services with a safe migration.
- [ ] Verify session expiry, account isolation, and Telegram sign-in against the deployed environment.

## Phase 3 - Web control panel
- [x] Dark responsive dashboard and navigation.
- [x] Projects, applications, sources, AI agent, analytics, settings, integrations, security, registration, and login pages.
- [x] Dashboard statistics and project lists use persisted API data rather than fabricated counts.
- [x] Profile preferences and source configuration forms call the API.
- [ ] Complete browser end-to-end tests for login, dashboard, project filters, source configuration, settings, and logout.
- [ ] Fix and verify session-expiry handling, empty states, mobile layouts, and all visible controls.
- [ ] Verify the deployed website against the latest API Worker.

## Phase 4 - Source ingestion
- [x] Normalized source adapter contract.
- [x] Telegram post parser, public channel adapter, scheduled worker, retry behavior, deduplication, and per-source scan health.
- [x] Per-user source subscriptions and enabled-agent filtering.
- [x] Authenticated user-scoped manual scan endpoint.
- [ ] Build a curated catalog of public Telegram job channels, with verified channel URLs, languages, and focus areas.
- [ ] Configure and test a real scan against several public channels and verify newly stored projects.
- [ ] Implement and verify provider-specific marketplace discovery adapters where access is permitted.
- [ ] Add operational monitoring for source failures, scan duration, and new-project counts.

## Phase 5 - Matching and proposal drafting
- [x] Deterministic hard filters for language, minimum budget, currency, payment method, and excluded keywords.
- [x] Explainable baseline score and reasons.
- [x] OpenAI-compatible proposal drafting endpoint with profile-grounded, prompt-injection-aware instructions.
- [ ] Configure and test an AI provider in the deployment environment.
- [ ] Improve multilingual budget and currency parsing.
- [ ] Create a labeled matching evaluation set and test relevance, false positives, false negatives, and hard-filter invariants.
- [ ] Test proposal drafts in Russian and English against real anonymized listings and confirm no fabricated profile claims.

## Phase 6 - Marketplace integrations and application tracking
- [x] Per-user integration records with encrypted-credential design and API responses that do not expose secrets.
- [ ] Implement provider-specific official OAuth/API authorization and verify connection status.
- [ ] Implement proposal submission only for providers with a verified supported capability.
- [ ] Implement reliable reply/status synchronization and submission idempotency.
- [ ] Show clear states for draft, awaiting confirmation, submitting, confirmed sent, failed, and replied.

## Phase 7 - Telegram companion
- [x] One-time expiring website-to-Telegram account linking.
- [x] Statistics, project listing, pause/resume, and help commands.
- [x] Cloudflare Worker webhook mode and server-side secret checks.
- [ ] Configure and verify the deployed bot token/webhook secrets and real Telegram messages.
- [ ] Add notifications for new matches and tracked client replies.
- [ ] Verify that site and bot show the same persisted state.

## Phase 8 - Quality and deployment
- [x] Backend unit/API tests.
- [x] Alembic migration upgrade and downgrade check in CI.
- [x] Frontend lint and production build in CI.
- [x] Python syntax checks for bot and local setup scripts.
- [ ] Validate Docker Compose end-to-end and run the deployed smoke-test checklist.
- [ ] Add production backups, rate limiting, alerting, and dependency/security scanning.
- [ ] Run authorization and data-isolation tests across all user-scoped endpoints.

## Phase 9 - Portfolio
- [x] README, architecture, roadmap, acceptance checklist, and setup guides.
- [ ] Capture real screenshots and a demo recording after the app is configured.
- [ ] Publish an accurate case study with verified runtime measurements.

## Working rules

1. Work in small, reviewable increments.
2. Finish and verify the current phase before marking it complete.
3. Do not mark a feature complete solely because code was written.
4. Keep secrets out of Git and logs.
5. Treat listing descriptions and Telegram posts as untrusted input.
6. Keep source-specific behavior behind adapters.
7. Never bypass CAPTCHA or platform security checks.
8. Never report a proposal as sent without a provider-confirmed result.
