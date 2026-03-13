# S04: Sync Status UI + Account Settings

**Goal:** Sync state is visible to the user (last synced, in-progress, errors). Account section enhanced. Sign-out clears sync timestamps.
**Demo:** Open Settings while signed in → see sync status section showing last sync time or "Never synced." Tap "Sync Now" → spinner → updated timestamp. Sign out → sign in as different user → sync timestamps are fresh (no cross-account leak).

## Must-Haves

- `sync.ts` exposes `getSyncState()` returning `{ isSyncing, lastSyncAt, lastError, lastErrorAt }`
- `sync.ts` exposes `clearSyncState()` that removes sync Preferences keys
- `sync.ts` exposes `triggerSync()` that runs `incrementalSync()` and updates in-memory state
- In-memory `isSyncing` flag set during sync operations, `lastError` captured on failure
- `clearSyncState()` called during sign-out flow (fixes cross-account timestamp leak)
- `SyncStatusSection.svelte` component shows: last sync time (relative), syncing spinner, error with retry, "Never synced" state
- Sync status section visible in Settings only when signed in, between Account and Subscription sections
- Manual "Sync Now" button triggers sync and updates displayed state after completion
- Relative time formatting uses `Intl.RelativeTimeFormat` with current paraglide locale
- ~10-12 new i18n keys in `de.json` and `en.json`
- All existing tests pass

## Verification

- `pnpm --filter mobile test` — all existing + new sync state tests pass
- `pnpm --filter web test` — all existing tests pass (no web changes)
- `pnpm --filter mobile build` — compiles cleanly
- i18n: `de.json` and `en.json` have identical key counts, zero drift
- `getSyncState()` returns `lastError` and `lastErrorAt` after a failed sync — verifiable via unit test asserting error fields are populated on failure and cleared on success

## Observability / Diagnostics

- Runtime signals: `[Sync]` prefixed logs already in place; sync state transitions (syncing start/end, error capture) are implicit via the in-memory state object
- Inspection surfaces: `getSyncState()` returns full sync state for debugging; `sync_last_push_at` and `sync_last_pull_at` in Preferences remain the persistent ground truth
- Failure visibility: `lastError` + `lastErrorAt` captured in sync state; surfaced in SyncStatusSection as user-visible error message with retry action

## Integration Closure

- Upstream surfaces consumed: `sync.ts` (S02), `auth-client.ts` (S01), Settings page (S01/S03)
- New wiring introduced: `clearSyncState()` called from Settings sign-out handler; `SyncStatusSection` added to Settings page
- What remains before milestone is truly usable: S05 (i18n verification for all S01-S04 strings)

## Tasks

- [x] **T01: Add sync state tracking to sync service + fix sign-out cleanup** `est:30m`
  - Why: Sync service is fire-and-forget with no observable state. UI needs `getSyncState()` to display status. Sign-out must clear sync timestamps to prevent cross-account data leak.
  - Files: `apps/mobile/src/lib/services/sync.ts`, `apps/mobile/src/lib/services/__tests__/sync.test.ts`, `apps/mobile/src/routes/settings/+page.svelte`
  - Do: Add in-memory `syncState` object (`isSyncing`, `lastError`, `lastErrorAt`). Wrap `fullSync`/`incrementalSync` with state tracking (set `isSyncing=true` before, `false` after; capture errors). Add `getSyncState()` async getter (reads in-memory flags + Preferences timestamps, returns typed state). Add `clearSyncState()` to remove `sync_last_push_at`/`sync_last_pull_at` from Preferences and reset in-memory state. Add `triggerSync()` that calls `incrementalSync()` and returns. Wire `clearSyncState()` into Settings page `handleSignOut`. Add unit tests for `getSyncState`, `clearSyncState`, and state transitions during sync.
  - Verify: `pnpm --filter mobile test` passes with new tests
  - Done when: `getSyncState()` returns correct state before/during/after sync; `clearSyncState()` removes all sync state; sign-out handler calls `clearSyncState()`

- [x] **T02: Build SyncStatusSection component + i18n keys** `est:35m`
  - Why: Users need to see sync status and have a manual sync trigger. New UI strings need i18n keys in both locales.
  - Files: `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte`, `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Create `SyncStatusSection.svelte` — loads sync state on mount via `$effect` + `getSyncState()`. Shows: section header, last sync time as relative string via `Intl.RelativeTimeFormat` with `getLocale()`, "Never synced" when no timestamps, `LoaderCircle` spinner when syncing, error `Alert` with retry button when `lastError` is set, "Sync Now" `Button` that calls `triggerSync()` then re-reads state. Use `Badge` for status indicator (synced/error/syncing). Add ~10-12 i18n keys to `de.json` (base) first, then `en.json`. Import and render `SyncStatusSection` in Settings page between Account and Subscription sections, gated by `authState.isSignedIn`. Verify key counts match across locales.
  - Verify: `pnpm --filter mobile build` compiles; `de.json` and `en.json` key counts equal; `pnpm --filter mobile test` still passes
  - Done when: SyncStatusSection renders in Settings when signed in, shows correct sync state variants, i18n keys in both locales with zero drift

## Files Likely Touched

- `apps/mobile/src/lib/services/sync.ts`
- `apps/mobile/src/lib/services/__tests__/sync.test.ts`
- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
