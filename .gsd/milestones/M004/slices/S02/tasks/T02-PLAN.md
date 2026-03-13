---
estimated_steps: 6
estimated_files: 8
---

# T02: Server-side sync push and pull API endpoints

**Slice:** S02 — Sync Protocol + Two-Way Sync
**Milestone:** M004

## Description

Build the two server-side sync endpoints that form the sync hub. `POST /api/sync/push` receives client rows and applies them with LWW (last-write-wins per row based on `updated_at`). `POST /api/sync/pull` returns rows newer than the client's last pull timestamp. Both sit behind the auth guard from S01 and use `requireUserId()`.

These are the first API routes in `apps/web/src/routes/api/` (beyond Better Auth's own `/api/auth/*` routes).

Also includes a server-side seed exercise utility using the same UUID v5 function from T01, so the server can produce identical seed exercise UUIDs.

## Steps

1. Create `apps/web/src/lib/server/sync/tables.ts` — a table registry mapping table names (matching SQLite names) to Drizzle schema objects. For each table, define which columns to accept on push and return on pull. Include all 8 app tables. Mark `user_id` as server-attached (not accepted from client). This avoids repeating per-table logic in the endpoints.

2. Copy or share the UUID v5 utility for server use. Since the web app runs in Node (which also has SubtleCrypto via `globalThis.crypto.subtle`), the same implementation works. Either: import from a shared package path, or create `apps/web/src/lib/server/sync/uuid-v5.ts` with the same implementation. Sharing via `@repo/` would be cleanest but might be overengineering for one function — a copy is fine for now.

3. Create `apps/web/src/lib/server/sync/seed.ts` — a function `getSeedExerciseIds()` that returns a `Map<string, string>` (name → deterministic UUID) for all seed exercises. Used by push endpoint to recognize seed exercise IDs as valid. Uses the UUID v5 function from step 2.

4. Implement `POST /api/sync/push` at `apps/web/src/routes/api/sync/push/+server.ts`:
   - `requireUserId()` for auth
   - Parse request body: `{ tables: Record<string, Row[]> }`
   - For each table in the registry, for each row in the payload:
     - Query existing row by `id` AND `user_id` (server-side scope)
     - If no existing row → INSERT with `user_id` attached
     - If existing and client `updated_at` > server `updated_at` → UPDATE
     - If existing and client `updated_at` <= server `updated_at` → skip (conflict)
   - For `body_weight_entries`: handle the `(user_id, date)` unique index — if INSERT fails on unique constraint, fall back to UPDATE-if-newer logic keyed on `(user_id, date)` instead of just `id`
   - Special case for exercises: seed exercises (`is_custom = 0`) are per-user copies on the server (D109). First push creates the user's copy.
   - Return `{ accepted: number, conflicts: number, server_now: new Date().toISOString() }`
   - Wrap in try/catch with `resolveError()` pattern

5. Implement `POST /api/sync/pull` at `apps/web/src/routes/api/sync/pull/+server.ts`:
   - `requireUserId()` for auth
   - Parse request body: `{ last_pull_at: string }` (ISO timestamp, or empty string for full pull)
   - For each table in the registry: `SELECT * FROM table WHERE user_id = ? AND updated_at > ?`
   - If `last_pull_at` is empty/null, return ALL rows for the user (full pull)
   - Return `{ tables: Record<string, Row[]>, server_now: new Date().toISOString() }`
   - Strip `user_id` from response rows (client doesn't have `user_id` column)
   - Wrap in try/catch with `resolveError()` pattern

6. Write tests:
   - `apps/web/src/routes/api/sync/__tests__/push.test.ts` — test LWW logic: insert new row, update when client newer, skip when server newer, count accepted/conflicts. Mock Drizzle db.
   - `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — test incremental pull (only rows after timestamp), full pull (no timestamp), user scoping (no cross-user data). Mock Drizzle db.

## Must-Haves

- [ ] Push endpoint inserts new rows and attaches `user_id`
- [ ] Push endpoint applies LWW: client wins only if `updated_at` is newer
- [ ] Push endpoint returns `server_now` for client to use as next `last_push_at`
- [ ] Pull endpoint returns only rows belonging to authenticated user
- [ ] Pull endpoint filters by `updated_at > last_pull_at` for incremental pulls
- [ ] Pull endpoint returns all user rows when no `last_pull_at` provided (full pull)
- [ ] Pull response strips `user_id` from rows
- [ ] Both endpoints use `requireUserId()` and return 401 for unauthenticated requests
- [ ] `body_weight_entries` push handles `(user_id, date)` unique constraint
- [ ] Server-side UUID v5 produces same UUIDs as client-side for seed exercises

## Verification

- `pnpm --filter web test` — all existing + new sync tests pass
- `pnpm --filter web build` — compiles cleanly
- Manual curl test against running server:
  - `curl -X POST /api/sync/push -H "Authorization: Bearer ..." -d '{"tables":{"exercises":[...]}}'` → 200 with accepted count
  - `curl -X POST /api/sync/pull -H "Authorization: Bearer ..." -d '{"last_pull_at":""}'` → 200 with tables data
  - Unauthenticated requests → 401

## Observability Impact

- Signals added: `[Sync]` prefixed server-side console logs on push (accepted/conflict counts) and pull (row counts per table)
- How a future agent inspects this: check Postgres tables directly, or POST to sync endpoints with curl
- Failure state exposed: HTTP 400/401/500 with structured `{ status, code, message }` via `resolveError()`

## Inputs

- `apps/web/src/lib/server/db/app.schema.ts` — Drizzle table definitions for all 8 app tables
- `apps/web/src/lib/server/auth.ts` — `requireUserId()` utility
- `apps/web/src/lib/server/error.ts` — `AppError` + `resolveError()` pattern
- `apps/web/src/hooks.server.ts` — auth middleware resolves session before API routes
- T01 output: UUID v5 utility implementation to replicate on server side
- S02 research: push/pull endpoint design, LWW logic, table sync scope (D107)

## Expected Output

- `apps/web/src/lib/server/sync/tables.ts` — table registry for sync
- `apps/web/src/lib/server/sync/uuid-v5.ts` — server-side UUID v5 (same algo as client)
- `apps/web/src/lib/server/sync/seed.ts` — seed exercise ID generator
- `apps/web/src/routes/api/sync/push/+server.ts` — push endpoint
- `apps/web/src/routes/api/sync/pull/+server.ts` — pull endpoint
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — push LWW tests
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — pull filter tests
