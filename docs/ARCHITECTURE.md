# Architecture

## Components

- **Web**: Next.js + TypeScript; authenticated user control panel.
- **API**: FastAPI; identity, profiles, projects, applications, integrations, and dashboard data.
- **Bot**: aiogram; concise notifications and remote controls, using the same API/domain data.
- **Database**: PostgreSQL as the source of truth.
- **Queue**: Redis-backed workers for scheduled ingestion and AI processing.
- **Sources**: independent adapters normalize marketplace listings and public Telegram-channel posts.

## Core data boundaries

Every user-owned record must have an owner/user identifier and every API read/write must enforce it server-side. Telegram account linking uses short-lived, single-use codes. Integration credentials must be encrypted at rest, redacted from logs, and revocable.

## Source adapter contract

A source adapter should declare its capabilities and return normalized records. It must distinguish:
- discovery/read capability;
- authenticated account connection capability;
- proposal submission capability;
- reply/status synchronization capability.

Unsupported operations must be surfaced as unsupported, not simulated.

## Project lifecycle

1. Discovered
2. Normalized
3. Deduplicated
4. Filtered and scored
5. Proposal drafted
6. Awaiting approval or eligible for a configured submission policy
7. Submitting
8. Sent only after explicit source confirmation, otherwise failed/unknown
9. Replied/closed when a reliable status update is available

## AI safety and data quality

Listing text is untrusted data, not instructions. AI may extract facts and draft a response but cannot override system filters, access other users' records, or invent portfolio experience. Record the reason for ranking and distinguish known values from estimates.

## Operational principles

- Idempotency keys for ingestion and submission jobs where possible.
- Retry transient failures with bounded exponential backoff.
- Per-source rate limits and structured error states.
- Health/readiness endpoints and structured logs.
- Secrets supplied through environment/secret management, never committed.
