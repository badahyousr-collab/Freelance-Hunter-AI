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
- [ ] Apply the D1 migration to the deployed Cloudflare database and verify existing Telegram accounts still sign in.
- [x] Remove email/password fields from the FastAPI user model and add an Alembic migration.
- [x] Verify the PostgreSQL identity migration and FastAPI startup through the Docker Compose smoke test in CI.
- [ ] Apply and verify the D1 identity migration against the deployed Cloudflare database. The Worker health endpoint reports missing Telegram-only identity, notification, and provider-submission migrations.
- [ ] Verify Telegram sign-in, session expiry, logout, and cross-account data isolation against the deployed environment.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate Telegram posts are deduplicated per user and channel.
- [x] Scan failures and last-scan metadata are persisted; scheduled scans retry on the next Cron interval.
- [x] Excluded-keyword filtering and basic detected-budget filtering are implemented in the Cloudflare scanner.
- [x] Authenticated manual scan runs against the current user's enabled public Telegram sources.
- [x] Curated public Telegram job-channel catalog is populated with public URLs and category/language labels.
- [ ] Verify a real public channel scan and scheduled Cron execution against the deployed Worker.
- [x] Freelancehunt official API token validation, project ingestion, and explicit bid submission have mocked regression tests. Live account verification remains pending. Other marketplace adapters remain pending.

## AI and proposals
- [x] Draft endpoint requires authentication and verifies project ownership.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [x] Mocked provider-contract tests cover Russian and English drafts, profile/listing payloads, safety instructions, and provider failures.
- [ ] A real model provider is configured and proposal quality is evaluated against real anonymized listings in Russian and English.
- [x] Labeled RU/EN test set covers matching quality, budget thresholds, language, excluded keywords, unpaid work, risk, and complexity; deterministic hard filters cannot be overridden by AI.
- [x] No user-facing endpoint can mark a proposal as sent/replied directly. Freelancehunt is marked sent only after a successful official API response with a bid ID; ambiguous failures are blocked from automatic retry.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram account linking is expiring, single-use, and verified server-side.
- [x] Bot setup and server-to-server endpoints require a shared secret.
- [ ] Configure a newly issued BotFather token and webhook secret, apply migrations, then test real Telegram messages and new-project notifications.
- [x] CI Playwright smoke tests cover Telegram auth, project search, source setup/manual scan, and settings save/layout.
- [x] CI browser end-to-end tests cover dashboard, logout, and session expiry.
- [ ] Full browser end-to-end flows are tested on the deployed site.
- [ ] Every visible button and form has a verified action or is explicitly marked unavailable. Freelancehunt proposals can be edited, prepared for confirmation, and submitted after explicit confirmation; other marketplace providers remain unavailable. Critical user-scoped Worker reads and proposal mutation isolation have regression tests.

## Operations and recovery
- [x] Structured scan logs include duration, scanned sources, new-project counts, and failure counts.
- [x] Optional Telegram operations alerts are implemented and covered by a mocked scheduled-scan failure test.
- [ ] Configure `WORKER_ALERT_CHAT_ID` and verify delivery against the deployed bot.
- [x] Run the local PostgreSQL-backed Docker Compose startup and `/health` smoke test in CI.
- [ ] Run a D1 backup/restore drill against a separate non-production database.
- [ ] Complete the deployed smoke-test checklist and full user-scoped authorization coverage.

## Verification record
- CI verifies backend tests/migrations, frontend lint/build, Playwright smoke tests, and Cloudflare Worker typecheck/tests. CodeQL and weekly Dependabot checks are configured.
- [x] Document D1 export, migration, and test-database restore commands in [Operations and recovery](OPERATIONS.md). The backup/restore drill itself remains unverified.
- Live service verification is pending until Telegram secrets, AI provider configuration, and public channel scans are tested.
- Known limitations: Freelancehunt API discovery/submission is implemented but needs a real user token test and the Worker encryption secret; other marketplace adapters and client-reply synchronization are not implemented. New-project notifications need the D1 migration, bot secrets, and a live Telegram test. Telegram ingestion currently reads public channel previews only.
