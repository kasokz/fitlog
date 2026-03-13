# S04: Sync Status UI + Account Settings — Research

**Date:** 2026-03-13

## Summary

S04 adds user-visible sync status and enhances the existing account section in Settings. The core challenge is that the current sync service (`sync.ts`) is entirely fire-and-forget — it exposes no state about whether sync is running, when it last succeeded, or what errors occurred. The Settings page already has an auth section (S01) showing signed-in user info and sign-out, but there's no sync status indicator anywhere.

The sync service needs to evolve from "fire-and-forget with console logs" to "fire-and-forget with observable state." The key design decision is how to expose sync state: the codebase uses plain `.ts` services with async functions (no `.svelte.ts` files, no `$state` in services). The recommended approach is a module-level state object in `sync.ts` with getter functions that UI components can poll — consistent with how `getAuthState()` and `isPremiumUser()` work. For real-time "syncing..." spinner state, a simple callback/event pattern lets the layout or a status component react without introducing reactive stores into service modules.

**Primary recommendation:** Add sync state tracking to `sync.ts` (last sync time, syncing flag, last error), expose via `getSyncState()`. Build a `SyncStatusIndicator` component for the Settings page showing last sync time, in-progress spinner, and error state. Add a manual "Sync Now" button. Enhance account section with sync status. Clear sync timestamps on sign-out (currently a bug — timestamps persist across account changes).

## Recommendation

### Sync State Exposure

Evolve `sync.ts` to track state internally:

1. **In-memory state object** with `isSyncing`, `lastSyncAt`, `lastError`, `lastErrorAt` fields
2. **Persisted timestamps** already exist in Preferences (`sync_last_push_at`, `sync_last_pull_at`) — use the later of these as `lastSyncAt`
3. **`getSyncState()` async function** reads both in-memory (syncing flag) and persisted (timestamps) state — matches `getAuthState()` pattern
4. **`clearSyncState()` function** clears Preferences timestamps — called on sign-out (fixes the cross-account timestamp leak bug)
5. **Manual sync trigger** via existing `incrementalSync()` — just needs to be callable from UI

### UI Components

- **SyncStatusIndicator** component in `apps/mobile/src/lib/components/settings/` — shows:
  - Last sync time as relative timestamp ("2 min ago", "1 hour ago")
  - Spinner when `isSyncing` is true
  - Error message when `lastError` is set (with retry button)
  - "Never synced" when no timestamps exist
- **"Sync Now" button** — calls `incrementalSync()`, shows spinner during operation
- **Account section enhancement** — already has user email + sign-out. Add sync status below it (only when signed in)

### Why NOT a reactive store / `.svelte.ts`

The codebase has zero `.svelte.ts` files. All services are plain async functions. Introducing a reactive sync store would be a pattern break. The Settings page already uses `$effect` to load auth state on mount — same pattern works for sync state. Polling via `$effect` on mount + re-fetch after manual sync is simple and consistent.

### Why NOT Context (runed)

