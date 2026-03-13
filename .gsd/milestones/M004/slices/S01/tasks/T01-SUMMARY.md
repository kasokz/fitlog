---
id: T01
parent: S01
milestone: M004
provides:
  - Postgres via Docker Compose
  - Drizzle ORM with full schema (13 tables)
  - Better Auth with email/password, JWT, Bearer plugins
  - Auth middleware chain in hooks.server.ts
  - AppError + resolveError error handling
  - requireUserId() helper
key_files:
  - docker-compose.yml
  - apps/web/src/lib/server/db/schema.ts
  - apps/web/src/lib/server/auth.ts
  - apps/web/src/lib/server/error.ts
  - apps/web/src/hooks.server.ts
key_decisions:
  - JWT plugin added to Better Auth (requires jwks table) — enables /api/auth/token endpoint for mobile JWT retrieval
  - Docker Compose Postgres on port 5433 (5432 commonly occupied by other containers)
  - App data tables use text columns for timestamps (matching SQLite schema) rather than Postgres timestamp type — keeps sync simpler
  - body_weight_entries unique index includes user_id (per-user unique dates, not global)
patterns_established:
  - building guard pattern: `!building ? realInit() : undefined as unknown` for server modules
  - Auth middleware chain: paraglide → Better Auth session resolution → API auth guard
  - Bearer token auth via Better Auth bearer plugin — auth.api.getSession() resolves from Authorization header automatically
  - Error handling: throw AppError → catch with resolveError() → return JSON {status, code, message}
observability_surfaces:
  - /api/auth/get-session — session state inspection
  - drizzle-kit studio — DB inspection
  - Postgres user/session tables directly
  - HTTP status codes with structured JSON error bodies on all API routes
  - Better Auth internal [Better Auth]: prefixed console logs
duration: ~25min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Server-side foundation — Postgres, Drizzle schema, Better Auth, hooks

**Stood up complete server-side auth and data infrastructure: Docker Compose Postgres, Drizzle ORM with 13-table schema, Better Auth with email/password + JWT + Bearer plugins, auth middleware chain, and error handling utilities.**

## What Happened

Created Docker Compose with Postgres 16 (port 5433 to avoid conflicts). Installed better-auth, drizzle-orm, postgres as runtime deps; drizzle-kit, @better-auth/cli, tsx, vitest as dev deps. Added db:push, db:generate, db:studio, test scripts.

Built Drizzle singleton with building guard. Defined auth schema (user, session, account, verification, jwks) matching Better Auth's expected structure. Defined 8 app data tables (exercises, programs, training_days, exercise_assignments, mesocycles, workout_sessions, workout_sets, body_weight_entries) — each with user_id FK to auth user.id and columns matching the mobile SQLite schema.

Configured Better Auth with email/password enabled, JWT plugin, Bearer plugin, and sveltekitCookies. The JWT plugin required adding a `jwks` table to the schema. Rewrote hooks.server.ts to chain paraglide → Better Auth session resolution (with try-catch for robustness) → API auth guard that rejects unauthenticated /api/ requests with 401.

Created AppError class and resolveError() utility following the reference app pattern. Wrote vitest tests for both error utilities and requireUserId().

## Verification

- `docker compose up -d` — Postgres starts successfully ✅
- `pnpm --filter web db:push` — 13 tables created (user, session, account, verification, jwks + 8 app tables) ✅
- `curl -X POST /api/auth/sign-up/email` — returns 200 with user data ✅
- `curl -X POST /api/auth/sign-in/email` — returns 200 with session + token ✅
- Bearer token auth: `curl -H "Authorization: Bearer {token}" /api/auth/get-session` — returns session ✅
- Unauthenticated `/api/` request returns 401 ✅
- `pnpm --filter web test` — 7 tests pass (2 auth, 5 error) ✅
- `pnpm --filter web build` — succeeds (building guard works) ✅
- `pnpm --filter mobile test` — 428 tests pass (no regression) ✅

## Diagnostics

- Session state: `GET /api/auth/get-session` with cookie or Bearer token
- DB inspection: `pnpm --filter web db:studio` or direct Postgres queries via `docker exec fitlog-postgres-1 psql -U fitlog -d fitlog`
- Error shapes: all API errors return `{status, code, message}` JSON
- Auth logs: Better Auth emits `[Better Auth]:` prefixed console messages

## Deviations

- Added `jwks` table — JWT plugin requires it, not mentioned in original task plan's 12-table count. Total is now 13 tables (5 auth + 8 app).
- Docker Compose uses port 5433 instead of 5432 — port 5432 commonly occupied by other Docker containers.
- Added try-catch around `auth.api.getSession()` in hooks — without it, getSession errors crash the entire request pipeline.
- ORIGIN env var must match actual server port — Better Auth uses it to determine its own base URL for route matching.

## Known Issues

- Better Auth warns about BETTER_AUTH_SECRET length (<32 chars) with the dev default — production must use a proper secret.

## Files Created/Modified

- `docker-compose.yml` — Postgres 16 service, port 5433
- `apps/web/drizzle.config.ts` — Drizzle Kit config pointing to schema
- `apps/web/src/lib/server/db/index.ts` — Drizzle singleton with building guard
- `apps/web/src/lib/server/db/schema.ts` — Barrel export of auth + app schemas
- `apps/web/src/lib/server/db/auth.schema.ts` — Better Auth tables (user, session, account, verification, jwks)
- `apps/web/src/lib/server/db/app.schema.ts` — 8 app tables with user_id FK columns
- `apps/web/src/lib/server/auth.ts` — Better Auth config with JWT + Bearer + sveltekitCookies, requireUserId()
- `apps/web/src/lib/server/error.ts` — AppError class + resolveError()
- `apps/web/src/hooks.server.ts` — Auth middleware chain (paraglide + Better Auth + API guard)
- `apps/web/src/app.d.ts` — Typed App.Locals with user/session
- `apps/web/.env.example` — Added DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN
- `apps/web/package.json` — Added dependencies and scripts
- `apps/web/vite.config.ts` — Added vitest config
- `apps/web/src/lib/server/auth.test.ts` — Tests for requireUserId()
- `apps/web/src/lib/server/error.test.ts` — Tests for AppError + resolveError()
