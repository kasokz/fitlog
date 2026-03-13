---
id: T03
parent: S02
milestone: M004
provides:
  - "Client-side sync service with pushChanges(), pullChanges(), fullSync(), incrementalSync()"
  - "body_weight_entries upsert logic handling partial unique index"
  - "Sync timestamp persistence in @capacitor/preferences using server_now"
key_files:
  - "apps/mobile/src/lib/services/sync.ts"
  - "apps/mobile/src/lib/services/__tests__/sync.test.ts"
  - "apps/mobile/src/lib/services/auth-client.ts"
key_decisions:
  - "TABLE_COLUMNS registry mirrors server SYNC_TABLES for column-accurate INSERT OR REPLACE"
  - "pushChanges returns null (no-op) when zero rows changed, avoiding empty POST to server"
  - "body_weight_entries upsert: 3-step logic (match by id → match by date → insert) to respect partial unique index"
patterns_established:
  - "Sync functions catch-and-return (never throw) — consistent with auth-client.ts error pattern"
  - "All API calls include Bearer token from getStoredToken(); sync skips silently when no token"
observability_surfaces:
  - "[Sync] prefixed console logs for push/pull counts, errors, and orchestration lifecycle"
  - "Push logs: row count sent, accepted/conflict counts from server response"
  - "Pull logs: total rows upserted"
  - "Error logs include HTTP status and server error message"
duration: "20m"
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Client-side sync service with push, pull, and orchestration

**Built sync.ts with push/pull/fullSync/incrementalSync, body_weight_entries special upsert, and 12 test cases covering happy path, auth guard, and error handling.**

## What Happened

Created the client-side sync service that queries all 8 local SQLite tables, pushes changes to the server push endpoint, pulls remote changes from the pull endpoint, and upserts them locally. Push always runs before pull. Server timestamps (`server_now`) are used as high-water marks, never client clock.

The `body_weight_entries` table gets special upsert logic because of its partial unique index on `(date) WHERE deleted_at IS NULL` — the pull handler checks by id first, then by date conflict, and only inserts if neither match.

Exported `API_BASE_URL` from `auth-client.ts` so the sync service can construct endpoint URLs. All sync functions are guarded by `isSignedIn()` and silently return on failure (catch-and-log pattern).

## Verification

- `pnpm --filter mobile test` — 483 tests pass across 21 files (includes 12 new sync tests)
- `pnpm --filter mobile build` — compiles cleanly
- `pnpm --filter web test` — 26 tests pass across 4 files
- `pnpm --filter web build` — compiles cleanly
- `grep -c 'isSignedIn' apps/mobile/src/lib/services/sync.ts` → 3 (import + 2 guards)

### Slice-level checks passing after T03:
- ✅ `pnpm --filter mobile test` — all existing + new sync tests pass
- ✅ `pnpm --filter web test` — all existing + sync endpoint tests pass
- ✅ `pnpm --filter mobile build` — compiles cleanly
- ✅ `pnpm --filter web build` — compiles cleanly
- ✅ `uuid-v5.test.ts` — deterministic UUID generation verified
- ✅ `migration-v6.test.ts` — seed exercise re-ID + FK cascade verified
- ✅ `push.test.ts` — push endpoint LWW logic verified
- ✅ `pull.test.ts` — pull endpoint filtering verified
- ✅ `sync.test.ts` — client sync orchestration verified
- ⬜ Manual curl integration test — not run (requires docker + running server, deferred to T04/UAT)

## Diagnostics

- `[Sync]` log prefix for all sync operations in console
- Push: logs total rows sent, accepted/conflict counts from server response
- Pull: logs total rows upserted locally
- Errors: logs HTTP status + server error body; sync timestamps NOT updated on failure (retry-safe)
- Preferences keys: `sync_last_push_at`, `sync_last_pull_at` — inspect via Capacitor Preferences API

## Deviations

None — implementation matches plan.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/sync.ts` — new sync service (~200 lines) with push, pull, full/incremental orchestration
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — 12 test cases covering push, pull, fullSync, incrementalSync, auth guard, error handling
- `apps/mobile/src/lib/services/auth-client.ts` — exported `API_BASE_URL` (was `const`, now `export const`)
