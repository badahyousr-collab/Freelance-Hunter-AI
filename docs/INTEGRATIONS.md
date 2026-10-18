# Marketplace integrations

Sources and account integrations are separate:
- A source is a discovery target. Public Telegram channels and Freelancehunt project listings are supported.
- An integration is a per-user credential used to access a provider API.

## Freelancehunt official API

1. In your Freelancehunt account, create an API token in the Apps and API settings.
2. In the site, open **Подключения**, paste the API token into the Freelancehunt field, and choose **Проверить и подключить**.
3. The Worker validates the token against `GET https://api.freelancehunt.com/v2/my/profile`. Invalid tokens are not saved.
4. Before saving, the token is encrypted with AES-GCM. Set `INTEGRATION_ENCRYPTION_KEY` as a Cloudflare Worker secret. It must contain at least 32 characters. Generate a strong value with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Keep it outside Git and rotate it only with a deliberate credential re-encryption plan.
5. Connecting the account adds Freelancehunt to the scan automatically. When the AI agent is enabled, it reads open projects from the official `GET /v2/projects` endpoint and deduplicates them by provider project ID. Listings without a publication date or older than 72 hours are ignored.
6. Automatic proposal preparation and automatic sending have separate controls on the **AI-агент** page. When both are enabled, the Worker may submit matched Freelancehunt bids through `POST /v2/projects/{id}/bids`, subject to the daily limit. A bid is marked sent only after the provider returns a bid ID. Telegram listings and other providers are not submitted as bids.
7. If the provider times out or returns a server error, the state becomes `submission_unknown`. Check the provider site manually before taking further action; the system deliberately blocks automatic retry to avoid duplicate bids. A definite 4xx rejection is marked `failed` and can be reviewed and edited before another submission.
8. On the **Подключения** page, use **Синхронизировать отклики** to check sent bids against the official `/my/bids` endpoint. A bid is marked `replied` only when the API reports `rejected` or `is_winner: true`. If Telegram is linked and `notify_application_updates` is enabled, a confirmed response also triggers a bot notification. Users can disable this on the AI-agent page. Message-thread conversations are not synchronized; check the Freelancehunt inbox for messages.

Freelancehunt API docs: https://apidocs.freelancehunt.com/

## Other marketplaces

- **Upwork:** the public API requires developer credentials and provider approval; access is not assumed. See https://www.upwork.com/developer/documentation/graphql/api/docs/index.html and the official access requirements.
- **Kwork / FL.ru / Fiverr / Freelancer:** no provider adapter is enabled in this project yet. Do not enter account passwords, browser cookies, or personal Telegram session strings. These providers stay marked as pending until an official and permitted integration can be implemented and tested.

## Credential handling

The API never returns stored credentials. Only the Freelancehunt API token is accepted by the current official-token adapter. Credentials for unsupported providers are rejected and not persisted. Losing `INTEGRATION_ENCRYPTION_KEY` makes the saved token unrecoverable; users must reconnect after key loss. Message-thread reply synchronization is not implemented yet. Bid outcome synchronization and optional Telegram notifications need a live test with a real token and deployed migrations.
