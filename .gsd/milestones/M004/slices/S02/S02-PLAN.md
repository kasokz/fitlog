# S02: Sync Protocol + Two-Way Sync

**Goal:** Changes made in the mobile app push to the server and changes from the server pull to the device. Seed exercises use deterministic UUIDs. Sync runs automatically after sign-in and on lifecycle events. LWW conflict resolution handles concurrent edits.
**Demo:** Sign in on mobile → create a workout → data appears in Postgres. Edit a row server-side → pull on mobile → local DB reflects the change. Offline changes queue and sync when online.

## Must-Haves

- Soft-delete updates `updated_at` so deletions propagate via sync
- Deterministic UUID v5 for all 56 seed exercises, with schema v6 migration that re-IDs existing seed exercises and cascades to FK references
- `POST /api/sync/push` endpoint applies client rows with LWW per row (server compares `updated_at`)
- `POST /api/sync/pull` endpoint returns rows newer than `last_pull_at` for authenticated user
- Client sync service: `pushChanges()`, `pullChanges()`, `fullSync()`, `incrementalSync()`
- Sync state (`last_push_at`, `last_pull_at`) persisted in `@capacitor/preferences`
- Server-side seed exercises use identical deterministic UUIDs
- Automatic sync triggers: full sync after sign-in, incremental on app resume, incremental on connectivity restore
- `@capacitor/network` installed for connectivity detection
- `body_weight_entries` pull upsert handles the partial unique index correctly
- Server uses `server_now` timestamps (not client clock) for sync high-water marks
- All 454+ existing mobile tests pass, all 7 web tests pass

## Proof Level

- This slice proves: integration (mobile → server → Postgres round-trip, bidirectional sync)
- Real runtime required: yes (needs Postgres + web API running for integration tests)
- Human/UAT required: yes (two-device sync, offline→online recovery)

## Verification

- `pnpm --filter mobile test` — all existing tests + new sync/uuid tests pass
- `pnpm --filter web test` — all existing + new sync endpoint tests pass
- `pnpm --filter mobile build` — compiles cleanly
- `pnpm --filter web build` — compiles cleanly
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — deterministic UUID generation verified
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — seed exercise re-ID + FK cascade verified
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — push endpoint LWW logic verified
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — pull endpoint filtering verified
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — client sync orchestration verified
- Manual: `docker compose up -d && pnpm --filter web db:push && pnpm --filter web dev` then exercise push/pull via curl

## Observability / Diagnostics

- Runtime signals: `[Sync]` prefixed console logs on all sync operations (push count, pull count, errors, timing)
- Inspection surfaces: Postgres app tables (direct query to verify pushed data), `@capacitor/preferences` sync state keys, `/api/sync/push` and `/api/sync/pull` response bodies
- Failure visibility: sync errors include HTTP status + server error body, logged with `[Sync]` prefix; sync state not updated on failure (retry-safe)
- Redaction constraints: Bearer tokens logged as `[REDACTED]` if ever logged; no row-level PII in sync logs (only counts)

## Integration Closure

- Upstream surfaces consumed: `auth-client.ts` (`getStoredToken()`, `isSignedIn()`, `API_BASE_URL`), `hooks.server.ts` (session resolution), `requireUserId()`, `AppError` + `resolveError()`
- New wiring introduced: sync triggers in `+layout.svelte` (resume, connectivity), full sync call after sign-in in auth flow, `@capacitor/network` listener
- What remains before the milestone is truly usable end-to-end: S03 (data export), S04 (sync status UI + account settings), S05 (i18n for all new strings)

## Tasks

- [x] **T01: Fix soft-delete updated_at + deterministic seed UUIDs + schema v6 migration** `est:1h`
  - Why: Without `updated_at` on soft-delete, deletions never sync. Without deterministic UUIDs, seed exercises get different IDs per device, breaking cross-device sync. These are prerequisites for all sync work.
  - Files: `apps/mobile/src/lib/db/repositories/bodyweight.ts`, `apps/mobile/src/lib/db/repositories/exercise.ts`, `apps/mobile/src/lib/db/repositories/program.ts`, `apps/mobile/src/lib/db/seed/exercises.ts`, `apps/mobile/src/lib/db/database.ts`, `apps/mobile/src/lib/utils/uuid-v5.ts`
  - Do: (1) Add `updated_at = ?` to all 5 soft-delete UPDATE statements. (2) Implement UUID v5 utility using SubtleCrypto SHA-1 (~15 lines, zero deps). (3) Change `seedExercises()` to use `uuidv5(name)` instead of `crypto.randomUUID()`. (4) Refactor `applySchema()` to support code-based migrations — add v6 migration that re-IDs seed exercises (is_custom=0) with deterministic UUIDs, cascading to `exercise_assignments.exercise_id` and `workout_sets.exercise_id`, all in a transaction. (5) Bump `CURRENT_SCHEMA_VERSION` to 6. (6) Write tests for UUID v5 determinism, soft-delete `updated_at`, and v6 migration FK cascade.
  - Verify: `pnpm --filter mobile test` — all 454+ existing tests pass plus new tests
  - Done when: soft-delete sets `updated_at`, seed exercises use deterministic UUIDs, schema v6 migration re-IDs seed exercises with FK cascade, all tests green

