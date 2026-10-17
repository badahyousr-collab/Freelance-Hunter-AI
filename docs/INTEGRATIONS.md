# Marketplace integrations

The website keeps source subscriptions separate from account integrations.

- Sources are discovery targets, such as public Telegram channels or marketplace listings.
- Integrations are per-user API credentials for a provider.

## Freelancehunt

The Cloudflare Worker supports the official Freelancehunt API for token verification and open-project discovery.

1. Create an API token from the Apps/API area of your Freelancehunt account. Do not use your account password or browser cookies.
2. Configure the Worker secret `INTEGRATION_ENCRYPTION_KEY` with a fresh high-entropy value. For example, generate one locally with `openssl rand -hex 32`, then run `npx wrangler secret put INTEGRATION_ENCRYPTION_KEY --config cloudflare-api/wrangler.toml` from the repository root and paste the value when prompted.
3. In the website, open **Подключения**, paste the API token in the Freelancehunt row, and choose **Подключить API**.
4. The Worker verifies the token against `GET https://api.freelancehunt.com/v2/my/profile`, encrypts it using AES-GCM before storing it in D1, and creates the corresponding source subscription.
5. Choose **Сканировать проекты** to fetch open projects from the official API. The scanner normalizes listings, applies the user's matching profile, deduplicates by remote project ID, and records scan status.
6. If the token is rejected later, reconnect it. The app does not expose the stored token in API responses.

The encryption key is not stored in D1. Keep it out of Git, issues, logs, and chat. Losing or changing it without re-encrypting saved tokens makes those tokens unrecoverable. The connection and scan behavior is covered by mocked tests; a real account token and live API scan still need to be verified in the target Cloudflare deployment.

## Other providers

Upwork, Kwork, and FL.ru remain listed as future integrations. The app must not accept credentials for them until an official or explicitly permitted adapter is implemented and tested. Do not enter account passwords, browser cookies, or Telegram session strings in the Integrations page.

## Security and status rules

- Integration secrets are encrypted before persistence. The parallel FastAPI backend uses Fernet; the Cloudflare Worker uses AES-GCM for the Freelancehunt token.
- The API never returns saved credentials after submission.
- A credential record is not the same as a connected account. Freelancehunt is marked connected only after its API validates the token.
- Proposal submission and client-reply synchronization must remain unavailable until provider behavior, result confirmation, and retry/idempotency handling are verified. Never report a proposal as sent merely because a request was attempted.

Official documentation: https://apidocs.freelancehunt.com/
