# Case study: Pipisso Freelance Hunter

## Summary

Freelance Hunter is a module in the Pipisso ecosystem. It collects public freelance opportunities, ranks them against a user profile, and prepares proposal drafts through a web workspace and Telegram companion.

## Problem

Freelance requests are scattered across channels and platforms. Manually reviewing each post, checking whether it fits a developer's skills and minimum budget, and drafting a response takes time. A collector also needs to distinguish a draft from a proposal that was actually submitted.

## Implemented in the repository

- Telegram-only sign-in with a short-lived one-time code and HTTP-only session cookie.
- User-scoped workspace data for projects, source subscriptions, profiles, agent settings, integrations, and applications.
- Public Telegram preview ingestion with normalized listing records, duplicate prevention, source health fields, and a scheduled scan trigger.
- A curated list of ten public Telegram channels for developer work, no-code, IT freelance, and broader freelance listings. The production scan verified @FreelancehuntProjects; each other channel still needs its own scan evidence.
- Explainable matching scores with language, budget, excluded-keyword, unpaid-work, risk, and complexity signals.
- RU/EN proposal drafting through an OpenAI-compatible endpoint. Prompts treat listing text as untrusted and instruct the model not to invent experience or credentials.
- Editable proposal drafts and an awaiting-confirmation workflow. The application is never marked as sent without a verified provider result.
- Telegram account linking, statistics, recent project summaries, and pause/resume commands. Project counts and links are available through bot commands; separate messages for each new listing are disabled.
- Automated CI for backend tests and migrations, frontend lint/build and Playwright smoke tests, Cloudflare Worker typecheck/tests, plus CodeQL and Dependabot configuration.

## Architecture

- **Web:** Next.js, TypeScript, React.
- **API and ingestion:** Cloudflare Worker, TypeScript, D1, scheduled Cron Trigger.
- **Telegram companion:** Python/aiogram codebase and Worker webhook integration.
- **Local/backend track:** FastAPI, SQLAlchemy/Alembic, PostgreSQL for local and separately hosted deployments.

## Production verification snapshot (20 October 2026)

- The API Worker is healthy (status ok, D1 connected, schema ready). Cloudflare shows version ce8b2a98, built from merge commit de98e0f, Ready at 100% production traffic.
- The production dashboard reported 453 discovered projects, 12 profile matches, 3 marketplace discovery sources (1 API-connected and 2 public-search), 10 Telegram channels, 1 linked bot, 0 provider-confirmed bids, and 0 tracked replies.
- Scheduled scans completed at 04:30:27 UTC for @FreelancehuntProjects, 04:30:36 UTC for FL.ru, and 04:30:39 UTC for Freelance.ru. Two existing public Telegram listings that include 2500 UAH display as 2 500 UAH in the project list. These listings remain in the Найден state; no bid or employer message was sent during acceptance.
- The configured AI provider accepted a real generation request for a Russian skills-aligned listing. It produced a saved draft; no proposal was submitted.
- The PR for UAH parsing/backfill passed CI #668 (backend, Worker tests and migrations, frontend lint/Playwright/build, Compose smoke) and CodeQL #247 before merge.

## Constraints and remaining acceptance work

- Telegram-only sign-in is the accepted identity flow. Email/password registration and recovery were explicitly removed from product scope.
- Production Telegram-Web is not authenticated on the acceptance PC, so a real /stats command and notification delivery have not been verified. No OTP or QR login was attempted.
- Live two-account data isolation and session-expiry behavior have not been exercised with two real production accounts. Automated tests cover owner-scoped endpoints and expired-session rejection.
- English proposal quality has not been demonstrated on a safe, clearly English skills-aligned listing. Russian generation was verified as described above.
- Automated bid submission is available only through Freelancehunt's verified API; FL.ru and Freelance.ru are discovery-only and require manual submission. A real employer-facing bid was not sent as an acceptance test.
- Cloudflare D1 Time Travel is available for the production database with a seven-day restore window. A production restore has not been attempted because it overwrites live data; the synthetic local D1 export/import drill passed.
- User-specific project counts are a snapshot, not a throughput or success-rate claim. No production latency, cost, or conversion metrics are claimed.
- Screenshots and a demo recording are not yet captured. This document is a verified engineering snapshot, not a finished visual portfolio case.

## Verification

CI is the source of truth for repository checks. Live deployment verification is separate and must include the smoke-test checklist in [Operations and recovery](OPERATIONS.md). Update this case study only when a feature has been tested and confirmed; do not turn planned integrations into completed achievements.
