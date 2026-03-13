# S01: Backend API + Auth + Mobile Sign-In

**Goal:** A user can sign up and sign in from the mobile app against a running SvelteKit API with Better Auth + Drizzle + Postgres. Bearer token is stored on device. Server has Drizzle schema for all 8 app tables with `user_id` columns plus Better Auth tables.
**Demo:** From the mobile app, tap "Sign Up", enter email + password, receive a Bearer token stored in Preferences. Sign out, sign back in, token refreshed. Server-side: Postgres has the user row, session row, and empty app data tables ready for S02 sync.

## Must-Haves

- SvelteKit API (`apps/web`) with Better Auth (email/password + JWT + Bearer plugins), Drizzle ORM, Postgres connection
- Docker Compose with Postgres for local dev
- Drizzle schema for all 8 app tables (exercises, programs, training_days, exercise_assignments, mesocycles, workout_sessions, workout_sets, body_weight_entries) with `user_id` column + Better Auth tables (user, session, account, verification)
- `hooks.server.ts` resolving session from cookie OR Bearer token, with `requireUserId()` utility for protected routes
- `AppError` + `resolveError()` error handling pattern (from reference app)
- Mobile auth service (`auth-client.ts`): sign-up, sign-in, sign-out, token storage in `@capacitor/preferences`, auth state readable by other services
- Mobile auth UI: sign-up and sign-in screens as SvelteKit routes with superforms + shadcn-svelte form components
- Auth round-trip proven end-to-end: mobile → API → JWT/Bearer → stored token → authenticated request
- `app.d.ts` types for `event.locals.user` and `event.locals.session`

## Proof Level

- This slice proves: integration (mobile ↔ API ↔ Postgres auth round-trip)
- Real runtime required: yes (Postgres + SvelteKit API + mobile app)
- Human/UAT required: yes (sign-up/sign-in from mobile device or browser SPA)

## Verification

- `pnpm --filter web test` — vitest tests for auth setup, `requireUserId()`, error handling
- `docker compose up -d` + `pnpm --filter web db:push` succeeds — schema applied to Postgres
- `curl` against `/api/auth/sign-up/email` + `/api/auth/sign-in/email` returns session/token
- `pnpm --filter mobile test` — existing 428 tests still pass (no mobile DB changes in this slice)
- Manual: sign-up from mobile app, verify token in Preferences, sign-out, sign-in again

## Observability / Diagnostics

- Runtime signals: `[Auth]` prefixed console logs in mobile auth service (sign-in success/failure, token refresh, sign-out). Server-side: Better Auth handles logging internally + `AppError` with status codes.
- Inspection surfaces: Postgres `user` and `session` tables, `@capacitor/preferences` for stored token, `/api/auth/get-session` endpoint for session check
- Failure visibility: HTTP status codes (401/403/500) with structured `{code, message}` payloads via `resolveError()`. Mobile auth errors surfaced via return types (not thrown).
- Redaction constraints: Bearer tokens never logged in full. Passwords never logged. User email logged only in `[Auth]` debug context on mobile.

## Integration Closure

- Upstream surfaces consumed: `apps/web` existing scaffold (svelte.config.js, adapter-node, paraglide), `apps/mobile` existing Preferences pattern (D034, D075, D103), reference app patterns (auth.ts, hooks.server.ts, db/index.ts, error.ts, auth.schema.ts)
- New wiring introduced in this slice: `hooks.server.ts` auth middleware chain, Drizzle DB singleton, Better Auth server instance, mobile auth-client module, auth UI routes
- What remains before the milestone is truly usable end-to-end: S02 (sync protocol), S03 (export), S04 (sync UI), S05 (i18n)

## Tasks

