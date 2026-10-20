# Acceptance checklist

## Repository and configuration
- [x] Project layout matches the current modular architecture.
- [x] Secrets are ignored by Git and a sample environment file is provided.
- [x] Setup instructions and current limitations are documented.

## Backend and identity
- [x] Telegram sign-in uses a one-time code with an expiry and single-use session issuance.
- [x] Successful sign-in sets an HTTP-only session cookie.
- [x] Email/password login, email verification, and password-reset API routes return HTTP 410 in the Cloudflare API.
- [x] Website email login and recovery pages are removed.
- [x] Protected endpoints reject unauthenticated requests.
- [x] User-owned source, project, application, and integration data use owner checks.
- [x] Remove email delivery settings/helpers and disable email auth routes in active API code.
- [x] Add a D1 migration that replaces email/password identity fields with Telegram identity keys and anonymizes old email-only identities.
- [x] Remove email/password fields from the FastAPI user model and add an Alembic migration.
- [x] Verify the PostgreSQL identity migration and FastAPI startup through the Docker Compose smoke test in CI.
- [x] Deployed `/health` reports a connected D1 database and ready schema, including required migration `0012_auto_submission.sql`.
- [ ] Verify Telegram sign-in, session expiry, logout, and cross-account data isolation against the deployed environment.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate Telegram posts are deduplicated per user and channel.
- [x] Scan failures and last-scan metadata are persisted; scheduled scans retry on the next Cron interval.
- [x] Telegram and Freelancehunt listings require a known publication time within the previous 72 hours for ingestion and display.
- [x] Excluded-keyword filtering and basic detected-budget filtering are implemented in the Cloudflare scanner.
- [x] Authenticated scans run against the current user's enabled public Telegram sources; agent startup also triggers an initial scan.
- [x] Curated public Telegram job-channel catalog is populated with public URLs and category/language labels.
- [x] Verify a real public Telegram channel scan and scheduled Cron execution against the deployed Worker (20 Oct 2026, 03:00:36 UTC).
- [x] Freelancehunt official API token validation, project ingestion, automatic bid submission controls, provider-confirmed bid status sync, and optional Telegram reply notifications have mocked regression tests. Live account verification remains pending. Other marketplace adapters and message-thread reply sync remain pending.

## AI and proposals
- [x] Draft endpoint requires authentication and verifies project ownership.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [x] Mocked provider-contract tests cover Russian and English drafts, profile/listing payloads, safety instructions, and provider failures.
- [ ] Configure a real model provider and evaluate proposal quality against real anonymized listings in Russian and English.
- [x] Labeled RU/EN test set covers matching quality, budget thresholds, language, excluded keywords, unpaid work, risk, and complexity; deterministic hard filters cannot be overridden by AI.
- [x] No user-facing endpoint can mark a proposal as sent/replied directly. Freelancehunt is marked sent only after a successful official API response with a bid ID; ambiguous failures are blocked from automatic retry. A manual sync endpoint marks a sent bid as replied only when the official API reports it rejected or selected as winner; message-thread replies remain pending.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram account linking is expiring, single-use, and verified server-side.
- [x] Bot setup and server-to-server endpoints require a shared secret.
- [ ] Configure a newly issued BotFather token and webhook secret, apply migrations `0007` through `0012`, then test real Telegram commands and provider-confirmed reply notifications.
- [x] CI Playwright smoke tests cover Telegram auth, project search, Telegram source setup, agent startup scan, and settings save/layout.
- [x] CI browser end-to-end tests cover dashboard, logout, and session expiry.
- [ ] Full browser end-to-end flows are tested on the deployed site.
- [ ] Verify all visible controls in the deployed site. Freelancehunt proposals can be prepared and automatically submitted when the user enables that setting; Telegram public channels can be scanned. Other marketplace providers remain unavailable. Critical user-scoped Worker reads and proposal mutation isolation have regression tests.

## Operations and recovery
- [x] Structured scan logs include duration, scanned sources, new-project counts, and failure counts.
- [x] Optional Telegram operations alerts are implemented and covered by a mocked scheduled-scan failure test.
- [ ] Configure `WORKER_ALERT_CHAT_ID` and verify delivery against the deployed bot.
- [x] Run the local PostgreSQL-backed Docker Compose startup and `/health` smoke test in CI.
- [x] Run a synthetic local D1 export/restore drill into a separately initialized non-production database. Production backup/restore remains unverified.
- [ ] Complete the deployed smoke-test checklist and full user-scoped authorization coverage.

## Mobile and authorization regression coverage
- [x] Playwright checks core workspace pages at a 390px viewport for horizontal overflow.
- [x] Worker tests verify expired-session rejection and owner-scoped website and Telegram-bot data access.
- [ ] Verify session expiry and cross-account isolation with two real deployed accounts.
- [ ] Complete a deployed smoke test of all empty states and visible controls.

## Verification record
- CI verifies backend tests/migrations, frontend lint/build, Playwright smoke tests, and Cloudflare Worker typecheck/tests. CodeQL and weekly Dependabot checks are configured.
- [x] Document D1 export, migration, and test-database restore commands in [Operations and recovery](OPERATIONS.md). The backup/restore drill itself remains unverified.
- Live checks on 20 Oct 2026 confirm API health (D1 connected, schema ready), API Worker version ce8b2a98 at 100% traffic, and an automatic scan completed at 03:00:36 UTC. The production dashboard showed 451 projects, 12 profile matches, 3 marketplace discovery sources (1 API-connected and 2 public-search), 10 Telegram channels, 1 linked bot, 0 provider-confirmed bids, and 0 tracked replies. Two observed Telegram listings displayed 2 500 UAH and remained in the Найден state. Russian AI generation produced a saved draft without sending it. English generation quality, real Telegram bot command/notification delivery, two-account production isolation, production-data restore, and an employer-facing bid E2E remain unverified.
- Known limitations: Freelancehunt API discovery/submission/status sync and optional Telegram reply notifications need further safe live verification. Telegram Web was signed out on the acceptance PC; no OTP login or message was attempted. Email registration, verification, recovery, and sessions in the user's project plan conflict with the repository's intentional Telegram-only sign-in. Message-thread synchronization and other marketplace adapters are not implemented. Telegram ingestion currently reads public channel previews only.
