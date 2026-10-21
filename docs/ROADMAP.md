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
- [x] Remove email/password fields from the parallel FastAPI user model and add an Alembic migration.
- [x] Verify the PostgreSQL identity migration through the Docker Compose startup smoke test in CI.
- [x] Verify the deployed D1 schema through the Worker health endpoint; it reports `connected` and `ready`, with no missing required schema detected. No production migration was needed during this acceptance pass. The synthetic local export/restore drill is complete; restoring a production backup remains unverified.
- [ ] Verify session expiry, account isolation, and Telegram sign-in against the deployed environment.

## Phase 3 - Web control panel
- [x] Dark responsive dashboard and navigation.
- [x] Projects, applications, sources, AI agent, analytics, settings, integrations, security, registration, and login pages.
- [x] Dashboard statistics and project lists use persisted API data rather than fabricated counts.
- [x] Profile preferences and source configuration forms call the API.
- [x] Add Playwright smoke tests for Telegram auth, project search, source setup, agent startup scan, and settings save/layout.
- [x] Complete CI browser end-to-end tests for dashboard, session expiry, logout, source setup, settings, agent controls, and proposal review.
- [x] Add Playwright mobile-width overflow checks for integrations, agent settings, applications, and sources.
- [x] Add regression checks for expired sessions and Telegram-linked data isolation.
- [ ] Verify empty states and every visible control in the deployed app.
- [x] Verify key deployed website/API flows against the latest API Worker: authenticated project search, AI draft generation, and applications history were exercised in production on 21 Oct 2026; API health is HTTP 200 with D1 connected and schema ready. This does not close the full control audit.

## Phase 4 - Source ingestion
- [x] Normalized source adapter contract.
- [x] Telegram post parser, public channel adapter, scheduled worker, retry behavior, deduplication, and per-source scan health.
- [x] Reject listings without a publication date or older than 72 hours at ingestion and when they are shown on the site or in Telegram summaries.
- [x] Per-user source subscriptions and enabled-agent filtering.
- [x] Authenticated user-scoped manual scan endpoint.
- [x] Build a curated catalog of ten public Telegram job channels, with URLs, languages, and focus areas.
- [x] Verify scheduled production scans against the 10 configured public Telegram channels and three marketplace sources. To stay within Worker CPU limits, Cron rotates up to three sources every 15 minutes; a 13-source pass takes about 75 minutes. The manual scan-on-enable path uses the same bounded batches. A complete production rotation on 21 Oct 2026 completed all five batches, including 8 new Freelancehunt, 8 FL.ru, and 1 Freelance.ru listings, with zero source errors. Read-only D1 verification wrote zero rows.
- [x] Implement the Freelancehunt official API discovery adapter with token validation, encrypted storage, project normalization, and deduplication.
- [ ] Implement and verify additional provider-specific marketplace discovery adapters where access is permitted.
- [x] Add structured logs for per-source scan outcomes, durations, new-project counts, and scheduled scan failures.
- [x] Add a free hourly GitHub Actions health monitor that opens/resolves one issue when the deployed Worker, D1 connection, or schema is unhealthy.
- [x] Add optional Telegram alert delivery for individual source failures, scheduled scan errors, and new-project notification failures.

## Phase 5 - Matching and proposal drafting
- [x] Deterministic hard filters for unsupported languages, minimum budget when currencies match, excluded keywords, and explicit unpaid-work signals; currency mismatches are not compared without an exchange rate.
- [x] Explainable baseline score and reasons.
- [x] OpenAI-compatible proposal drafting endpoint with profile-grounded, prompt-injection-aware instructions.
- [x] Save an optional public portfolio URL in the profile and pass the exact link to AI drafting; reject any other URL and prohibit inferred portfolio claims.
- [x] Mocked provider-contract tests for Russian and English drafts, payload facts, safety instructions, missing configuration, and upstream failures.
- [x] Configure and verify the production AI provider. A real provider response created a saved draft; acceptance then found unsupported past-experience claims, fixed and deployed server-side grounding checks, and regenerated the affected draft on 21 Oct 2026. The replacement remains an unsent clarification question.
- [x] Improve multilingual budget and currency parsing with regression tests for RU/EN currency formats, thousands separators, and `k`/`тыс.` multipliers.
- [x] Add a labeled RU/EN matching evaluation set covering relevant and unrelated listings, budget thresholds, excluded keywords, unpaid work, language filters, risk signals, and complexity scoring.
- [x] Smoke-test Russian and English generation against real production listings and confirm the resulting drafts remain profile-grounded. On 21 Oct, an invalid legacy English draft was regenerated to a safe clarification question; a Russian FL.ru draft was also regenerated. Both remain unsent. This is focused coverage, not an exhaustive quality assessment.