- [x] **T02: Server-side sync push and pull API endpoints** `est:45m`
  - Why: The server is the sync hub — it must accept pushed rows (LWW), return pulled rows (incremental), and seed exercises with the same deterministic UUIDs.
  - Files: `apps/web/src/routes/api/sync/push/+server.ts`, `apps/web/src/routes/api/sync/pull/+server.ts`, `apps/web/src/lib/server/sync/tables.ts`, `apps/web/src/lib/server/sync/seed.ts`
  - Do: (1) Create `tables.ts` mapping table names to Drizzle schema objects with column metadata for generic push/pull operations. (2) Implement `POST /api/sync/push` — `requireUserId()`, iterate tables, for each row: check existing by ID, INSERT if new (attach `user_id`), UPDATE if client `updated_at` > server `updated_at`, skip otherwise. Return `{ accepted, conflicts, server_now }`. (3) Implement `POST /api/sync/pull` — `requireUserId()`, query each table `WHERE user_id = ? AND updated_at > ?`, return `{ tables: {...}, server_now }`. (4) Handle `body_weight_entries` unique constraint: on push, if INSERT violates `(user_id, date)` unique index, treat as conflict/update. (5) Create server-side `seed.ts` using same `uuidv5()` function for seed exercise initialization. (6) Write unit tests mocking Drizzle for push LWW logic and pull filtering.
  - Verify: `pnpm --filter web test` — all existing + new sync tests pass; curl test push/pull against running server
  - Done when: push endpoint accepts rows with LWW, pull endpoint returns incremental rows, both behind auth guard, tests green

- [x] **T03: Client-side sync service with push, pull, and orchestration** `est:45m`
  - Why: The client needs to read local SQLite changes, push them to the server, pull remote changes, and upsert them locally — with correct ordering (push before pull) and state tracking.
  - Files: `apps/mobile/src/lib/services/sync.ts`, `apps/mobile/src/lib/services/__tests__/sync.test.ts`
  - Do: (1) Implement `sync.ts` with `pushChanges(lastPushAt)` — query each synced table for rows where `updated_at > lastPushAt`, POST to `/api/sync/push`, store `server_now` as next `last_push_at`. (2) Implement `pullChanges(lastPullAt)` — POST to `/api/sync/pull`, upsert returned rows into local SQLite via `INSERT OR REPLACE` (all columns). Handle `body_weight_entries` specially: SELECT first, then conditional INSERT/UPDATE to respect partial unique index. (3) Implement `fullSync()` — push all (no timestamp filter) then pull all. (4) Implement `incrementalSync()` — read `last_push_at`/`last_pull_at` from Preferences, push changed, pull changed. (5) Guard all operations with `isSignedIn()` check. (6) Catch-and-log errors (never throw) — sync failure is silent, retried next trigger. (7) Use `getStoredToken()` for Bearer auth header. (8) Import `API_BASE_URL` from auth-client (or extract to shared constant). (9) Write tests mocking fetch + dbQuery/dbExecute.
  - Verify: `pnpm --filter mobile test` — all tests pass including new sync service tests
  - Done when: sync service can push local changes, pull remote changes, orchestrate full and incremental sync, persist sync timestamps, handle errors gracefully

- [x] **T04: Wire sync triggers into app lifecycle + install @capacitor/network** `est:30m`
  - Why: Sync must run automatically — after sign-in (full), on resume (incremental), on connectivity restore (incremental). Without lifecycle wiring, sync only works manually.
  - Files: `apps/mobile/package.json`, `apps/mobile/src/routes/+layout.svelte`, `apps/mobile/src/lib/services/auth-client.ts`, `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte`, `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte`
  - Do: (1) Install `@capacitor/network` in `apps/mobile`. (2) In `+layout.svelte`: add `Network.addListener('networkStatusChange')` — on connected + signed in, call `incrementalSync()`. Add `incrementalSync()` alongside `revalidatePurchases()` in resume handler (guarded by `isSignedIn()`). (3) After successful sign-in (in SignInForm's onSubmit success path): call `fullSync()`. Same for sign-up. (4) Ensure sync imports are lazy or guarded to avoid blocking app startup. (5) Test that `pnpm --filter mobile build` compiles and existing tests still pass.
  - Verify: `pnpm --filter mobile build` — compiles; `pnpm --filter mobile test` — all tests pass; manual: sign in → check Postgres for pushed data
  - Done when: sync fires automatically after sign-in (full), on resume (incremental), on connectivity change (incremental), build succeeds

## Files Likely Touched

- `apps/mobile/src/lib/utils/uuid-v5.ts` — new UUID v5 utility
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — soft-delete `updated_at` fix
- `apps/mobile/src/lib/db/repositories/exercise.ts` — soft-delete `updated_at` fix
- `apps/mobile/src/lib/db/repositories/program.ts` — soft-delete `updated_at` fix (3 methods)
- `apps/mobile/src/lib/db/seed/exercises.ts` — deterministic UUID generation
- `apps/mobile/src/lib/db/database.ts` — schema v6 migration, refactored migration system
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — new
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — new
- `apps/web/src/routes/api/sync/push/+server.ts` — new
- `apps/web/src/routes/api/sync/pull/+server.ts` — new
- `apps/web/src/lib/server/sync/tables.ts` — new table mapping
- `apps/web/src/lib/server/sync/seed.ts` — new server seed utility
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — new
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — new
- `apps/mobile/src/lib/services/sync.ts` — new sync service
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — new
- `apps/mobile/src/routes/+layout.svelte` — sync lifecycle triggers
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — full sync after sign-in
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — full sync after sign-up
- `apps/mobile/package.json` — `@capacitor/network` dependency
