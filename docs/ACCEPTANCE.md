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
- [x] Deployed `/health` reports a connected D1 database and ready schema, including required migration `0013_freelancehunt_thread_replies.sql`.
- [ ] Verify Telegram sign-in, session expiry, logout, and cross-account data isolation against the deployed environment.

> Scope decision: email/password registration, email verification, and password recovery were explicitly removed from the product scope. Telegram-only sign-in is the accepted identity flow.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate Telegram posts are deduplicated per user and channel.
- [x] Scan failures and last-scan metadata are persisted; scheduled scans retry on the next Cron interval.
- [x] Telegram and Freelancehunt listings require a known publication time within the previous 72 hours for ingestion and display.
- [x] Excluded-keyword filtering and basic detected-budget filtering are implemented in the Cloudflare scanner.
- [x] Authenticated scans run against the current user's enabled public Telegram sources; agent startup also triggers an initial scan.
- [x] Curated public Telegram job-channel catalog is populated with public URLs and category/language labels.
- [x] Verify real public Telegram, FL.ru, and Freelance.ru source scans and scheduled Cron execution against the deployed Worker (20 Oct 2026); recheck production API health and the 00:15 UTC scheduled run on 21 Oct 2026.
- [x] Review official access paths and terms for additional marketplaces before exposing them as sources. Freelancer.com requires express written permission for automated access and cross-marketplace aggregation; Upwork API credentials are reviewed and restricted; Kwork, Fiverr, Workana, and Workzilla prohibit or restrict automated collection; no permitted public job-search API was verified for PeoplePerHour or Guru.com; Weblancer's historical RSS URLs returned HTTP 403; FreelanceJob.ru's indexed feed timed out and its agreement requires administration permission to copy portal content. Details are recorded in [Marketplace integrations](INTEGRATIONS.md), and restricted sources are not presented as working connections.
- [x] Freelancehunt official API token validation, project ingestion, automatic bid submission controls, provider-confirmed bid status sync, optional Telegram reply notifications, and safe automatic message-thread reply handling have regression coverage. Live account verification remains pending. Other marketplace adapters remain pending.

## AI and proposals
- [x] Draft endpoint requires authentication and verifies project ownership.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [x] Mocked provider-contract tests cover Russian and English drafts, profile/listing payloads, safety instructions, and provider failures.
- [x] Configure a real model provider and verify production proposal generation in Russian and English against skills-aligned listings. This is focused smoke coverage, not an exhaustive quality evaluation.
- [x] Labeled RU/EN test set covers matching quality, budget thresholds, language, excluded keywords, unpaid work, risk, and complexity; deterministic hard filters cannot be overridden by AI.
- [x] No user-facing endpoint can mark a proposal as sent/replied directly. Freelancehunt is marked sent only after a successful official API response with a bid ID; ambiguous failures are blocked from automatic retry. A manual sync endpoint marks a sent bid as replied only when the official API reports it rejected or selected as winner. New employer messages in matched existing threads can receive a separately controlled AI reply; live delivery verification remains pending.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram account linking is expiring, single-use, and verified server-side.
- [x] Bot setup and server-to-server endpoints require a shared secret.
- [ ] Verify real Telegram commands and provider-confirmed reply notifications. The user explicitly chose to leave Telegram `/stats` and notification E2E open; no Telegram Web login or message was attempted. Production health currently reports the D1 schema ready.
- [x] CI Playwright smoke tests cover Telegram auth, project search, Telegram source setup, agent startup scan, and settings save/layout.
- [x] CI browser end-to-end tests cover dashboard, logout, and session expiry.
- [ ] Full browser end-to-end flows are tested on the deployed site.
- [ ] Verify all visible controls in the deployed site. Freelancehunt proposals can be prepared and automatically submitted when the user enables that setting; Telegram public channels can be scanned; FL.ru and Freelance.ru provide public discovery and manual-send drafts. Critical user-scoped Worker reads and proposal mutation isolation have regression tests.

