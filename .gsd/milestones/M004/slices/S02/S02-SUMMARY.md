---
id: S02
parent: M004
milestone: M004
provides:
  - Two-way sync protocol (push/pull) with LWW conflict resolution
  - Server-side sync API endpoints (POST /api/sync/push, POST /api/sync/pull)
  - Client-side sync service with full and incremental sync orchestration
  - Deterministic UUID v5 for all 56 seed exercises (client + server)
  - Schema v6 migration re-IDing seed exercises with FK cascade
  - Soft-delete updated_at fix across all 5 repositories
  - Automatic sync triggers on sign-in, resume, and connectivity restore
  - @capacitor/network for connectivity detection
requires:
  - slice: S01
    provides: Auth state (isSignedIn, getStoredToken, API_BASE_URL), API server with Drizzle + Postgres, requireUserId(), AppError + resolveError()
affects:
  - S04
key_files:
  - apps/mobile/src/lib/utils/uuid-v5.ts
  - apps/mobile/src/lib/db/migrations/v6-deterministic-exercise-ids.ts
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/services/sync.ts
  - apps/web/src/lib/server/sync/tables.ts
  - apps/web/src/routes/api/sync/push/+server.ts
  - apps/web/src/routes/api/sync/pull/+server.ts
  - apps/mobile/src/routes/+layout.svelte
key_decisions:
  - D114: Code-based migration system after SQL DDL
  - D115: UUID v5 zero-dependency via SubtleCrypto SHA-1
  - D116: Per-user seed exercise copies on server
  - D117: Sync error handling catch-and-log, never throw
  - D118: Drizzle sql template tag with sql.identifier() for dynamic table/column references (no raw string interpolation)
  - D119: body_weight_entries unique constraint handled via catch-23505-fallback on push, 3-step upsert on pull
  - D120: Server timestamps (server_now) as sync high-water marks, never client clock
patterns_established:
  - Sync table registry (SYNC_TABLES on server, TABLE_COLUMNS on client) maps all 8 tables for generic push/pull
  - Push LWW: SELECT by id+user_id → INSERT if new → UPDATE if client newer → skip if server newer
  - Pull: query WHERE user_id + updated_at filter, strip user_id from response
  - Fire-and-forget sync calls with .catch(() => {}) for non-blocking lifecycle hooks
  - SvelteKit API route test pattern: mock $app/server, $app/environment, $env/dynamic/private, $lib/server/db; dynamic import in beforeEach
observability_surfaces:
  - "[Sync]" prefixed console logs for all push/pull operations (counts, errors, timing)
  - "[DB] Running v6 migration..." and "[DB] v6 migration complete" for schema migration
  - Push/pull endpoints return structured response with accepted/conflict counts and server_now
  - Sync timestamps in @capacitor/preferences (sync_last_push_at, sync_last_pull_at) for inspection
  - HTTP error responses follow { status, code, message } structure via resolveError()
drill_down_paths:
  - .gsd/milestones/M004/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M004/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M004/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M004/slices/S02/tasks/T04-SUMMARY.md
duration: 80m
verification_result: passed
completed_at: 2026-03-13
---

# S02: Sync Protocol + Two-Way Sync

**Full two-way sync between mobile SQLite and server Postgres — deterministic seed exercise UUIDs, LWW conflict resolution, automatic lifecycle triggers, and schema v6 migration with FK cascade.**

## What Happened

Four tasks shipped the complete sync pipeline:

**T01** fixed three foundational issues. All 5 soft-delete UPDATE statements now set `updated_at`, ensuring deletions propagate through sync. A zero-dependency UUID v5 utility using SubtleCrypto SHA-1 replaced `crypto.randomUUID()` in seed exercises, producing identical UUIDs from exercise names across all environments. Schema v6 migration re-IDs existing random seed exercise UUIDs to deterministic ones, cascading to `exercise_assignments.exercise_id` and `workout_sets.exercise_id` in a transaction. The code-based migration pattern (version-guarded functions after SQL DDL) established a scalable approach for future data migrations.

**T02** built the server-side sync API. A sync table registry maps all 8 app tables to Drizzle schema objects with column definitions for generic push/pull. The push endpoint (`POST /api/sync/push`) applies LWW per row — INSERT if new (attaching `user_id`), UPDATE if client `updated_at` > server `updated_at`, skip otherwise. The `body_weight_entries` unique constraint on `(user_id, date)` is handled by catching Postgres error code 23505 and falling back to update-if-newer. The pull endpoint (`POST /api/sync/pull`) returns rows newer than `last_pull_at`, stripping `user_id` from responses. Server-side UUID v5 produces identical seed exercise IDs to the mobile client.

**T03** implemented the client-side sync service. `pushChanges()` queries all 8 local tables for rows changed since `last_push_at` and POSTs them to the server. `pullChanges()` requests rows from the server and upserts them locally, with special 3-step logic for `body_weight_entries` (match by id → match by date → insert) to respect the partial unique index. `fullSync()` pushes all then pulls all. `incrementalSync()` uses persisted timestamps from `@capacitor/preferences`. All functions are guarded by `isSignedIn()` and catch-and-log errors silently. Server timestamps (`server_now`) drive high-water marks — never client clock.

**T04** wired sync into app lifecycle. Installed `@capacitor/network` for connectivity detection. Added `incrementalSync()` on app mount, on resume, and on `networkStatusChange` when connected. Added `fullSync()` after successful sign-in and sign-up. All calls are fire-and-forget (`.catch(() => {})`) to never block UI.

## Verification

