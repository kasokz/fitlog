---
estimated_steps: 5
estimated_files: 3
---

# T01: Add sync state tracking to sync service + fix sign-out cleanup

**Slice:** S04 — Sync Status UI + Account Settings
**Milestone:** M004

## Description

Evolve `sync.ts` from fire-and-forget to observable state. Add an in-memory state object tracking `isSyncing`, `lastError`, and `lastErrorAt`. Expose `getSyncState()` async getter that combines in-memory flags with persisted Preferences timestamps. Add `clearSyncState()` for sign-out cleanup. Add `triggerSync()` as UI-callable wrapper. Wire `clearSyncState()` into the Settings sign-out flow to fix the cross-account timestamp leak bug.

## Steps

1. **Add in-memory sync state and type** — Define `SyncState` interface (`isSyncing: boolean`, `lastSyncAt: string | null`, `lastError: string | null`, `lastErrorAt: string | null`). Add module-level `syncState` object with `isSyncing`, `lastError`, `lastErrorAt` fields (timestamps come from Preferences on read).

2. **Wrap sync orchestration with state tracking** — In `fullSync()` and `incrementalSync()`, set `syncState.isSyncing = true` at start, `false` at end (in finally). On error, set `syncState.lastError` and `syncState.lastErrorAt`. On success, clear `lastError`/`lastErrorAt`. The existing catch-and-log behavior stays — state tracking is additive.

3. **Implement `getSyncState()`, `clearSyncState()`, `triggerSync()`** — `getSyncState()`: read `sync_last_push_at` and `sync_last_pull_at` from Preferences, take the later as `lastSyncAt`, combine with in-memory `isSyncing`/`lastError`/`lastErrorAt`. Export `SyncState` type. `clearSyncState()`: remove both Preferences keys, reset in-memory state. `triggerSync()`: call `incrementalSync()` (for UI "Sync Now" button).

4. **Wire `clearSyncState()` into sign-out** — In `apps/mobile/src/routes/settings/+page.svelte`, import `clearSyncState` from sync service. In `handleSignOut`, call `clearSyncState()` after successful `authSignOut()`, before resetting `authState`.

5. **Add unit tests** — In existing `sync.test.ts`, add tests for: `getSyncState()` returns defaults when no state; `getSyncState()` reads persisted timestamps; `isSyncing` flag set during sync; `lastError` captured on failure; `clearSyncState()` removes all state; `triggerSync()` calls `incrementalSync`.

## Must-Haves

- [ ] `SyncState` type exported from `sync.ts`
- [ ] `getSyncState()` returns typed state combining in-memory + Preferences
- [ ] `clearSyncState()` removes Preferences keys and resets in-memory state
- [ ] `triggerSync()` wraps `incrementalSync()` for UI use
- [ ] `isSyncing` flag accurate during sync operations
- [ ] `lastError` + `lastErrorAt` captured on sync failure, cleared on success
- [ ] Settings `handleSignOut` calls `clearSyncState()` on success
- [ ] All existing sync tests still pass
- [ ] New tests cover state transitions

## Verification

- `pnpm --filter mobile test` — all tests pass including new sync state tests
- Inspect `sync.ts` exports: `getSyncState`, `clearSyncState`, `triggerSync`, `SyncState` type
- Inspect Settings `handleSignOut` for `clearSyncState()` call

## Observability Impact

- Signals added: `isSyncing`, `lastError`, `lastErrorAt` tracked in-memory; sync success/failure transitions captured
- How a future agent inspects this: call `getSyncState()` — returns full snapshot; check Preferences keys `sync_last_push_at`, `sync_last_pull_at`
- Failure state exposed: `lastError` string + `lastErrorAt` timestamp available via `getSyncState()`

## Inputs

- `apps/mobile/src/lib/services/sync.ts` — existing sync service with `fullSync`, `incrementalSync`, `pushChanges`, `pullChanges`
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — existing 12 tests with mock setup
- `apps/mobile/src/routes/settings/+page.svelte` — existing sign-out handler
- S02 Summary: sync timestamps stored as `sync_last_push_at`, `sync_last_pull_at` in Preferences

## Expected Output

- `apps/mobile/src/lib/services/sync.ts` — extended with `SyncState` type, `getSyncState()`, `clearSyncState()`, `triggerSync()`, in-memory state tracking
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — ~6 new test cases for state management
- `apps/mobile/src/routes/settings/+page.svelte` — `clearSyncState()` call in sign-out handler
