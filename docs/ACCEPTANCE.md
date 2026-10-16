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
- [ ] Remove or retire the legacy email/password fields in the parallel FastAPI PostgreSQL schema.
- [ ] Verify Telegram sign-in, session expiry, logout, and cross-account data isolation against the deployed environment.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate Telegram posts are deduplicated per user and channel.
- [x] Scan failures and last-scan metadata are persisted; scheduled scans retry on the next Cron interval.
- [x] Excluded-keyword filtering and basic detected-budget filtering are implemented in the Cloudflare scanner.
- [x] Authenticated manual scan runs against the current user's enabled public Telegram sources.
- [ ] Curated public Telegram job-channel catalog is populated with verified URLs and category/language labels.
- [ ] Verify a real public channel scan and scheduled Cron execution against the deployed Worker.
- [ ] Marketplace adapters are implemented and verified; catalog entries marked pending are not live integrations.

## AI and proposals
- [x] Draft endpoint requires authentication and verifies project ownership.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [ ] A real model provider is configured and proposal quality is evaluated in Russian and English.
- [ ] Labeled test set measures matching quality and hard filters cannot be overridden by AI.
- [ ] No provider submission is marked sent without source confirmation.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram account linking is expiring, single-use, and verified server-side.
- [x] Bot setup and server-to-server endpoints require a shared secret.
- [ ] Configure a newly issued BotFather token and webhook secret, then test real Telegram messages.
- [ ] Browser end-to-end flows are tested on the deployed site.
- [ ] Every visible button and form has a verified action or is explicitly marked unavailable.

## Verification record
- CI must verify backend tests/migrations, frontend lint/build, and Cloudflare Worker typecheck.
- Live service verification is pending until Telegram secrets, AI provider configuration, and public channel scans are tested.
- Known limitations: provider-specific marketplace discovery/authentication/submission/reply adapters and push notifications are not yet implemented. Telegram ingestion currently reads public channel previews only.
