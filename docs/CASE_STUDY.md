# Case study: Pipisso Freelance Hunter

## Summary

Freelance Hunter is a module in the Pipisso ecosystem. It collects public freelance opportunities, ranks them against a user profile, and prepares proposal drafts through a web workspace and Telegram companion.

## Problem

Freelance requests are scattered across channels and platforms. Manually reviewing each post, checking whether it fits a developer's skills and minimum budget, and drafting a response takes time. A collector also needs to distinguish a draft from a proposal that was actually submitted.

## Implemented in the repository

- Telegram-only sign-in with a short-lived one-time code and HTTP-only session cookie.
- User-scoped workspace data for projects, source subscriptions, profiles, agent settings, integrations, and applications.
- Public Telegram preview ingestion with normalized listing records, duplicate prevention, source health fields, and a scheduled scan trigger.
- A curated list of eight public Telegram channels for developer work, no-code, IT freelance, and broader freelance listings. A listed channel is not considered verified until a real scan succeeds.
- Explainable matching scores with language, budget, excluded-keyword, unpaid-work, risk, and complexity signals.
- RU/EN proposal drafting through an OpenAI-compatible endpoint. Prompts treat listing text as untrusted and instruct the model not to invent experience or credentials.
- Editable proposal drafts and an awaiting-confirmation workflow. The application is never marked as sent without a verified provider result.
- Telegram account linking, statistics, project listing, pause/resume commands, and opt-out new-project notifications.
- Automated CI for backend tests and migrations, frontend lint/build and Playwright smoke tests, Cloudflare Worker typecheck/tests, plus CodeQL and Dependabot configuration.

## Architecture

- **Web:** Next.js, TypeScript, React.
- **API and ingestion:** Cloudflare Worker, TypeScript, D1, scheduled Cron Trigger.
- **Telegram companion:** Python/aiogram codebase and Worker webhook integration.
- **Local/backend track:** FastAPI, SQLAlchemy/Alembic, PostgreSQL for local and separately hosted deployments.

## Constraints and honest status

- Production D1 migrations and Telegram secrets still require verification in the target Cloudflare account.
- A live public-channel scan has not been confirmed by CI; CI uses mocked network responses.
- Real AI-provider quality testing needs an intentionally configured provider key and representative anonymized listings. A real provider may charge for API usage.
- Freelancehunt has an official API-token connection and open-project discovery adapter covered by mocked tests; live account verification is still pending. Freelancehunt bid submission is implemented behind explicit user confirmation and stores a provider-returned bid ID; ambiguous outcomes block retries. Live submission/recovery is still unverified. Other marketplace discovery and client-reply synchronization are not implemented. The UI marks unsupported capabilities as unavailable instead of pretending they work.
- No real production throughput, latency, success-rate, or cost measurements are claimed here.
- Screenshots and a demo recording must be captured from the configured live app before publishing a final visual portfolio case.

## Verification

CI is the source of truth for repository checks. Live deployment verification is separate and must include the smoke-test checklist in [Operations and recovery](OPERATIONS.md). Update this case study only when a feature has been tested and confirmed; do not turn planned integrations into completed achievements.