## Phase 6 - Marketplace integrations and application tracking
- [x] Per-user integration records with encrypted-credential design and API responses that do not expose secrets.
- [x] Validate and encrypt Freelancehunt API tokens through the official profile endpoint; show connection status without exposing credentials.
- [ ] Implement and verify official OAuth/API authorization for additional providers where permitted.
- [x] Implement optional automatic provider-confirmed bid submission through the Freelancehunt official API, with a daily cap, concurrency guard, and no automatic retry after ambiguous provider failures.
- [x] Add editable proposal drafts and an awaiting-confirmation/closed review workflow that cannot falsely mark a proposal as sent.
- [x] Prevent duplicate Freelancehunt submissions with a status claim and require a provider bid ID before marking an application sent.
- [x] Synchronize Freelancehunt bid status when the provider confirms rejection or winner selection.
- [x] Implement automatic message-thread replies for matched existing Freelancehunt bids; tests cover exact thread matching, language/formality, unsupported claims, no-signoff, daily cap, and no retry after uncertain send outcomes.
- [ ] Verify live employer-message reply delivery. No eligible provider-confirmed bid/thread currently exists; no message was sent during acceptance.
- [x] Show draft, awaiting confirmation, submitting, sent, failed, and submission-unknown states for Freelancehunt; other providers remain unavailable until verified adapters exist.

## Phase 7 - Telegram companion
- [x] One-time expiring website-to-Telegram account linking.
- [x] Statistics, project listing, pause/resume, and help commands.
- [x] Cloudflare Worker webhook mode and server-side secret checks.
- [x] Configure production Telegram bot/webhook prerequisites; the authenticated readiness endpoint reports the bot, provider, Worker, Cron, and D1 schema configured.
- [ ] Verify real Telegram bot commands and message delivery. The user explicitly deferred this until completing Telegram Web QR sign-in.
- [x] Provide a compact Telegram project summary and count statistics without sending a separate message for every new listing.
- [x] Send optional Telegram notifications when the Freelancehunt status sync confirms a rejection or winner selection; user can disable these in agent settings.
- [ ] Verify that site and bot show the same persisted state.

## Phase 8 - Quality and deployment
- [x] Backend unit/API tests.
- [x] Alembic migration upgrade and downgrade check in CI.
- [x] Frontend lint and production build in CI.
- [x] Python syntax checks for bot and local setup scripts.
- [x] Validate Docker Compose configuration, build the API/bot images, start PostgreSQL/Redis/FastAPI, and pass `/health` in CI.
- [x] Run the deployed smoke checklist: production app routes rendered with the existing authenticated session; latest API Worker `/health` returned HTTP 200 with D1 connected and schema ready. No live application submission was attempted.
- [x] Apply rate limits to Telegram auth, AI draft generation, and manual scans; persist source failure status.
- [x] Add scheduled CodeQL analysis and weekly Dependabot checks for Python, Node, and GitHub Actions dependencies.
- [x] Expand Worker health diagnostics to detect missing Telegram-only identity, notification, and provider-submission migrations.
- [x] Add user-scope regression tests for core dashboard reads and proposal mutations.
- [x] Document free-plan-compatible D1 export, migration, and separate-test-database restore procedures.
- [x] Execute and verify a synthetic D1 export/restore drill against separate local non-production databases (Wrangler local D1; 14 migrations and a probe record restored). A remote test-database restore from a production export remains unverified.
- [x] Add optional Telegram operations alerts for scheduled scan and new-project notification failures, with a readiness indicator.
- [ ] Configure the private alert chat and verify real alert delivery in the deployed Worker.
- [x] Add owner-bound SQL tests for user-scoped reads/mutations and Telegram-linked bot summary, project, and agent-control actions.
- [ ] Complete authorization/data-isolation coverage for every user-scoped endpoint and verify it with two deployed accounts.

## Phase 9 - Portfolio
- [x] README, architecture, roadmap, acceptance checklist, setup guides, operations runbook, and code-verified case study.
- [ ] Capture real screenshots and a demo recording after the app is configured.
- [x] Publish a code-verified case study with explicit deployment limitations.
- [x] Record focused post-deploy performance/runtime checks: production API health and scheduled-source scans, plus the login molecule headless-browser sample (42.2 FPS, 83 ms max frame gap, zero long tasks). These environment-specific measurements are not a production SLO or physical-device guarantee.

## Working rules

1. Work in small, reviewable increments.
2. Finish and verify the current phase before marking it complete.
3. Do not mark a feature complete solely because code was written.
4. Keep secrets out of Git and logs.
5. Treat listing descriptions and Telegram posts as untrusted input.
6. Keep source-specific behavior behind adapters.
7. Never bypass CAPTCHA or platform security checks.
8. Never report a proposal as sent without a provider-confirmed result.
