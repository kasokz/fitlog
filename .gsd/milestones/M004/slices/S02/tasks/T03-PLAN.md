---
estimated_steps: 7
estimated_files: 3
---

# T03: Client-side sync service with push, pull, and orchestration

**Slice:** S02 — Sync Protocol + Two-Way Sync
**Milestone:** M004

## Description

Build the client-side sync service that reads local SQLite changes, pushes them to the server, pulls remote changes, and upserts them locally. The service manages sync state (timestamps) in `@capacitor/preferences` and orchestrates full sync (after sign-in) and incremental sync (on resume/connectivity).

Key design: push before pull (always), server timestamps for high-water marks (not client clock), catch-and-log error pattern (sync failure is silent, retried on next trigger), special handling for `body_weight_entries` upsert due to partial unique index.

## Steps

1. Create `apps/mobile/src/lib/services/sync.ts` with module-level constants:
   - Import `getStoredToken`, `isSignedIn` from `auth-client.ts`
   - Import `API_BASE_URL` from `auth-client.ts` (export it there if not already exported)
   - Import `dbQuery`, `dbExecute` from `database.ts`
   - Define `SYNC_TABLES` constant: ordered list of table names to sync — `['exercises', 'programs', 'training_days', 'exercise_assignments', 'mesocycles', 'workout_sessions', 'workout_sets', 'body_weight_entries']`
   - Define Preferences keys: `sync_last_push_at`, `sync_last_pull_at`
   - Define log helper: `[Sync]` prefix

2. Implement `pushChanges(lastPushAt: string | null)`:
   - For exercises table: query `SELECT * FROM exercises WHERE updated_at > ? AND is_custom = 1` (only custom exercises; seed exercises sync via deterministic UUIDs). Actually — research says seed exercises push too (each user gets their own copy on server). So: `SELECT * FROM exercises WHERE updated_at > ?` for all exercises. On first push (no `lastPushAt`), select ALL rows.
   - For other tables: `SELECT * FROM ${table} WHERE updated_at > ?` (parameterized, but table name interpolated safely from constant array)
   - Build payload: `{ tables: { [tableName]: rows[] } }`
   - POST to `${API_BASE_URL}/api/sync/push` with Bearer token
   - On success: return `server_now` from response
   - On failure: log error, return null

3. Implement `pullChanges(lastPullAt: string | null)`:
   - POST to `${API_BASE_URL}/api/sync/pull` with `{ last_pull_at: lastPullAt || '' }` and Bearer token
   - On success: for each table in response, upsert rows into local SQLite
   - Standard tables: `INSERT OR REPLACE INTO ${table} (...all columns...) VALUES (?, ?, ...)`
   - `body_weight_entries` special case: for each pulled row, SELECT existing by `id`. If exists, UPDATE. If not exists, check for active row with same date (`SELECT id FROM body_weight_entries WHERE date = ? AND deleted_at IS NULL`). If date conflict exists and pulled row is newer, UPDATE the conflicting row's fields. Otherwise INSERT.
   - Return `server_now` from response
   - On failure: log error, return null

4. Implement `fullSync()`:
   - Guard: `if (!await isSignedIn()) return`
   - Push all: `const pushResult = await pushChanges(null)` (null = no filter, push everything)
   - If push succeeded: store `pushResult` as `sync_last_push_at` in Preferences
   - Pull all: `const pullResult = await pullChanges(null)` (null = no filter, pull everything)
   - If pull succeeded: store `pullResult` as `sync_last_pull_at` in Preferences
   - Log summary: `[Sync] Full sync complete`

5. Implement `incrementalSync()`:
   - Guard: `if (!await isSignedIn()) return`
   - Read `sync_last_push_at` and `sync_last_pull_at` from Preferences
   - Push changed: `const pushResult = await pushChanges(lastPushAt)`
   - If push succeeded: update `sync_last_push_at`
   - Pull changed: `const pullResult = await pullChanges(lastPullAt)`
   - If pull succeeded: update `sync_last_pull_at`
   - Log summary: `[Sync] Incremental sync complete`

6. Export `API_BASE_URL` from `auth-client.ts` if not already exported (sync service needs it).

7. Write `apps/mobile/src/lib/services/__tests__/sync.test.ts`:
   - Mock `fetch` (global), `@capacitor/preferences`, `auth-client` (isSignedIn, getStoredToken), and `database` (dbQuery, dbExecute)
   - Test `pushChanges`: queries all sync tables, sends correct payload, returns server_now
   - Test `pullChanges`: sends correct request, upserts rows via dbExecute
   - Test `fullSync`: calls push then pull, stores timestamps
   - Test `incrementalSync`: reads timestamps from Preferences, calls push/pull with them
   - Test guard: when not signed in, sync functions return early without API calls
   - Test error handling: fetch failure → logs error, returns without storing timestamps

## Must-Haves

- [ ] `pushChanges()` queries all 8 sync tables and POSTs to `/api/sync/push`
- [ ] `pullChanges()` POSTs to `/api/sync/pull` and upserts rows into local SQLite
- [ ] `body_weight_entries` upsert handles partial unique index correctly
- [ ] `fullSync()` pushes all data then pulls all data (no timestamp filter)
- [ ] `incrementalSync()` uses stored timestamps for delta sync
- [ ] Sync timestamps stored in `@capacitor/preferences` using `server_now` (not client clock)
- [ ] All sync functions guarded by `isSignedIn()` check
- [ ] Errors caught and logged, never thrown — sync failure is silent
- [ ] Bearer token included in all API requests
- [ ] Tests cover happy path, auth guard, and error handling

## Verification

- `pnpm --filter mobile test` — all existing + new sync tests pass
- `pnpm --filter mobile build` — compiles cleanly
- Manual review: `grep -c 'isSignedIn' apps/mobile/src/lib/services/sync.ts` confirms auth guard in place

## Inputs

- `apps/mobile/src/lib/services/auth-client.ts` — `getStoredToken()`, `isSignedIn()`, `API_BASE_URL`
- `apps/mobile/src/lib/db/database.ts` — `dbQuery()`, `dbExecute()`
- `apps/mobile/src/lib/db/schema.sql` — column lists for INSERT OR REPLACE statements
- T02 output: server push/pull endpoint contracts (request/response shapes)
- S02 research: sync orchestration design, body_weight_entries special handling, D107 table scope

## Expected Output

- `apps/mobile/src/lib/services/sync.ts` — full sync service (~150-200 lines)
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — 8-12 test cases
- Modified: `apps/mobile/src/lib/services/auth-client.ts` — export `API_BASE_URL` if needed
