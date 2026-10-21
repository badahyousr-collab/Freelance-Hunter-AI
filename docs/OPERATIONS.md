# Operations and recovery

This guide documents the free-plan-compatible operational steps for the Cloudflare Worker and D1 deployment. Production health checks, migration application, and Worker deployment have been verified. A production database export and restore drill have not been performed; recovery is not verified until those are tested against a separate database.

## Before changing production

1. Confirm you are in the repository root and have authenticated Wrangler with the Cloudflare account that owns `freelance-hunter-db`.
2. Check the current deployment and D1 migration state.
3. Export a database backup before applying destructive migrations or restoring data.
4. Keep the backup outside Git and store it somewhere private. It contains account and project data.

## Configure operational alerts

Scheduled scan failures and new-project notification delivery failures can be sent to a private Telegram operations chat. Set `WORKER_ALERT_CHAT_ID` to the chat ID and ensure `TELEGRAM_BOT_TOKEN` is configured:

```bash
npx wrangler secret put WORKER_ALERT_CHAT_ID --config cloudflare-api/wrangler.toml
```

Paste the private chat ID only into the Wrangler prompt. The readiness endpoint reports whether alert delivery is configured. Without this setting, failures remain in Worker logs and persisted source status; that is not live alerting.

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

After checking the migration list and taking a private backup for any schema/data change, apply pending migrations:

```bash
npx wrangler d1 migrations apply freelance-hunter-db --remote --config cloudflare-api/wrangler.toml
```

Then re-check the migration list and `/health`. Migration `0007_telegram_only_identity.sql` changes the identity columns and removes legacy password fields. Migration `0008_new_project_notifications.sql` adds the new-project notification preference. Migration `0009_provider_submission_tracking.sql` adds provider bid IDs and safe submission error fields. Migration `0010_freelancehunt_status_sync.sql` stores provider-confirmed bid status. Migration `0011_application_update_notifications.sql` adds the opt-out preference for Telegram notifications about provider-confirmed application replies. Migration `0013_freelancehunt_thread_replies.sql` adds separately controlled reply processing for new Freelancehunt employer messages and opts in existing enabled agents that already use auto-submit. After migrations, check Telegram sign-in and `/health`; verify any new automatic external action's saved setting before relying on it.

## Configure marketplace token encryption

Before connecting Freelancehunt, set the Worker secret:

```bash
npx wrangler secret put INTEGRATION_ENCRYPTION_KEY --config cloudflare-api/wrangler.toml
```

Generate a strong random value with `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Do not commit it or expose it as a frontend environment variable. Losing this key makes stored Freelancehunt tokens unrecoverable; users must reconnect. After setting it, connect a user-owned API token through the website and verify the integration status without exposing the token in API responses.

## Scheduled health alert

The `Worker health monitor` GitHub Actions workflow checks the deployed Worker health endpoint hourly. It opens one repository issue if the Worker, D1 connection, or required schema is unhealthy, and closes that issue after a later healthy check. It does not inspect private Worker logs or confirm source-scan success; those still require Cloudflare log review. The monitor is free within GitHub Actions usage and does not require an external uptime service.

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
- [ ] Connect a test Freelancehunt API token, scan a public project list, and verify duplicate suppression.
- [ ] Prepare a bid, confirm it in the browser, and verify the returned provider bid ID on the application record. Do not test against a live project unless you intend to submit a real bid.
- [ ] With a disposable Freelancehunt account and a test project, verify automatic reply delivery, duplicate prevention, and failure handling. Production currently has no eligible submitted bids, so this live delivery check remains pending.

## Incident diagnostics

- API request failures are logged as structured events without returning raw exception details to clients.
- Source errors are stored in the source record and surfaced in manual scan responses.
- Inspect Cloudflare Worker logs and the D1 migration list before retrying a failed migration.
- Do not paste API tokens, cookies, database exports, or Telegram authentication codes into issues or chat.
- Scheduled scans and notifications still need production alert delivery and a real end-to-end test; logs alone are not an alerting system.
