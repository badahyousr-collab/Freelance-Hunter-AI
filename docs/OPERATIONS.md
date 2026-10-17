# Operations and recovery

This guide documents the free-plan-compatible operational steps for the Cloudflare Worker and D1 deployment. These procedures have **not** yet been executed against the live account; run them before marking production recovery as verified.

## Before changing production

1. Confirm you are in the repository root and have authenticated Wrangler with the Cloudflare account that owns `freelance-hunter-db`.
2. Check the current deployment and D1 migration state.
3. Export a database backup before applying destructive migrations or restoring data.
4. Keep the backup outside Git and store it somewhere private. It contains account and project data.

## Configure integration credential encryption

Freelancehunt token storage requires the Worker secret `INTEGRATION_ENCRYPTION_KEY`. Generate a high-entropy value locally, then run:

```bash
npx wrangler secret put INTEGRATION_ENCRYPTION_KEY --config cloudflare-api/wrangler.toml
```

Paste the generated value only into the Wrangler prompt. Never put it in `wrangler.toml`, Git, or a chat. Do not rotate this secret without a migration plan to re-encrypt existing tokens.

## Check migration state

Run from the repository root:

```bash
npx wrangler d1 migrations list freelance-hunter-db --remote --config cloudflare-api/wrangler.toml
```

The Worker health endpoint is:

`https://plain-voice-c13ffreelance-hunter-api.badahyousr.workers.dev/health`

A healthy response must report `status: "ok"`, `database: "connected"`, and `schema: "ready"`. If `missing_migrations` is returned, do not treat the deployment as current.

## Create a manual D1 backup

Create a private backup directory, then export schema and data:

```bash
mkdir -p backups
npx wrangler d1 export freelance-hunter-db --remote --output=backups/freelance-hunter-before-change.sql --config cloudflare-api/wrangler.toml
```

Check that the command succeeded and the file is non-empty. Do not commit or upload the backup to a public repository. Repeat with a new filename before each production migration or recovery operation.

The Wrangler export command is documented by Cloudflare: https://developers.cloudflare.com/d1/best-practices/import-export-data/

## Apply migrations safely

The compatibility Worker must be deployed before applying migrations so the auth handler can handle the old and Telegram-only schemas during the rollout.

After a verified backup, apply pending migrations:

```bash
npx wrangler d1 migrations apply freelance-hunter-db --remote --config cloudflare-api/wrangler.toml
```

Then re-check the migration list and `/health`. Migration `0007_telegram_only_identity.sql` changes the identity columns and removes legacy password fields. Migration `0009_provider_submission_tracking.sql` adds the columns used to record a confirmed provider bid ID and ambiguous submission errors. Do not apply migrations without a verified backup and post-migration sign-in/schema tests.

## Restore to a separate test database

Do not experiment with restore commands against production. Create or choose a separate empty D1 database, update the command to its name, and import the SQL backup:

```bash
npx wrangler d1 execute <test-database-name> --remote --file=backups/freelance-hunter-before-change.sql
```

After import, check table counts and run a test Worker against that database before considering the restore verified. A production recovery must follow a separately reviewed plan because restoring an old snapshot can discard newer user data.

Cloudflare also documents D1 Time Travel and point-in-time restore: https://developers.cloudflare.com/d1/reference/time-travel/. Check the database's available recovery window in the account before relying on it.

## Deployment smoke-test checklist

- [ ] `GET /health` reports connected database and ready schema.
- [ ] Register a new test account through Telegram and verify the one-time code expires and cannot be reused.
- [ ] Sign in with an existing Telegram account after migration.
- [ ] Verify `/auth/logout` invalidates the session and protected routes return 401 afterward.
- [ ] Create two test accounts and confirm one cannot read or mutate the other's projects, sources, applications, profile, or integrations.
- [ ] Add a public Telegram source and run a manual scan; verify the source status, scan timestamp, and stored project rows.
- [ ] Confirm a second scan does not create duplicates.
- [ ] Confirm bot notifications are delivered only when configured and enabled.
- [ ] Generate a proposal only after an AI provider has been intentionally configured; verify the result remains a draft.
- [ ] If using Freelancehunt, test bid submission with a controlled test listing and verify provider bid ID persistence, definite rejection handling, and duplicate prevention.
- [ ] Confirm marketplace submissions remain unavailable unless a provider adapter returns a confirmed result.

## Incident diagnostics

- API request failures are logged as structured events without returning raw exception details to clients.
- Source errors are stored in the source record and surfaced in manual scan responses.
- Inspect Cloudflare Worker logs and the D1 migration list before retrying a failed migration.
- Do not paste API tokens, cookies, database exports, or Telegram authentication codes into issues or chat.
- Scheduled scans and notifications still need production alert delivery and a real end-to-end test; logs alone are not an alerting system.
