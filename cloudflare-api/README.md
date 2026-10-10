# Cloudflare D1 API

This directory contains the first Cloudflare-native API implementation for Freelance Hunter AI. It uses a D1 database and does not require a paid PostgreSQL, Redis, or background-worker host.

## What is implemented

- D1 schema for users, sessions, profiles, agent settings, source configurations, projects, applications, integrations, and Telegram link codes.
- Registration, password hashing with PBKDF2, login, logout, and cookie-backed sessions.
- Per-user data filtering on profile, sources, projects, applications, and settings.
- Dashboard summary and CRUD for saved source configurations.
- Same-origin frontend proxy is implemented in `apps/web/src/app/api/backend/[...path]/route.ts`.

## Important limitations

- Email delivery is not configured, so verification emails cannot be sent. Do not treat the current registration flow as production-ready email verification.
- The scan endpoint deliberately returns `501`: no live scheduled ingestion worker is deployed.
- Marketplace adapters, AI proposal generation, Telegram bot exchange, and real application submission are not active.
- Integration secrets are not stored until encrypted secret storage is configured. Never add credentials to source files or commit them.
- D1 has free-plan quotas; it is not unlimited.

## Cloudflare Workers Builds setup

Create a separate Worker build project connected to this same GitHub repository.

- Root directory: `cloudflare-api`
- Build command: `npm install && npx wrangler d1 migrations apply freelance-hunter-db --remote`
- Deploy command: `npx wrangler deploy`
- The Cloudflare API token used by the build needs permission to edit Workers and D1 databases for the selected account.

The `wrangler.toml` already names the D1 database `freelance-hunter-db` and includes the database ID provided during setup. Check that the ID matches the D1 database in your account before deploying.

After deployment, open the Worker URL and append `/health`. A successful response should report `"status":"ok"` and `"database":"connected"`.

## Connect the frontend

In the existing frontend Worker project's environment variables, add a **runtime variable**:

- Name: `CLOUDFLARE_API_URL`
- Value: the deployed API Worker URL, for example `https://freelance-hunter-api.<your-account-subdomain>.workers.dev` (use the actual URL shown by Cloudflare).

Save the variable and redeploy the frontend. Do not set `NEXT_PUBLIC_API_URL`: browser requests should go through the same-origin `/api/backend` proxy so the session cookie belongs to the frontend hostname.

## Database migration

The first deployment build applies the checked-in D1 migration remotely. If the build token cannot apply migrations, use Cloudflare Dashboard → D1 → `freelance-hunter-db` → Console and execute the contents of `migrations/0001_init.sql` once, then redeploy. Do not execute the same `CREATE TABLE` migration twice against an already initialized database.