- [x] **T01: Server-side foundation — Postgres, Drizzle schema, Better Auth, hooks** `est:3h`
  - Why: Everything else depends on a running API server with auth. This is the foundation for the entire milestone.
  - Files: `docker-compose.yml`, `apps/web/package.json`, `apps/web/drizzle.config.ts`, `apps/web/src/lib/server/db/index.ts`, `apps/web/src/lib/server/db/schema.ts`, `apps/web/src/lib/server/db/auth.schema.ts`, `apps/web/src/lib/server/db/app.schema.ts`, `apps/web/src/lib/server/auth.ts`, `apps/web/src/lib/server/error.ts`, `apps/web/src/hooks.server.ts`, `apps/web/src/app.d.ts`, `apps/web/.env.example`
  - Do: Add docker-compose.yml with Postgres. Install better-auth, drizzle-orm, drizzle-kit, postgres, @better-auth/cli as devDeps. Create Drizzle DB singleton with `building` guard. Generate Better Auth schema via CLI. Define Drizzle schema for 8 app tables with `user_id` FK to auth user table. Configure Better Auth with email/password + JWT + Bearer plugins, Drizzle adapter. Rewrite `hooks.server.ts` to chain paraglide + Better Auth middleware + Bearer token resolution. Add `requireUserId()` utility. Add `AppError` + `resolveError()`. Type `app.d.ts` locals. Add `db:push`, `db:generate`, `auth:schema` scripts. Verify with `docker compose up -d` + `db:push` + curl auth endpoints.
  - Verify: `docker compose up -d && pnpm --filter web db:push` succeeds; `curl -X POST localhost:5174/api/auth/sign-up/email` returns user; `pnpm --filter web test` passes
  - Done when: Postgres running with all tables, Better Auth endpoints respond, `requireUserId()` returns 401 for unauthenticated requests

- [x] **T02: Mobile auth service — sign-up/in/out, token storage, auth state** `est:1.5h`
  - Why: Mobile app needs a service layer to call auth API and persist tokens. Decoupled from UI so sync service (S02) can consume auth state.
  - Files: `apps/mobile/src/lib/services/auth-client.ts`, `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
  - Do: Create `auth-client.ts` with functions: `signUp(email, password)`, `signIn(email, password)`, `signOut()`, `getStoredToken()`, `getAuthState()` (returns `{isSignedIn, userId, email}`), `clearAuth()`. Use `@capacitor/preferences` for token + user info storage (matching D103 pattern from premium.ts). Use `better-auth/svelte` `createAuthClient` pointed at configured API base URL. Token extracted from Better Auth response and stored. `[Auth]` prefixed logging. All functions catch-and-return (never throw), matching D073 pattern. Write unit tests mocking Preferences and fetch.
  - Verify: `pnpm --filter mobile test -- auth-client` passes; all existing 428 tests unaffected
  - Done when: Auth service module exports typed functions for sign-up/in/out with token persistence, unit tests cover happy path and error cases

- [x] **T03: Mobile auth UI — sign-up and sign-in screens with superforms** `est:2h`
  - Why: Users need screens to create accounts and sign in. This is the user-facing proof that the auth round-trip works end-to-end.
  - Files: `apps/mobile/src/routes/auth/sign-in/+page.svelte`, `apps/mobile/src/routes/auth/sign-up/+page.svelte`, `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte`, `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte`, `apps/mobile/src/lib/schemas/auth.ts`, `apps/mobile/src/routes/settings/+page.svelte`
  - Do: Define Zod schemas for sign-in (email + password) and sign-up (email + password + confirm password) using `zod4` syntax. Create form components using superforms SPA mode + `zod4Client` adapter + shadcn-svelte form components (formsnap). Forms call auth-client service functions on submit. Success navigates to programs page. Error states shown via form field errors and toast. Add "Sign In" / "Create Account" entry point in Settings page (visible when not signed in). Auth screens have clean mobile layout — no bottom nav (like workout screen pattern). Add `de.json` i18n keys for auth UI (base locale requirement).
  - Verify: Manual test: navigate to auth screen, fill form, submit — see success or validation errors. `pnpm --filter mobile test` — all existing tests pass. `pnpm --filter mobile check` — no type errors.
  - Done when: Sign-up and sign-in screens render, validate input, call auth service, show success/error feedback, navigate on success. Settings page shows auth entry point when not signed in.

## Files Likely Touched

- `docker-compose.yml`
- `apps/web/package.json`
- `apps/web/drizzle.config.ts`
- `apps/web/src/lib/server/db/index.ts`
- `apps/web/src/lib/server/db/schema.ts`
- `apps/web/src/lib/server/db/auth.schema.ts`
- `apps/web/src/lib/server/db/app.schema.ts`
- `apps/web/src/lib/server/auth.ts`
- `apps/web/src/lib/server/error.ts`
- `apps/web/src/hooks.server.ts`
- `apps/web/src/app.d.ts`
- `apps/web/.env.example`
- `apps/web/vite.config.ts`
- `apps/mobile/src/lib/services/auth-client.ts`
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
- `apps/mobile/src/routes/auth/sign-in/+page.svelte`
- `apps/mobile/src/routes/auth/sign-up/+page.svelte`
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte`
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte`
- `apps/mobile/src/lib/schemas/auth.ts`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/messages/de.json`
