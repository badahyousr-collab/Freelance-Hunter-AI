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
- [ ] Password reset and production verification delivery are implemented.\n- [x] D1-backed rate limits are implemented for registration, email verification, and login; deployment/runtime verification is pending.
- [ ] Production SMTP delivery is configured and verified.

## Source ingestion
- [x] Telegram posts normalize to the common project model.
- [x] Duplicate listings are updated rather than inserted repeatedly.
- [x] Source timeouts/errors are retried and last error/scan metadata are persisted.
- [x] Hard filters reject excluded keywords and incompatible or unknown required payment/budget values.
- [x] An authenticated manual scan endpoint queues user-scoped work and reports missing prerequisites.
- [ ] A live Telegram session is configured and a real channel scan is verified.
- [ ] Marketplace adapters are implemented and verified; catalog entries currently marked pending are not live integrations.

## AI and proposals
- [x] Draft endpoint requires an authenticated user and saved skill profile.
- [x] Proposal prompt treats listing content as untrusted and forbids fabricated experience.
- [x] Provider absence is reported as a configuration error.
- [ ] A real model provider is configured and proposal quality is evaluated.
- [ ] No provider submission is marked sent without source confirmation.

## Web and Telegram
- [x] Dashboard numbers come from persisted API records.
- [x] Loading, empty, and error states are present on core pages.
- [x] Telegram linking is expiring, single-use, and verified server-side.
- [x] Bot internal endpoints require a shared secret.
- [x] Website and bot use the same backend source of truth.
- [ ] Bot token is configured and the polling service is running.
- [ ] Browser end-to-end flows are tested.

## Verification record
- CI workflow: backend tests, Python syntax checks, migration upgrade/downgrade, frontend lint, and production build passed for commit 03f7231.
- Live service verification: pending external configuration.
- Known limitations: provider-specific marketplace discovery/authentication/submission/reply adapters are not implemented yet; the Telegram source requires a configured Telethon session; the AI draft endpoint requires an LLM API.
