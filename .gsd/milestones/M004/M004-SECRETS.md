# Secrets Manifest

**Milestone:** M004 — Cloud Sync & Platform
**Generated:** 2026-03-13

### DATABASE_URL

**Service:** PostgreSQL (local Docker or hosted)
**Dashboard:** Local Docker — no dashboard. Hosted: depends on provider (Railway, Neon, etc.)
**Format hint:** `postgresql://user:password@host:5432/fitlog`
**Status:** collected
**Destination:** dotenv

1. Start Postgres via Docker Compose (provided in S01): `docker compose up -d`
2. Connection string is defined in `docker-compose.yml` — copy to `apps/web/.env`
3. For production: create a Postgres instance on your hosting provider and copy the connection string

### BETTER_AUTH_SECRET

**Service:** Better Auth (self-generated secret)
**Dashboard:** N/A — generated locally
**Format hint:** 32+ character random string (e.g., `openssl rand -base64 32`)
**Status:** collected
**Destination:** dotenv

1. Run: `openssl rand -base64 32`
2. Copy the output
3. Set as `BETTER_AUTH_SECRET` in `apps/web/.env`

### ORIGIN

**Service:** SvelteKit (application base URL)
**Dashboard:** N/A — application config
**Format hint:** `http://localhost:5174` (dev) or `https://api.fitlog.app` (prod)
**Status:** collected
**Destination:** dotenv

1. For local development: set to `http://localhost:5174`
2. For production: set to the deployed API server URL