- `pnpm --filter mobile test` — 483 tests pass (465 existing + 18 new across uuid-v5, migration-v6, and sync service tests)
- `pnpm --filter web test` — 26 tests pass (7 existing + 19 new across push and pull endpoint tests)
- `pnpm --filter mobile build` — compiles cleanly
- `pnpm --filter web build` — compiles cleanly
- `uuid-v5.test.ts` — 6 tests: determinism, uniqueness, format, pinned value, empty string, unicode
- `migration-v6.test.ts` — 5 tests: FK cascade, custom exercises untouched, idempotent skip, empty DB, rollback on error
- `push.test.ts` — 11 tests: insert, LWW client wins, LWW server wins, tie handling, body_weight_entries unique constraint, malformed row skip
- `pull.test.ts` — 8 tests: auth guard, full/incremental pull, user_id stripping, empty table omission, multiple tables
- `sync.test.ts` — 12 tests: push, pull, fullSync, incrementalSync, auth guard, error handling

## Requirements Advanced

- R025 (Cloud Sync Infrastructure) — Sync API endpoints operational with LWW conflict resolution
- R027 (Cross-Device Sync) — Push/pull protocol enables data flow between devices via server
- R028 (Backup/Restore) — Full sync on sign-in delivers all data to a new device
- R012 (Sync-Ready Data Model) — `updated_at` now exercised by sync for change tracking; soft-delete propagation fixed

## Requirements Validated

- None yet — requires live two-device integration test for full validation (UAT)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- T04: Skipped explicit `isSignedIn()` guards in sync callers — sync functions already guard internally (return early when no token), making caller-side guards redundant.

## Known Limitations

- No pagination on push/pull — initial full sync on a device with years of data could be slow. Acceptable for now; pagination can be added to the existing endpoints without protocol changes.
- No sync progress reporting to UI — sync runs silently. S04 will wire sync state to a status indicator.
- Server uses Drizzle's `sql.identifier()` for dynamic table names — safe but relies on the table registry being the single source of truth for valid table names.
- Client clock is never used for sync high-water marks (server_now is authoritative), but LWW comparison on `updated_at` still depends on row-level timestamps which originate from client clocks. Extreme clock skew could cause unexpected overwrites.

## Follow-ups

- S04 will consume sync service state (last sync time, in-progress, errors) for the sync status UI
- S05 will add i18n keys for any sync-related user-facing strings
- Pagination for large datasets should be considered if performance testing reveals issues

## Files Created/Modified

- `apps/mobile/src/lib/utils/uuid-v5.ts` — UUID v5 generator using SubtleCrypto SHA-1
- `apps/mobile/src/lib/db/migrations/v6-deterministic-exercise-ids.ts` — v6 migration with FK cascade
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — 6 test cases
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — 5 test cases
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — soft-delete updated_at fix
- `apps/mobile/src/lib/db/repositories/exercise.ts` — soft-delete updated_at fix
- `apps/mobile/src/lib/db/repositories/program.ts` — 3 soft-delete updated_at fixes
- `apps/mobile/src/lib/db/seed/exercises.ts` — deterministic UUID v5 for seed exercises
- `apps/mobile/src/lib/db/database.ts` — schema v6, code-based migration runner
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — version expectation updated
- `apps/mobile/src/lib/services/sync.ts` — client-side sync service (~200 lines)
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — 12 test cases
- `apps/mobile/src/lib/services/auth-client.ts` — exported API_BASE_URL
- `apps/mobile/src/routes/+layout.svelte` — sync triggers on mount, resume, connectivity
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — fullSync() after sign-in
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — fullSync() after sign-up
- `apps/mobile/package.json` — @capacitor/network dependency
- `apps/web/src/lib/server/sync/tables.ts` — sync table registry for 8 app tables
- `apps/web/src/lib/server/sync/uuid-v5.ts` — server-side UUID v5
- `apps/web/src/lib/server/sync/seed.ts` — seed exercise ID generator
- `apps/web/src/routes/api/sync/push/+server.ts` — push endpoint with LWW
- `apps/web/src/routes/api/sync/pull/+server.ts` — pull endpoint with incremental/full modes
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — 11 test cases
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — 8 test cases

## Forward Intelligence

### What the next slice should know
- Sync service exports `fullSync()` and `incrementalSync()` from `apps/mobile/src/lib/services/sync.ts` — S04 needs to expose sync state (last sync time, in-progress flag, errors) to the UI, which means the sync service may need to evolve from fire-and-forget to returning/emitting status.
- `API_BASE_URL` is exported from `auth-client.ts` as a shared constant — any new API calls should import from there.
- Server-side sync endpoints are at `POST /api/sync/push` and `POST /api/sync/pull` — both require Bearer auth via `requireUserId()`.

### What's fragile
- `body_weight_entries` upsert logic is the most complex part of both push (catch-23505 fallback) and pull (3-step match). Any changes to the partial unique index or date handling should re-verify sync behavior.
- The sync table registries (server `SYNC_TABLES` and client `TABLE_COLUMNS`) must stay in sync manually — no codegen or shared type ensures they match. Adding a new table requires updating both.

### Authoritative diagnostics
- `[Sync]` prefixed console logs show exact push/pull counts and errors — grep for these first when debugging sync issues.
- `sync_last_push_at` and `sync_last_pull_at` in Preferences show the last successful sync timestamps — if these aren't advancing, sync is failing silently.
- Push/pull HTTP responses include `server_now` — compare with Preferences timestamps to verify sync state progression.

### What assumptions changed
- Original plan said `GET /api/sync/pull` — implementation uses `POST /api/sync/pull` because the request body includes `last_pull_at` timestamp and table list. Functionally equivalent, avoids URL parameter encoding issues with timestamps.
