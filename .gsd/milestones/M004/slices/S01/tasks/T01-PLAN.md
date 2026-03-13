---
estimated_steps: 8
estimated_files: 12
---

# T01: Server-side foundation — Postgres, Drizzle schema, Better Auth, hooks

**Slice:** S01 — Backend API + Auth + Mobile Sign-In
**Milestone:** M004

## Description

Stand up the entire server-side auth and data infrastructure on `apps/web`. This includes Docker Compose for Postgres, Drizzle ORM with schema for all 8 app tables (with `user_id` FK) plus Better Auth's 4 tables, Better Auth configured with email/password + JWT + Bearer plugins, hooks.server.ts with auth middleware chain, error handling utilities, and `requireUserId()`. Follows the reference app (`references/capacitor-live-updates`) patterns closely.

## Steps

1. **Add Docker Compose** — Create `docker-compose.yml` at repo root with Postgres 16 service. Port 5432, reasonable defaults. Add `.env.example` entries for `DATABASE_URL` and `BETTER_AUTH_SECRET`.

2. **Install server dependencies** — In `apps/web`, install: `better-auth`, `drizzle-orm`, `postgres` (runtime); `@better-auth/cli`, `drizzle-kit`, `tsx`, `vitest` (dev). Add scripts: `db:push`, `db:generate`, `db:studio`, `auth:schema`, `test`.

3. **Create Drizzle DB singleton** — `src/lib/server/db/index.ts`: Postgres client via `postgres` package, Drizzle instance with `building` guard. Read `DATABASE_URL` from `$env/dynamic/private`.

4. **Define auth schema** — Run `better-auth generate` or manually create `src/lib/server/db/auth.schema.ts` with `user`, `session`, `account`, `verification` tables matching reference app. Export types.

5. **Define app data schema** — Create `src/lib/server/db/app.schema.ts` with Drizzle pgTable definitions for all 8 tables: `exercises`, `programs`, `training_days`, `exercise_assignments`, `mesocycles`, `workout_sessions`, `workout_sets`, `body_weight_entries`. Each gets a `user_id` column (text, FK to auth `user.id`, NOT NULL). Mirror the client-side SQLite schema columns but in Postgres types (text → text, integer → integer, real → doublePrecision). Add `schema.ts` barrel export. Create `drizzle.config.ts`.

6. **Configure Better Auth** — Create `src/lib/server/auth.ts`: `betterAuth()` with Drizzle adapter, email/password enabled, JWT plugin, Bearer plugin, `sveltekitCookies` plugin (last). Export `auth` and `requireUserId()`. Guard with `building` check.

7. **Rewrite hooks.server.ts** — Chain paraglide middleware + Better Auth middleware (session resolution from cookie or Bearer token). For `/api/` routes without session, check Bearer header and resolve via Better Auth Bearer plugin. Add `src/app.d.ts` with typed `App.Locals` (user, session).

8. **Add error utilities + verification tests** — Create `src/lib/server/error.ts` with `AppError` class and `resolveError()`. Write vitest tests verifying: `requireUserId()` throws 401 without session, `resolveError()` returns correct payloads for AppError and unknown errors. Update `vite.config.ts` to include vitest config if needed. Run `docker compose up -d` + `db:push` to verify schema applies.

## Must-Haves

- [ ] Docker Compose runs Postgres and `db:push` applies full schema without errors
- [ ] Better Auth sign-up and sign-in endpoints respond at `/api/auth/sign-up/email` and `/api/auth/sign-in/email`
- [ ] Bearer token authentication works on `/api/` routes
- [ ] `requireUserId()` returns 401 for unauthenticated requests
- [ ] All 8 app tables have `user_id` column with FK to auth `user.id`
- [ ] `building` guard prevents crashes during `vite build`
- [ ] `AppError` + `resolveError()` error handling pattern in place

## Verification

- `docker compose up -d` starts Postgres without errors
- `pnpm --filter web db:push` applies schema — all 12 tables created (8 app + 4 auth)
- `curl -X POST http://localhost:5174/api/auth/sign-up/email -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"password123","name":"Test"}'` returns 200 with user data
- `curl -X POST http://localhost:5174/api/auth/sign-in/email -H 'Content-Type: application/json' -d '{"email":"test@test.com","password":"password123"}'` returns 200 with session + token
- `pnpm --filter web test` passes
- `pnpm --filter web build` succeeds (building guard works)

## Observability Impact

- Signals added/changed: `AppError` with structured `{status, code, message}` on all API errors. Better Auth internal logging for auth events.
- How a future agent inspects this: `drizzle-kit studio` for DB inspection, `/api/auth/get-session` for session state, Postgres `user`/`session` tables directly.
- Failure state exposed: HTTP status codes with JSON error bodies on all API routes. `requireUserId()` returns 401 with `"Authentication required"` message.

## Inputs

- Reference app patterns: `references/capacitor-live-updates/apps/web/src/lib/server/auth.ts`, `db/index.ts`, `db/auth.schema.ts`, `hooks.server.ts`, `error.ts`
- Client-side SQLite schema: `apps/mobile/src/lib/db/schema.sql` — source of truth for table structure
- Existing `apps/web` scaffold: svelte.config.js (adapter-node), vite.config.ts, hooks.server.ts (paraglide)
- Decisions: D087 (Better Auth), D088 (Drizzle), D089 (SvelteKit apps/web), D097 (standard +server.ts routes), D098/D099 (custom REST sync, keep SQLite)

## Expected Output

- `docker-compose.yml` — Postgres service at repo root
- `apps/web/drizzle.config.ts` — Drizzle config pointing to schema
- `apps/web/src/lib/server/db/index.ts` — Drizzle singleton with building guard
- `apps/web/src/lib/server/db/schema.ts` — Barrel export of all schema modules
- `apps/web/src/lib/server/db/auth.schema.ts` — Better Auth tables (user, session, account, verification)
- `apps/web/src/lib/server/db/app.schema.ts` — 8 app tables with user_id columns
- `apps/web/src/lib/server/auth.ts` — Better Auth config + requireUserId()
- `apps/web/src/lib/server/error.ts` — AppError + resolveError()
- `apps/web/src/hooks.server.ts` — Auth middleware chain (paraglide + Better Auth + Bearer)
- `apps/web/src/app.d.ts` — Typed App.Locals
- `apps/web/.env.example` — Updated with DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN
- `apps/web/package.json` — Updated dependencies and scripts
