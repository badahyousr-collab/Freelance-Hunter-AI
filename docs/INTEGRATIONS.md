# Marketplace integrations

The website keeps source subscriptions separate from account integrations.

- Sources are discovery targets, such as public Telegram channels or marketplace listings.
- Integrations are per-user API credentials for a provider.

Integration secrets are encrypted with Fernet before persistence. Configure INTEGRATION_ENCRYPTION_KEY using a fresh key from python backend/scripts/generate_integration_key.py. Keep it in a secret manager or the private server environment, never in Git. Losing the key makes existing encrypted credentials unrecoverable.

The API never returns saved credentials after submission. Current marketplace credential records are marked credential_saved_unverified; this is intentionally not the same as connected. Provider-specific authorization, discovery, application submission, and reply synchronization adapters still need implementation and tests. Only enter a provider API token that you intentionally created for this purpose. Never submit account passwords, browser cookies, or Telegram session strings through the Integrations page.
