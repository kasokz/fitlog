---
id: T01
parent: S04
milestone: M004
provides:
  - SyncState type and getSyncState() async getter combining in-memory + Preferences state
  - clearSyncState() for sign-out cleanup (fixes cross-account timestamp leak)
  - triggerSync() UI-callable wrapper for incremental sync
  - In-memory isSyncing/lastError/lastErrorAt tracking during sync operations
key_files:
  - apps/mobile/src/lib/services/sync.ts
  - apps/mobile/src/lib/services/__tests__/sync.test.ts
  - apps/mobile/src/routes/settings/+page.svelte
key_decisions:
  - Error tracking happens in logError() (shared by pushChanges/pullChanges) so errors caught internally are still captured in sync state
  - Errors are cleared at the start of fullSync/incrementalSync, re-set by logError if push/pull fails
patterns_established:
  - Module-level syncState object for in-memory state, Preferences for persisted timestamps, getSyncState() merges both
observability_surfaces:
  - getSyncState() returns full SyncState snapshot (isSyncing, lastSyncAt, lastError, lastErrorAt)
  - Preferences keys sync_last_push_at and sync_last_pull_at persist across app restarts
  - logError() captures error message + timestamp in syncState for UI display
duration: 15m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Add sync state tracking to sync service + fix sign-out cleanup

**Evolved sync.ts from fire-and-forget to observable state with SyncState type, getSyncState()/clearSyncState()/triggerSync() exports, and wired clearSyncState() into Settings sign-out handler.**

## What Happened

Added `SyncState` interface and module-level `syncState` object tracking `isSyncing`, `lastError`, and `lastErrorAt`. Wrapped `fullSync()` and `incrementalSync()` with state tracking — `isSyncing` set true/false in try/finally, errors cleared at start and re-captured via `logError()` if push/pull fails internally. Added `getSyncState()` that reads Preferences timestamps and merges with in-memory flags, `clearSyncState()` that removes both Preferences keys and resets in-memory state, and `triggerSync()` as UI-callable wrapper. Wired `clearSyncState()` into Settings page `handleSignOut` after successful `authSignOut()`, before resetting `authState`. Added 6 new test cases covering all state transitions.

## Verification

- `pnpm --filter mobile test` — **524 tests pass** (518 existing + 6 new)
- `pnpm --filter web test` — **26 tests pass** (no web changes)
- `pnpm --filter mobile build` — compiles cleanly
- i18n: `de.json` and `en.json` both at 399 keys, zero drift
- Inspected sync.ts exports: `SyncState`, `getSyncState`, `clearSyncState`, `triggerSync` all present
- Settings `handleSignOut` calls `clearSyncState()` after successful sign-out (line 135)

## Diagnostics

- Call `getSyncState()` — returns `{ isSyncing, lastSyncAt, lastError, lastErrorAt }`
- `lastSyncAt` is the later of `sync_last_push_at` / `sync_last_pull_at` from Preferences
- `lastError` + `lastErrorAt` populated by `logError()` in push/pull error paths
- `clearSyncState()` removes Preferences keys and resets in-memory state to defaults

## Deviations

Error tracking was moved into `logError()` instead of only in the orchestration functions' catch blocks. This was necessary because `pushChanges`/`pullChanges` internally catch and swallow their errors — orchestration-level try/catch never fires for those cases. The `logError` approach is more accurate since it captures errors exactly where they occur.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/sync.ts` — Added SyncState type, syncState in-memory object, getSyncState(), clearSyncState(), triggerSync(), state tracking in fullSync/incrementalSync, error capture in logError()
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — Added 6 test cases: getSyncState defaults, persisted timestamps, isSyncing flag, lastError tracking, clearSyncState, triggerSync
- `apps/mobile/src/routes/settings/+page.svelte` — Imported clearSyncState, called in handleSignOut after successful authSignOut
- `.gsd/milestones/M004/slices/S04/S04-PLAN.md` — Added failure-path verification check, marked T01 done
