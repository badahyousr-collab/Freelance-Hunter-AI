# Marketplace integrations

Sources and account integrations are separate:
- A source is a discovery target. Public Telegram channels, FL.ru RSS projects, Freelance.ru public tasks, and Freelancehunt projects are supported.
- An integration is a per-user credential used to access a provider API.

## Freelancehunt official API

1. In your Freelancehunt account, create an API token in the Apps and API settings.
2. In the site, open **Подключения**, paste the API token into the Freelancehunt field, and choose **Проверить и подключить**.
3. The Worker validates the token against `GET https://api.freelancehunt.com/v2/my/profile`. Invalid tokens are not saved.
4. Before saving, the token is encrypted with AES-GCM. Set `INTEGRATION_ENCRYPTION_KEY` as a Cloudflare Worker secret. It must contain at least 32 characters. Generate a strong value with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Keep it outside Git and rotate it only with a deliberate credential re-encryption plan.
5. Connecting the account adds Freelancehunt to the scan automatically. When the AI agent is enabled, it reads open projects from the official `GET /v2/projects` endpoint and deduplicates them by provider project ID. Listings without a publication date or older than 72 hours are ignored.
6. Automatic proposal preparation and automatic sending have separate controls on the **AI-агент** page. When both are enabled, the Worker may submit matched Freelancehunt bids through `POST /v2/projects/{id}/bids`, subject to the daily limit. A bid is marked sent only after the provider returns a bid ID. Telegram listings and other providers are not submitted as bids.
7. If the provider times out or returns a server error, the state becomes `submission_unknown`. Check the provider site manually before taking further action; the system deliberately blocks automatic retry to avoid duplicate bids. A definite 4xx rejection is marked `failed` and can be reviewed and edited before another submission.
8. On the **Подключения** page, use **Синхронизировать отклики** to check sent bids against the official `/my/bids` endpoint. A bid is marked `replied` only when the API reports `rejected` or `is_winner: true`. If Telegram is linked and `notify_application_updates` is enabled, a confirmed response also triggers a bot notification. Users can disable this on the AI-agent page.
9. The **Отвечать на новые сообщения Freelancehunt** setting can send an AI response to a newly received employer message in an existing thread tied to a provider-confirmed sent bid. The worker matches the API thread subject to exactly one submitted project, ignores old threads on first sight, processes only the latest incoming message, and shares the configured daily send limit with bids. Ambiguous project matches, missing sender identity, invalid AI text, and provider errors stop the send. Uncertain provider outcomes are not retried automatically. Telegram channel posts, FL.ru, and Freelance.ru do not support outbound replies through this product.

Freelancehunt API docs: https://apidocs.freelancehunt.com/

## FL.ru public RSS

1. Open **Источники** and choose **Подключить** next to FL.ru. No account password, cookie, or API token is needed.
2. The Worker reads FL.ru's official public https://www.fl.ru/rss/all.xml feed, which FL.ru offers from its projects page through “Подписаться через RSS”.
3. Listings without a valid publication date or older than 72 hours are skipped. Results are matched against the user's profile and can receive AI draft proposals.
4. FL.ru proposal submission is manual. Open the listing on FL.ru and send the reviewed draft there; the app does not submit it.

## Freelance.ru public tasks

1. Open **Источники** and choose **Подключить** next to Freelance.ru. Only tasks publicly marked “Видно всем” are scanned.
2. The Worker reads the public open-tasks page without account cookies and does not request private tasks or individual authenticated pages. It stops if a browser verification challenge appears.
3. Listings without a readable publication time or older than 72 hours are skipped. Results are matched against the user's profile and can receive AI draft proposals.
4. The Freelance.ru FAQ prohibits automated message mailing when replying to tasks. The app therefore never sends Freelance.ru proposals; review the generated draft and submit it manually on the marketplace.

The public discovery adapters run on the existing 15-minute schedule when the AI agent is enabled. Their source status and recent scan errors appear on **Источники**. Both sources are discovery and draft only; only Freelancehunt has a verified proposal-submission API in this project.

## Profile and portfolio link

In **Настройки**, add your actual skills and, optionally, a public HTTPS link to your portfolio. The link is saved with your profile and supplied to AI proposal drafting. AI may include that exact link when relevant; it must not claim what the link contains or invent projects, clients, results, or skills. ByteCraft does not fetch or verify portfolio pages. Keep private or client-confidential work off public links.

## Platforms that are not enabled

- **Upwork:** a public API exists, but key requests are reviewed, and commercial API access is limited to selected partners with prior written permission. This project does not have that approval or credentials. See https://www.upwork.com/developer/documentation/graphql/api/docs/index.html and https://support.upwork.com/hc/en-us/sections/17976982721555-Upwork-API.
- **Freelancer.com:** despite an official API, the User Agreement prohibits automated website/API access without express written permission and prohibits aggregating its listings with other websites' listings without that permission. It cannot be used as a source in this multi-marketplace dashboard without written permission. See https://www.freelancer.com/about/terms and https://www.freelancer.com/about/apiterms.
- **Kwork:** its terms prohibit bots/robots and automated extraction or collection of marketplace data. See https://kwork.ru/terms_of_service.
- **Fiverr:** its Terms of Service prohibit robots, scraping, or systematic collection of marketplace content and data. See https://www.fiverr.com/legal-portal/legal-terms/terms-of-service.
- **Workana:** its Terms prohibit automated access and scripts for scraping or data mining.
- **Workzilla:** clause 3.5 of its user agreement prohibits third-party software directly or indirectly related to the site's services. Do not automate access or collection without written permission and an approved method. See https://work-zilla.com/users-agreement. See https://www.workana.com/en/pages/view/terms.
- **PeoplePerHour / Guru.com:** no official, permitted public API for searching freelance jobs was verified. Guru's published developer API is for Guru's knowledge product, not Guru.com project listings. These stay unavailable until an official method and its terms are confirmed.
- **Weblancer:** old first-party forum posts mention project and vacancy RSS URLs, but both returned HTTP 403 during a direct check on 21 Oct 2026. The forum posts are historical and do not establish that these feeds are currently available or authorize third-party aggregation. Do not retry through proxies or bypass access controls; keep Weblancer unavailable unless the platform confirms a current permitted feed/API. See the [Weblancer agreement](https://www.weblancer.net/terms/agreement/) and historical [project RSS discussion](https://www.weblancer.net/forum/obshenie-7/gde-rss-na-sajte-7783/).
- **FreelanceJob.ru:** a public RSS URL is indexed, but it timed out during the 21 Oct 2026 check and the indexed entries were stale. Clause 6.6 of its [user agreement](https://www.freelancejob.ru/agreement.php) prohibits reproducing/copying parts of the portal or its services unless the administration grants permission. Do not aggregate this feed without explicit permission and a successful current-access test.

Never use account passwords, session cookies, private APIs, anti-bot workarounds, or CAPTCHA bypasses for these sources. A platform stays unavailable until an official permitted access path is confirmed and tested.

## Credential handling

The API never returns stored credentials. Only the Freelancehunt API token is accepted by the current official-token adapter. Credentials for unsupported providers are rejected and not persisted. Losing `INTEGRATION_ENCRYPTION_KEY` makes the saved token unrecoverable; users must reconnect after key loss. Bid outcome synchronization, automatic thread replies, and optional Telegram notifications still require live acceptance with a real token and suitable real messages; do not send test messages to employers.
