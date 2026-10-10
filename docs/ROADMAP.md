# Implementation roadmap

## Phase 1 — Specification and foundation
- [x] Record product goals, system boundaries, architecture, and acceptance criteria.
- [x] Establish repository conventions and environment template.
- [ ] Confirm repository scaffold and baseline tests.

## Phase 2 — Backend, persistence, and identity
- [ ] FastAPI application configuration and health endpoints.
- [ ] PostgreSQL models and migrations.
- [ ] Email registration, verification, login, logout, password reset.
- [ ] Secure sessions/tokens, password hashing, and per-user authorization.
- [ ] Tests for auth, validation, and cross-user data isolation.

## Phase 3 — Web control panel
- [ ] Premium dark dashboard responsive to desktop and mobile.
- [ ] Projects, applications, sources, agent settings, analytics, profile/security.
- [ ] Typed API client and explicit loading/error/empty states.
- [ ] Accessible controls and UI tests.

## Phase 4 — Source ingestion
- [ ] Stable source-adapter contract and normalized project model.
- [ ] Telegram public-channel ingestion adapter.
- [ ] Marketplace adapters selected after source-specific feasibility checks.
- [ ] Scheduling, retry/backoff, rate controls, observability, and deduplication.
- [ ] Tests with fixtures and adapter contract tests.

## Phase 5 — Matching and proposal drafting
- [ ] Deterministic hard filters for budget, language, freshness, skills, and payment.
- [ ] AI ranking with explanation and uncertainty.
- [ ] Russian/English proposal drafts grounded in the user's portfolio.
- [ ] Prompt-injection isolation for untrusted listing content.
- [ ] Tests for false positives, malformed listings, and hallucinated credentials.

## Phase 6 — Integrations and application tracking
- [ ] Per-source connection status and encrypted credential/token storage.
- [ ] Source-specific capability declarations.
- [ ] Proposal state machine: draft, approved, submitting, sent, failed, replied, closed.
- [ ] Never claim success without source confirmation; make retries idempotent where possible.
- [ ] No CAPTCHA or access-control bypass.

## Phase 7 — Telegram companion
- [ ] Secure one-time website-to-Telegram account linking.
- [ ] Summary stats, new-project notifications, pause/resume, recent projects.
- [ ] Shared source of truth with the web dashboard.
- [ ] Bot command and authorization tests.

## Phase 8 — Quality and deployment
- [ ] Unit, integration, API, and UI tests.
- [ ] Static analysis, formatting, dependency checks, and secret scan.
- [ ] Docker Compose local environment and production deployment guide.
- [ ] Backups, structured logs, health checks, and operational documentation.

## Phase 9 — Portfolio
- [ ] Screenshots and a short demo flow.
- [ ] Architecture diagram and API docs.
- [ ] Accurate case study with only verified features and measurements.

## Working rules
1. Work in small, reviewable increments.
2. After each phase, compare every requirement with implementation and tests.
3. Never mark an item complete solely because code was written; verify it.
4. Keep secrets out of Git and logs.
5. Treat listing descriptions and Telegram posts as untrusted input.
6. Keep source-specific behavior behind adapters so integrations can be added independently.
