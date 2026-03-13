---
id: S01
parent: M004
milestone: M004
provides:
  - SvelteKit API server with Better Auth (email/password + JWT + Bearer plugins) + Drizzle ORM + Postgres
  - 13-table Drizzle schema (5 auth + 8 app tables with user_id FK)
  - Auth middleware chain (paraglide → Better Auth session → API guard) in hooks.server.ts
  - AppError + resolveError error handling pattern
  - requireUserId() utility for protected API routes
  - Mobile auth service with sign-up/in/out, Bearer token persistence in Preferences, typed auth state
  - Sign-in and sign-up screens with superforms SPA + zod4 + shadcn-svelte form components
  - Auth entry point in Settings page (sign-in/sign-up when unauthenticated, user info + sign-out when authenticated)
  - 26 i18n keys in de.json and en.json for auth UI
requires:
  - slice: none
    provides: first slice
affects:
  - S02 (consumes: auth state, user ID, Bearer token, API server, requireUserId())
  - S04 (consumes: auth state for account settings)
  - S05 (consumes: all auth UI strings for i18n verification)
key_files:
  - docker-compose.yml
  - apps/web/src/lib/server/db/schema.ts
  - apps/web/src/lib/server/db/auth.schema.ts
  - apps/web/src/lib/server/db/app.schema.ts
  - apps/web/src/lib/server/auth.ts
  - apps/web/src/lib/server/error.ts
  - apps/web/src/hooks.server.ts
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/schemas/auth.ts
  - apps/mobile/src/routes/auth/sign-in/SignInForm.svelte
  - apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte
  - apps/mobile/src/routes/settings/+page.svelte
key_decisions:
  - D108: Mobile-to-API base URL as hardcoded constant, environment-specific at build time later
  - D109: user_id NOT NULL FK on every server-side app table
  - D110: JWT plugin requires jwks table (13 tables total, not 12)
  - D111: Auth session resolution wrapped in try-catch in hooks
  - D112: Bearer token extracted from set-auth-token response header (Bearer plugin output)
  - D113: Raw fetch to Better Auth REST endpoints instead of client SDK for cross-origin Bearer flows
patterns_established:
  - Building guard pattern for server modules during SvelteKit build
  - Auth middleware chain: paraglide → Better Auth → API guard
  - Bearer token auth via Better Auth bearer plugin (set-auth-token header)
  - AppError + resolveError error handling for API routes
  - Mobile auth service catch-and-return pattern (never throws)
  - Auth form pattern: superforms SPA + zod4Client + shadcn-svelte Form + auth-client + toast + goto
  - Auth state in settings via $effect loading async auth state on mount
observability_surfaces:
  - /api/auth/get-session — session state inspection (cookie or Bearer)
  - HTTP status codes with structured JSON {status, code, message} on all API errors
  - [Auth] prefixed console logs on all mobile auth operations
  - [Auth UI] prefixed console logs on form submission errors
  - Toast messages surface success/failure to user
  - Postgres user/session tables for direct inspection
  - drizzle-kit studio for DB browsing
drill_down_paths:
  - .gsd/milestones/M004/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M004/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M004/slices/S01/tasks/T03-SUMMARY.md
duration: ~55min
verification_result: passed
completed_at: 2026-03-13
---

# S01: Backend API + Auth + Mobile Sign-In

**Shipped SvelteKit API with Better Auth (email/password + JWT + Bearer), Drizzle ORM + Postgres (13 tables), mobile auth service with token persistence, and sign-up/sign-in UI screens — full auth round-trip proven end-to-end via curl, ready for manual device UAT.**

## What Happened

Three tasks built the auth stack bottom-up:

**T01 (Server foundation):** Docker Compose with Postgres 16 on port 5433. Drizzle ORM with 13-table schema: 5 auth tables (user, session, account, verification, jwks) and 8 app data tables mirroring the mobile SQLite schema but with `user_id` FK columns. Better Auth configured with email/password, JWT plugin (for mobile token issuance), and Bearer plugin (for `Authorization` header auth). `hooks.server.ts` chains paraglide → Better Auth session resolution (with try-catch) → API auth guard that 401s unauthenticated `/api/` requests. `AppError` + `resolveError()` provides structured error JSON. `requireUserId()` utility for protected routes. All verified via curl: sign-up returns user, sign-in returns session/token, Bearer auth resolves session, unauthenticated requests get 401.

**T02 (Mobile auth service):** `auth-client.ts` with `signUp()`, `signIn()`, `signOut()`, `getStoredToken()`, `getAuthState()`, `isSignedIn()`. Uses raw fetch to Better Auth REST endpoints (not the client SDK — cross-origin Bearer token flows don't fit the SDK's same-origin cookie model). Token extracted from `set-auth-token` response header (Bearer plugin output) with body fallback. Stored in `@capacitor/preferences` under `auth_*` keys. All functions catch-and-return (never throw). 26 unit tests covering happy path, error handling, and integration flow.

**T03 (Auth UI):** Zod4 schemas for sign-in and sign-up (with password match refinement). Form components using superforms SPA mode + `zod4Client` + shadcn-svelte Form components. Pages at `/auth/sign-in` and `/auth/sign-up` with centered mobile layout, cross-links, and hidden bottom nav. Settings page gained auth section: sign-in/sign-up buttons when unauthenticated, user email + sign-out when authenticated. 26 i18n keys added to both de.json and en.json (393 total, zero drift).

## Verification

