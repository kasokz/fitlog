---
id: T02
parent: S02
milestone: M004
provides:
  - POST /api/sync/push endpoint with LWW conflict resolution
  - POST /api/sync/pull endpoint with incremental and full pull modes
  - Sync table registry mapping all 8 app tables for generic push/pull
  - Server-side UUID v5 utility producing identical UUIDs to mobile client
  - Server-side seed exercise ID generator for push validation
key_files:
  - apps/web/src/lib/server/sync/tables.ts
  - apps/web/src/lib/server/sync/uuid-v5.ts
  - apps/web/src/lib/server/sync/seed.ts
  - apps/web/src/routes/api/sync/push/+server.ts
  - apps/web/src/routes/api/sync/pull/+server.ts
key_decisions:
  - Used Drizzle sql template tag with sql.identifier() for dynamic table/column names and parameterized values (no raw string interpolation)
  - Table registry defines pushColumns/pullColumns per table, keeping endpoint logic generic across all 8 tables
  - Push order in SYNC_TABLES is FK-safe (parents before children)
  - UUID v5 is a direct copy of mobile implementation rather than shared package — pragmatic for one function
  - body_weight_entries unique constraint handled via catch-and-fallback on Postgres error code 23505
patterns_established:
  - Sync endpoints use requireUserId() + try/catch with resolveError() for uniform error shape
  - Push LWW: SELECT existing by id+user_id → INSERT if new (attach user_id) → UPDATE if client newer → skip if server newer
  - Pull: query all registered tables WHERE user_id + updated_at filter, strip user_id from response
  - Test pattern for SvelteKit API routes: mock $app/server, $app/environment, $env/dynamic/private, $lib/server/db; dynamic import in beforeEach
observability_surfaces:
  - "[Sync] Push complete for user {id}: {accepted} accepted, {conflicts} conflicts" on every push
  - "[Sync] Pull complete for user {id}: {rows} rows across {tables} tables (since {ts} | full pull)" on every pull
  - "[Sync] Push: unknown table ..." warning for unrecognized table names
  - "[Sync] Push: row missing id or updated_at ..." warning for malformed rows
  - HTTP 400/401/500 responses with { status, code, message } structure via resolveError()
duration: 25m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Server-side sync push and pull API endpoints

**Built push/pull API endpoints with LWW conflict resolution, table registry for all 8 app tables, and server-side UUID v5 producing identical seed exercise IDs to mobile.**

## What Happened

Created the sync table registry (`tables.ts`) mapping all 8 app tables to their Drizzle schemas with column definitions for push acceptance and pull response. Tables are ordered for FK-safe push (parents before children).

Copied the UUID v5 implementation from mobile (`uuid-v5.ts`) — same algorithm, same output verified against the pinned test value (`Bench Press` → `b242a8fb-2ebe-55f4-b747-71b586fb5bda`). Built `seed.ts` with cached `getSeedExerciseIds()` returning a Map of all 56 seed exercise names to their deterministic UUIDs.

Push endpoint (`POST /api/sync/push`): parses `{ tables: Record<string, Row[]> }`, iterates registered tables, applies LWW per row — INSERT if new (server attaches `user_id`), UPDATE if client `updated_at` > server `updated_at`, skip (conflict) otherwise. Special handling for `body_weight_entries`: catches Postgres unique violation (23505) on `(user_id, date)` and falls back to update-if-newer. Returns `{ accepted, conflicts, server_now }`.

Pull endpoint (`POST /api/sync/pull`): parses `{ last_pull_at: string }`, queries all tables with `WHERE user_id = ? AND updated_at > ?` for incremental, or just `WHERE user_id = ?` for full pull. Strips `user_id` from all response rows. Returns `{ tables: Record<string, Row[]>, server_now }`.

Both endpoints sit behind the existing `handleApiAuth` middleware (hooks.server.ts) and use `requireUserId()` internally.

## Verification

- `pnpm --filter web test` — 26 tests pass (4 files: auth.test.ts, error.test.ts, push.test.ts, pull.test.ts)
- `pnpm --filter web build` — compiles cleanly with adapter-node
- Server-side `uuidv5("Bench Press")` produces `b242a8fb-2ebe-55f4-b747-71b586fb5bda` — matches mobile pinned value
- Push tests cover: insert new rows, LWW client wins, LWW server wins, tie → server wins, mixed accepted/conflicts count, unknown table skip, missing id/updated_at skip, body_weight_entries unique constraint fallback, server_now format
- Pull tests cover: 401 for unauthenticated, full pull (empty string), full pull (null), incremental pull, user_id stripping, empty table omission, server_now format, multiple tables

### Slice-level checks (T02 scope):
- ✅ `pnpm --filter web test` — all existing + new sync endpoint tests pass
- ✅ `pnpm --filter web build` — compiles cleanly
- ✅ `apps/web/src/routes/api/sync/__tests__/push.test.ts` — push endpoint LWW logic verified (11 tests)
- ✅ `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — pull endpoint filtering verified (8 tests)
- ⏳ `pnpm --filter mobile test` — not affected by this task (server-only changes)
- ⏳ `pnpm --filter mobile build` — not affected by this task
- ⏳ `apps/mobile/src/lib/services/__tests__/sync.test.ts` — T03 scope
- ⏳ Manual curl integration test — requires running server + Postgres (deferred to slice UAT)

## Diagnostics

- Push: check server logs for `[Sync] Push complete for user {id}` with accepted/conflict counts
- Pull: check server logs for `[Sync] Pull complete for user {id}` with row counts
- Error responses follow `{ status, code, message }` structure
- Inspect Postgres tables directly to verify pushed data landed
- POST to endpoints with curl to exercise the flow manually

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/server/sync/tables.ts` — sync table registry mapping 8 app tables to Drizzle schemas with push/pull column definitions
- `apps/web/src/lib/server/sync/uuid-v5.ts` — server-side UUID v5 (copy of mobile implementation, same output)
- `apps/web/src/lib/server/sync/seed.ts` — seed exercise ID generator with cached Map<name, uuid> for all 56 exercises
- `apps/web/src/routes/api/sync/push/+server.ts` — push endpoint with LWW conflict resolution
- `apps/web/src/routes/api/sync/pull/+server.ts` — pull endpoint with incremental and full pull modes
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — 11 tests for push LWW logic
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — 8 tests for pull filtering and user scoping
