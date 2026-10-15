# Acceptance checklist

## Repository and configuration
- [x] Project layout matches the current modular architecture.
- [x] Secrets are ignored by Git and a sample environment file is provided.
- [x] Setup instructions and current limitations are documented.

## Backend and identity
- [x] Health endpoints return expected status.
- [x] Invalid input is rejected by Pydantic/FastAPI validation.
- [x] Passwords are securely hashed.
- [x] Email verification tokens expire; Telegram link codes are expiring and single-use.
- [x] Protected endpoints reject unauthenticated requests.
- [x] User-owned source/integration/application data are queried with owner checks.
- [x] Integration secrets are encrypted before persistence and never returned by the API.
- [x] Password reset request/confirm flows use expiring, single-use tokens and invalidate active sessions.
- [x] Resend-based verification/reset email integration and D1 rate limits are implemented.
- [ ] Configure the verified sender, API key, and website URL; test email delivery in production.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate Telegram posts are deduplicated per user and channel.
- [x] Scan failures and last-scan metadata are persisted; scheduled scans retry on the next Cron interval.
- [x] Excluded-keyword filtering and basic detected-budget filtering are implemented in the Cloudflare scanner.
- [x] Authenticated manual scan runs against the current user’s enabled public Telegram sources.
- [ ] Verify a real public channel scan and scheduled Cron execution against the deployed Worker.
- [ ] Marketplace adapters are implemented and verified; catalog entries currently marked pending are not live integrations.

## AI and proposals
- [x] Draft endpoint requires authentication and verifies project ownership.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [ ] A real model provider is configured and proposal quality is evaluated.
- [ ] No provider submission is marked sent without source confirmation.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram linking is expiring, single-use, and verified server-side.
- [x] Bot setup and server-to-server endpoints require a shared secret.
- [x] Cloudflare webhook bot and website use the same D1 source of truth.
- [ ] Configure a newly issued BotFather token and webhook secret, then test real Telegram messages.
- [ ] Browser end-to-end flows are tested.

## Verification record
- CI workflow: latest verified run is recorded in GitHub Actions; it checks backend tests/migrations, frontend lint/build, and Cloudflare Worker typecheck.
- Live service verification: pending Cloudflare deployment/secrets, verified email sender, AI provider, and Telegram webhook setup.
- Known limitations: provider-specific marketplace discovery/authentication/submission/reply adapters, push notifications, and automatic client-reply sync are not implemented. Telegram ingestion supports public channel previews only.