## Operations and recovery
- [x] Structured scan logs include duration, scanned sources, new-project counts, and failure counts.
- [x] Optional Telegram operations alerts are implemented and covered by a mocked scheduled-scan failure test.
- [ ] Verify operational-alert delivery against the deployed bot. Real Telegram command/notification E2E was explicitly left open by the user.
- [x] Run the local PostgreSQL-backed Docker Compose startup and `/health` smoke test in CI.
- [x] Run a synthetic local D1 export/restore drill into a separately initialized non-production database. Cloudflare D1 Time Travel exposes a seven-day production restore window; a production restore has not been attempted because it overwrites live data.
- [ ] Complete the deployed smoke-test checklist and full user-scoped authorization coverage.

## Mobile and authorization regression coverage
- [x] Playwright checks core workspace pages at a 390px viewport for horizontal overflow.
- [x] Worker tests verify expired-session rejection and owner-scoped website and Telegram-bot data access.
- [ ] Verify session expiry and cross-account isolation with two real deployed accounts.
- [ ] Complete a deployed smoke test of all empty states and visible controls.

## Verification record
- CI verifies backend tests/migrations, frontend lint/build, Playwright smoke tests, and Cloudflare Worker typecheck/tests. CodeQL and weekly Dependabot checks are configured.
- [x] Document D1 export, migration, and test-database restore commands in [Operations and recovery](OPERATIONS.md). A synthetic local restore passed. Cloudflare D1 Time Travel exposes a seven-day production restore window; production recovery has not been exercised.
- Production verification on 21 Oct 2026: the API health endpoint returned HTTP 200 with D1 connected and schema ready; the public application route returned HTTP 200. The authenticated dashboard hydrated, and the agent page showed the saved settings after loading. Current scan, source, match, and application counts rendered from production data; the account showed zero provider-confirmed submissions and zero tracked replies. The agent and auto-submit preference were enabled with a daily limit of 50; acceptance did not change settings, start a scan, or submit an application. A focused production English draft was verified on 20 Oct; Russian and English drafts were saved without sending. Real Telegram bot command/notification delivery (explicitly deferred by the user), two-account production isolation, a live employer-facing bid, a production-data restore, a complete deployed control audit, Telegram bot screenshot, and demo recording are unverified. A synthetic authenticated-workspace screenshot was captured locally with mocked data and is explicitly labeled as non-production evidence.
- Production verification after PR #95 on 21 Oct 2026: migration `0013_freelancehunt_thread_replies.sql` is applied; Wrangler reports no pending D1 migrations; API `/health` is HTTP 200 with D1 connected and schema ready; website `/agent` returns HTTP 200 and displays the new reply control. The existing enabled agent account has automatic thread replies on due the migration's opt-in backfill for enabled agents with auto-submit. An aggregate D1 check found zero eligible provider-confirmed Freelancehunt bids and zero tracked threads, so no employer message was sent or delivery test claimed. API Worker version `7fdc437f-f7ac-4647-91a2-01b90b036520`; frontend Worker version `9b180322-f7da-4347-9295-62f543205d8d`. PR #95 passed CI and CodeQL and was squash-merged.
- Known limitations: Freelancehunt is the only marketplace with a configured account API and automatic submission or thread replies. FL.ru and Freelance.ru are public discovery sources with manual sending. Other exchanges are not connected because access requires platform approval or violates published restrictions; see [Marketplace integrations](INTEGRATIONS.md). Telegram ingestion reads public channel previews only. The real Telegram command/notification test was explicitly left open by the user. Telegram-only sign-in is the accepted product scope; email registration and recovery were explicitly removed.
- Production follow-up on 21 Oct 2026 at 00:15 UTC: API health returned `status=ok`, D1 `connected`, and schema `ready`. An aggregate, read-only D1 query showed all 13 enabled source records refreshed in the 00:15 Cron cycle (10 Telegram, one each for FL.ru, Freelance.ru, and Freelancehunt); all four groups had zero recorded errors and the query performed no writes. The synthetic workspace screenshot was merged in PR #97; it is not production account evidence.
