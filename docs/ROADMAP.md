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
- [x] Remove email delivery settings/helpers and disable email auth routes in active API code.
- [x] Add a D1 migration to replace email/password identity fields with Telegram identity keys and anonymize legacy email-only identities.
- [ ] Apply the D1 migration in Cloudflare and verify existing Telegram accounts can still sign in.
- [x] Remove email/password fields from the parallel FastAPI user model and add an Alembic migration.
- [ ] Verify the D1 and PostgreSQL identity migrations against their target deployments.
- [ ] Verify session expiry, account isolation, and Telegram sign-in against the deployed environment.

## Phase 3 - Web control panel
- [x] Dark responsive dashboard and navigation.
- [x] Projects, applications, sources, AI agent, analytics, settings, integrations, security, registration, and login pages.
- [x] Dashboard statistics and project lists use persisted API data rather than fabricated counts.
- [x] Profile preferences and source configuration forms call the API.
- [x] Add Playwright smoke tests for Telegram auth, project search, source setup/manual scan, and settings save/layout.
- [x] Complete CI browser end-to-end tests for dashboard, session expiry, logout, source setup/manual scan, settings, agent controls, and proposal review.
- [ ] Fix and verify session-expiry handling, empty states, mobile layouts, and all visible controls.
- [ ] Verify the deployed website against the latest API Worker.

## Phase 4 - Source ingestion
- [x] Normalized source adapter contract.
- [x] Telegram post parser, public channel adapter, scheduled worker, retry behavior, deduplication, and per-source scan health.
- [x] Per-user source subscriptions and enabled-agent filtering.
- [x] Authenticated user-scoped manual scan endpoint.
- [x] Build a curated catalog of eight public Telegram job channels, with URLs, languages, and focus areas.
- [ ] Configure and test a real scan against several public channels and verify newly stored projects.
- [x] Implement the Freelancehunt official API discovery adapter with token validation, encrypted storage, project normalization, and deduplication.
- [ ] Implement and verify additional provider-specific marketplace discovery adapters where access is permitted.
- [x] Add structured logs for per-source scan outcomes, durations, new-project counts, and scheduled scan failures.
- [x] Add a free hourly GitHub Actions health monitor that opens/resolves one issue when the deployed Worker, D1 connection, or schema is unhealthy.
- [x] Add optional Telegram alert delivery for individual source failures, scheduled scan errors, and new-project notification failures.
- [ ] Configure `WORKER_ALERT_CHAT_ID` and verify real alert delivery in the deployed Worker.

## Phase 5 - Matching and proposal drafting
- [x] Deterministic hard filters for unsupported languages, minimum budget when currencies match, excluded keywords, and explicit unpaid-work signals; currency mismatches are not compared without an exchange rate.
- [x] Explainable baseline score and reasons.
- [x] OpenAI-compatible proposal drafting endpoint with profile-grounded, prompt-injection-aware instructions.
- [x] Mocked provider-contract tests for Russian and English drafts, payload facts, safety instructions, missing configuration, and upstream failures.
- [ ] Configure and test an AI provider in the deployment environment.
- [x] Improve multilingual budget and currency parsing with regression tests for RU/EN currency formats, thousands separators, and `k`/`тыс.` multipliers.
- [x] Add a labeled RU/EN matching evaluation set covering relevant and unrelated listings, budget thresholds, excluded keywords, unpaid work, language filters, risk signals, and complexity scoring.
- [ ] Test proposal drafts in Russian and English against real anonymized listings and confirm no fabricated profile claims.

## Phase 6 - Marketplace integrations and application tracking
- [x] Per-user integration records with encrypted-credential design and API responses that do not expose secrets.
- [x] Validate and encrypt Freelancehunt API tokens through the official profile endpoint; show connection status without exposing credentials.
- [ ] Implement and verify official OAuth/API authorization for additional providers where permitted.
- [x] Implement explicit, provider-confirmed bid submission through the Freelancehunt official API, with a concurrency guard and no automatic retry after ambiguous provider failures.
- [x] Add editable proposal drafts and an awaiting-confirmation/closed review workflow that cannot falsely mark a proposal as sent.
- [x] Prevent duplicate Freelancehunt submissions with a status claim and require a provider bid ID before marking an application sent.
- [ ] Implement reliable client-reply/status synchronization.
- [x] Show draft, awaiting confirmation, submitting, sent, failed, and submission-unknown states for Freelancehunt; other providers remain unavailable until verified adapters exist.

## Phase 7 - Telegram companion
- [x] One-time expiring website-to-Telegram account linking.
- [x] Statistics, project listing, pause/resume, and help commands.
- [x] Cloudflare Worker webhook mode and server-side secret checks.
- [ ] Configure and verify the deployed bot token/webhook secrets and real Telegram messages.
- [x] Add opt-out Telegram notifications for newly inserted projects, with deduplication and a three-listing message cap.
- [ ] Add notifications for tracked client replies after provider reply synchronization is available.
- [ ] Verify that site and bot show the same persisted state.

## Phase 8 - Quality and deployment
- [x] Backend unit/API tests.
- [x] Alembic migration upgrade and downgrade check in CI.
- [x] Frontend lint and production build in CI.
- [x] Python syntax checks for bot and local setup scripts.
- [ ] Validate Docker Compose end-to-end and run the deployed smoke-test checklist.
- [x] Apply rate limits to Telegram auth, AI draft generation, and manual scans; persist source failure status.
- [x] Add scheduled CodeQL analysis and weekly Dependabot checks for Python, Node, and GitHub Actions dependencies.
- [x] Expand Worker health diagnostics to detect missing Telegram-only identity, notification, and provider-submission migrations.
- [x] Add user-scope regression tests for core dashboard reads and proposal mutations.
- [x] Document free-plan-compatible D1 export, migration, and separate-test-database restore procedures.
- [ ] Execute and verify a D1 backup/restore drill against a non-production database.
- [x] Add optional Telegram operations alerts for scheduled scan and new-project notification failures, with a readiness indicator.
- [ ] Configure the private alert chat and verify real alert delivery in the deployed Worker.
- [ ] Complete authorization/data-isolation coverage for every user-scoped endpoint.

## Phase 9 - Portfolio
- [x] README, architecture, roadmap, acceptance checklist, setup guides, operations runbook, and code-verified case study.
- [ ] Capture real screenshots and a demo recording after the app is configured.
- [x] Publish a code-verified case study with explicit deployment limitations.
- [ ] Add verified runtime measurements after a live deployment test.

## Working rules

1. Work in small, reviewable increments.
2. Finish and verify the current phase before marking it complete.
3. Do not mark a feature complete solely because code was written.
4. Keep secrets out of Git and logs.
5. Treat listing descriptions and Telegram posts as untrusted input.
6. Keep source-specific behavior behind adapters.
7. Never bypass CAPTCHA or platform security checks.
8. Never report a proposal as sent without a provider-confirmed result.
