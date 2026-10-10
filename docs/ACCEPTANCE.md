# Acceptance checklist

Use this list at the end of every implementation phase. Attach command output or test evidence to the phase notes.

## Repository and configuration
- [ ] Project layout matches the documented architecture.
- [ ] No secrets or personal access tokens are committed.
- [ ] Fresh setup instructions are accurate.

## Backend and identity
- [ ] Health/readiness endpoints return expected status.
- [ ] Input validation rejects malformed data.
- [ ] Passwords are hashed with a suitable password-hashing algorithm.
- [ ] Email verification and password reset use single-use expiring tokens.
- [ ] Protected endpoints reject unauthenticated requests.
- [ ] User A cannot read/update User B's data.
- [ ] Secrets and credentials are never returned by API responses or logs.

## Source ingestion
- [ ] Adapters normalize required fields and handle missing optional fields.
- [ ] Duplicate posts/listings do not create duplicate projects.
- [ ] Stale and malformed source data are handled safely.
- [ ] Rate limits, timeouts, and transient errors are handled.
- [ ] Unsupported capabilities are explicitly represented.

## AI and proposals
- [ ] Hard filters cannot be overridden by model output.
- [ ] Listing text is treated as untrusted content.
- [ ] Drafts use only verified user skills and portfolio facts.
- [ ] Uncertain budgets/payment details are marked unknown.
- [ ] A proposal is not marked sent without source confirmation.

## Web and Telegram
- [ ] Dashboard numbers are computed from persisted records.
- [ ] Empty, loading, and failure states are present.
- [ ] Telegram linking is expiring and single-use.
- [ ] Telegram user identity is verified server-side.
- [ ] Bot and website show consistent status.

## Verification record
- Commit:
- Date:
- Commands:
- Results:
- Known issues:
