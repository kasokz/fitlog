# S02: Sync Protocol + Two-Way Sync — UAT

**Milestone:** M004
**Written:** 2026-03-13

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Sync is inherently an integration concern — it requires a running API server, Postgres database, and mobile app interacting over HTTP. Unit tests verify logic; UAT verifies the round-trip.

## Preconditions

1. Docker running: `docker compose up -d` (Postgres)
2. Server running: `cd apps/web && pnpm db:push && pnpm dev` (SvelteKit API on localhost:5174)
3. Mobile app running: `pnpm --filter mobile dev` or built and running on device/simulator
4. A user account created (sign-up flow from S01)

## Smoke Test

Sign in on mobile → create a workout session with at least one set → wait a few seconds → query Postgres `workout_sessions` and `workout_sets` tables → the rows appear with the user's `user_id`.

## Test Cases

### 1. Push: local changes appear in Postgres

1. Sign in on mobile
2. Create a new program with a training day and exercise assignment
3. Wait for sync (automatic on sign-in) or trigger by backgrounding and resuming the app
4. Query Postgres: `SELECT * FROM programs WHERE user_id = '<user_id>'`
5. **Expected:** Program, training day, and exercise assignment rows present in Postgres with correct data

### 2. Pull: server changes appear on device

1. Sign in on mobile, let initial sync complete
2. Directly INSERT or UPDATE a row in Postgres (e.g., update a program name)
3. Background and resume the app (triggers incremental sync)
4. **Expected:** The updated program name appears on the mobile app

### 3. Full sync on sign-in (new device scenario)

1. Sign in on mobile device A, create workout data, let it sync
2. Sign out on device A
3. Sign in on a different device/simulator (device B) with the same account
4. **Expected:** All workout data from device A appears on device B after sign-in full sync

### 4. Offline changes queue and sync on reconnect

1. Sign in on mobile
2. Enable airplane mode
3. Log a workout (weight, reps, RIR)
4. Disable airplane mode
5. Wait for connectivity restore sync trigger
6. **Expected:** Workout data appears in Postgres after reconnect

### 5. LWW conflict resolution

1. Sign in on mobile, sync to ensure data is current
2. Enable airplane mode on mobile
3. Edit a program name on mobile (creates local change with updated_at = T1)
4. Directly UPDATE the same program in Postgres with a newer updated_at (T2 > T1)
5. Disable airplane mode, let sync run
6. **Expected:** Server's newer version wins — mobile shows the Postgres value after pull. Push of the stale mobile change is rejected (conflict count > 0 in server logs).

### 6. Seed exercise deterministic UUIDs

1. Fresh install (or clear app data)
2. Check a known seed exercise ID (e.g., "Bench Press")
3. **Expected:** UUID is `b242a8fb-2ebe-55f4-b747-71b586fb5bda` — matches pinned value from tests

### 7. Body weight entry sync with date uniqueness

1. Sign in on mobile
2. Log body weight for today's date
3. Let it sync to server
4. Log a different body weight for the same date on the server (direct Postgres UPDATE)
5. Resume the app to trigger pull
6. **Expected:** Mobile shows the server's value (LWW). No duplicate entries for the same date.

## Edge Cases

### Sign-up with existing local data (offline-to-account transition)

1. Use the app without an account — create programs, log workouts
2. Sign up for a new account
3. **Expected:** Full sync pushes all existing local data to server. Query Postgres to verify all data present with the new user's `user_id`.

### Sync with no changes

1. Sign in, let full sync complete
2. Background and resume the app (triggers incremental sync)
3. **Expected:** Sync completes quickly with 0 rows pushed and 0 rows pulled. No errors in console. `[Sync]` logs confirm no-op.

### Soft-deleted rows sync correctly

1. Sign in, create a program, let it sync
2. Delete the program on mobile (soft-delete)
3. Wait for sync
4. **Expected:** Postgres row has `deleted_at` set (not removed). Pull to another device would receive the soft-deleted row.

## Failure Signals

- Postgres tables empty after sign-in + data creation + sync trigger → push is failing
- Server logs show no `[Sync]` entries → endpoints not being called
- `sync_last_push_at` or `sync_last_pull_at` in Preferences not advancing → sync errors occurring silently
- Console shows `[Sync]` errors with HTTP status codes → auth or server issues
- Duplicate body weight entries for same date → upsert logic broken
- Seed exercise UUID doesn't match `b242a8fb-...` → UUID v5 implementation diverged between client/server

## Requirements Proved By This UAT

- R025 (Cloud Sync Infrastructure) — sync API operational with LWW conflict resolution
- R027 (Cross-Device Sync) — data flows between devices via push/pull protocol
- R028 (Backup/Restore) — full sync on new device sign-in delivers all data
- R012 (Sync-Ready Data Model) — updated_at, soft-delete, and UUIDs fully exercised by sync

## Not Proven By This UAT

- R029 (Data Export) — S03 scope, no export functionality in S02
- Sync status UI — S04 scope, sync runs silently without user-visible indicators
- Scale performance — no load testing with thousands of rows; pagination not implemented
- Auth token refresh after long offline periods — Better Auth token expiry handling not explicitly tested
- Real multi-device simultaneous editing under network partitions — tested as sequential offline/online scenarios

## Notes for Tester

- Server logs (`[Sync] Push complete...`, `[Sync] Pull complete...`) are the most reliable signal for sync activity. Watch the terminal running the web dev server.
- Preferences keys `sync_last_push_at` and `sync_last_pull_at` can be inspected via browser devtools (web) or Capacitor Preferences debug tools (native) to verify sync timestamps are advancing.
- The pull endpoint is POST (not GET) despite returning data — the request body carries `last_pull_at` and table filters.
- If testing on a physical device, ensure it can reach the dev server's IP (not localhost). Update `API_BASE_URL` in `auth-client.ts` if needed.