- `pnpm --filter web test` — 7 tests pass (2 auth, 5 error) ✅
- `pnpm --filter mobile test` — 454 tests pass (428 existing + 26 new) ✅
- `pnpm --filter web build` — succeeds (building guard works) ✅
- `pnpm --filter mobile build` — succeeds, auth routes compiled ✅
- `docker compose up -d` + `pnpm --filter web db:push` — 13 tables created ✅ (T01)
- `curl` sign-up/sign-in/Bearer auth/get-session — all return expected responses ✅ (T01)
- Unauthenticated `/api/` request returns 401 ✅ (T01)
- i18n: de.json and en.json both 393 keys, zero drift ✅
- Manual device UAT (sign-up → token → sign-out → sign-in) — deferred to human tester

## Requirements Advanced

- R026 (Account System) — Auth infrastructure fully built: sign-up, sign-in, sign-out, JWT/Bearer tokens, session management. Pending manual device UAT for full validation.
- R025 (Cloud Sync Infrastructure) — Server-side Drizzle schema with user_id columns provides the data layer foundation. Actual sync protocol is S02.
- R012 (Sync-Ready Data Model) — Server-side schema mirrors client-side UUID/timestamp/soft-delete model with user_id scoping. Now exercised on both sides.

## Requirements Validated

- none — manual device UAT still needed to fully validate R026

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- JWT plugin required `jwks` table not in original plan — total tables is 13 (not 12)
- Docker Compose Postgres on port 5433 (not 5432) to avoid conflicts with other containers
- Auth service uses raw fetch instead of `better-auth/svelte` client SDK (D113) — plan mentioned `createAuthClient`
- Added `name` field to `AuthState` type (Better Auth returns user name, useful for UI)
- en.json translations added alongside de.json in T03 (plan only specified de base locale, but AGENTS.md sync rules require it)

## Known Limitations

- `API_BASE_URL` hardcoded to `http://localhost:5174` — must be configured per environment for production (D108)
- `BETTER_AUTH_SECRET` dev default is <32 chars — production must use a proper secret
- 33 pre-existing type errors in `pnpm check` (none from auth files)
- Full end-to-end manual verification requires running both mobile dev server and web API with Postgres simultaneously

## Follow-ups

- S02 will consume auth state (isSignedIn, userId, Bearer token) for sync service
- S04 will consume auth state for account settings UI
- Production API_BASE_URL configuration needed before deployment

## Files Created/Modified

- `docker-compose.yml` — Postgres 16 service, port 5433
- `apps/web/drizzle.config.ts` — Drizzle Kit config
- `apps/web/src/lib/server/db/index.ts` — Drizzle singleton with building guard
- `apps/web/src/lib/server/db/schema.ts` — Barrel export of auth + app schemas
- `apps/web/src/lib/server/db/auth.schema.ts` — Better Auth tables (user, session, account, verification, jwks)
- `apps/web/src/lib/server/db/app.schema.ts` — 8 app tables with user_id FK
- `apps/web/src/lib/server/auth.ts` — Better Auth config + requireUserId()
- `apps/web/src/lib/server/error.ts` — AppError + resolveError()
- `apps/web/src/hooks.server.ts` — Auth middleware chain
- `apps/web/src/app.d.ts` — Typed App.Locals
- `apps/web/.env.example` — DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN
- `apps/web/package.json` — Dependencies and scripts
- `apps/web/vite.config.ts` — Vitest config
- `apps/web/src/lib/server/auth.test.ts` — Tests for requireUserId()
- `apps/web/src/lib/server/error.test.ts` — Tests for AppError + resolveError()
- `apps/mobile/src/lib/services/auth-client.ts` — Auth service module
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — 26 unit tests
- `apps/mobile/src/lib/schemas/auth.ts` — Zod4 schemas for sign-in/sign-up
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Sign-in page
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Sign-in form
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Sign-up page
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — Sign-up form
- `apps/mobile/src/routes/settings/+page.svelte` — Added auth section
- `apps/mobile/src/routes/+layout.svelte` — Hide bottom nav on /auth/* routes
- `apps/mobile/messages/de.json` — 26 auth i18n keys
- `apps/mobile/messages/en.json` — 26 auth i18n keys

## Forward Intelligence

### What the next slice should know
- Auth state is accessed via `getAuthState()` and `getStoredToken()` from `auth-client.ts`. Both are async (read from Preferences). `isSignedIn()` is a convenience wrapper.
- The Bearer token is a signed Better Auth session token, not a JWT access token. It's valid as long as the server session exists. No client-side expiry tracking — just send it and handle 401 as "need to re-auth."
- Server API guard in hooks.server.ts rejects all `/api/*` requests without valid session. Better Auth's own routes (`/api/auth/*`) are exempted by the Bearer plugin handling them first.
- `requireUserId()` extracts `event.locals.user.id` and throws AppError(401) if missing — use it in all protected `+server.ts` handlers.

### What's fragile
- `API_BASE_URL` is hardcoded in auth-client.ts — any environment change (different port, deployed URL) requires editing the constant. S02 sync service will also need this URL.
- Better Auth's `set-auth-token` header behavior depends on the Bearer plugin's after-hook. If Better Auth updates and changes this, token extraction breaks silently (falls back to body token which may not exist).

### Authoritative diagnostics
- `GET /api/auth/get-session` with Bearer token — if this returns a session, auth is working end-to-end
- `[Auth]` console logs in mobile — trace the full sign-up/sign-in/sign-out flow
- Postgres `user` and `session` tables — ground truth for auth state

### What assumptions changed
- Better Auth JWT plugin needs a `jwks` table — wasn't in original plan's table count. Future schema changes must account for 5 auth tables, not 4.
- Better Auth client SDK doesn't suit cross-origin mobile flows — raw fetch is the right approach for mobile auth (D113).