Sync state is global app state, not tree-scoped. Context would require setting it in the layout and getting it in Settings. The async function pattern (`getSyncState()`) is simpler and already proven for auth/premium state.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Relative time formatting ("2 min ago") | `Intl.RelativeTimeFormat` (built-in) | Zero-dependency, locale-aware, works with paraglide locale. No library needed for simple relative timestamps. |
| Loading spinner | `LoaderCircle` from `@lucide/svelte` + `animate-spin` | Already used in 6+ places across Settings page (sign-out, export, IAP buttons). Established pattern. |
| Status badge variants | `Badge` from `@repo/ui/components/ui/badge` | Available with default/secondary/destructive/outline variants. Good for "Synced" / "Error" / "Syncing" states. |
| Alert for errors | `Alert` + `AlertTitle` + `AlertDescription` from `@repo/ui/components/ui/alert` | Available in shadcn-svelte UI package. Better than inline text for surfacing sync errors with context. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/sync.ts` — Current sync service, 335 lines. Exports `fullSync()`, `incrementalSync()`, `pushChanges()`, `pullChanges()`. All fire-and-forget. Persists `sync_last_push_at` and `sync_last_pull_at` in Preferences. **Must be extended** with state tracking (in-memory syncing flag, error capture, `getSyncState()`, `clearSyncState()`).
- `apps/mobile/src/lib/services/auth-client.ts` — Pattern to follow: `getAuthState()` reads from Preferences, returns typed object. `signOut()` calls `clearCredentials()`. **Sync state getter should follow this exact pattern.** Also: `signOut()` currently does NOT clear sync timestamps — needs fix.
- `apps/mobile/src/routes/settings/+page.svelte` — 340 lines. Already has Theme, Language, Export, Account/Auth, Subscription, and Dev sections. Auth section shows email + sign-out when authenticated, sign-in/sign-up buttons when not. **Sync status section goes between Auth and Subscription sections** (only visible when signed in).
- `apps/mobile/src/routes/+layout.svelte` — Fires `incrementalSync()` on mount, resume, and connectivity restore. All fire-and-forget. **No changes needed** — layout triggers stay the same, sync service internals handle state tracking.
- `apps/mobile/src/lib/components/BottomNav.svelte` — Simple 5-tab nav. No sync indicator needed here (too small, too noisy). Sync status belongs in Settings only.
- Settings page auth section `$effect` pattern — `getAuthState().then((state) => { authState = state; })` — **exact pattern to reuse** for sync state loading.

## Constraints

- **No `.svelte.ts` files exist** — all services are plain `.ts`. Sync state exposure must use async getter functions, not Svelte 5 reactive runes in service modules.
- **Settings page is already 340 lines** — adding sync status inline would push it further. Extract `SyncStatusSection` as a dedicated component to keep Settings manageable.
- **i18n base locale is German** — all new keys must go in `de.json` first, then `en.json`. Currently 399 keys in each.
- **Sync is silent on failure** (D117) — errors are caught and logged, never thrown. Sync status must read the captured error, not try-catch at the UI level.
- **`Intl.RelativeTimeFormat`** needs the current paraglide locale for proper formatting. Available via `getLocale()` from `$lib/paraglide/runtime.js`.
- **Auth sign-out does not clear sync state** — sync timestamps from one user's session carry over if a different user signs in. `clearSyncState()` must be called during sign-out.

## Common Pitfalls

- **Racing sync state reads** — `getSyncState()` is async (reads Preferences). If the component reads state on mount while a sync is in-flight from the layout's mount trigger, the in-memory `isSyncing` flag may already be true before the component reads it. Solution: read in-memory flags synchronously, only read Preferences for timestamps.
- **Stale "last synced" time** — If the user looks at Settings and triggers "Sync Now", the displayed time won't update unless the component re-reads state after the sync completes. Solution: "Sync Now" handler awaits the sync, then re-reads state.
- **Sync timestamps not cleared on sign-out** — Currently a bug. If user A signs out and user B signs in, incremental sync uses user A's timestamps, potentially missing user B's data. Solution: add `clearSyncState()` to `sync.ts`, call it in the sign-out flow.
- **Over-engineering the sync indicator** — A global persistent banner/toast for sync status would add visual noise. Sync runs in background and succeeds silently (D117). The status indicator should be informational (in Settings), not attention-grabbing. Only errors deserve visual prominence.
- **Relative time formatting edge cases** — "Just now" for < 1 minute, minutes for < 1 hour, hours for < 1 day, date string for > 1 day. `Intl.RelativeTimeFormat` handles units but the app must choose the right unit based on elapsed time.

## Open Risks

- **Sync state consistency between in-memory and persisted** — If the app crashes mid-sync, the in-memory `isSyncing` flag is lost but timestamps may or may not have been written. On next launch, state should show "last synced at X" (from Preferences) with `isSyncing = false` (default). This is correct behavior — no special handling needed.
- **Long relative timestamps** — If a user hasn't synced in weeks, "3 weeks ago" is fine. But "never synced" needs to be distinguishable from "not signed in" — the section should only appear when authenticated.
- **Settings page growing** — With Theme, Language, Export, Auth, Sync Status, Subscription, and Dev sections, the page is getting long. A future refactor into section components may be needed, but for now keeping the existing inline pattern with one extracted `SyncStatusSection` is pragmatic.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 | `sveltejs/ai-tools@svelte-code-writer` (2.5K installs) | available — consider for Svelte component patterns |
| Svelte 5 | `ejirocodes/agent-skills@svelte5-best-practices` (2.1K installs) | available — consider for runes patterns |
| Better Auth | `better-auth/skills@better-auth-best-practices` (21.9K installs) | available — not needed for this slice (auth already built) |

No skills are critical for this slice — it's primarily UI component work using existing patterns and shadcn-svelte components.

## Scope / Deliverables

This slice produces:

1. **Sync state tracking in `sync.ts`** — in-memory `isSyncing` + `lastError`, `getSyncState()` getter, `clearSyncState()` cleanup function, manual `triggerSync()` wrapper
2. **`SyncStatusSection.svelte` component** — sync status indicator with last synced time, syncing spinner, error display, manual "Sync Now" button
3. **Settings page integration** — Sync status section visible when signed in, between Account and Subscription sections
4. **Sign-out sync cleanup** — `clearSyncState()` called on sign-out (fixes cross-account timestamp leak)
5. **i18n keys** — ~10–12 new keys in `de.json` and `en.json` for sync status UI
6. **Tests** — Unit tests for `getSyncState()`, `clearSyncState()`, and sync state transitions

### What this slice does NOT produce:
- No global sync indicator outside Settings (unnecessary visual noise for a background operation)
- No reactive Svelte store for sync state (pattern break — sticking with async getter pattern)
- No WebSocket or real-time sync status push (unnecessary for simple status display)

## Sources

- Sync service implementation: `apps/mobile/src/lib/services/sync.ts` (335 lines, existing codebase)
- Auth service pattern: `apps/mobile/src/lib/services/auth-client.ts` (async getter, catch-and-return)
- Settings page structure: `apps/mobile/src/routes/settings/+page.svelte` (existing section layout)
- Layout sync triggers: `apps/mobile/src/routes/+layout.svelte` (mount, resume, connectivity)
- shadcn-svelte Badge component: `packages/ui/src/components/ui/badge/badge.svelte` (variant styles)
- runed Context utility: `references/runed/sites/docs/src/content/utilities/context.md` (evaluated, not recommended for this use case)
- Decision D117: Sync error handling — catch-and-log, never throw
- Decision D106: Sync trigger strategy — after sign-in, on resume, on connectivity, manual
