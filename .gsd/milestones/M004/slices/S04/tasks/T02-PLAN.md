---
estimated_steps: 5
estimated_files: 4
---

# T02: Build SyncStatusSection component + i18n keys

**Slice:** S04 — Sync Status UI + Account Settings
**Milestone:** M004

## Description

Create `SyncStatusSection.svelte` that displays sync status (last synced time, syncing spinner, errors, manual sync trigger). Add i18n keys for all new strings in both `de.json` and `en.json`. Integrate the component into the Settings page, visible only when signed in.

## Steps

1. **Add i18n keys** — Add ~10-12 keys to `de.json` (base locale) first: section header, last synced label, never synced, syncing indicator, sync now button, sync error title, sync error retry, relative time fallback ("just now"). Then add matching translations to `en.json`. Verify key counts match.

2. **Create relative time formatter utility** — Small helper function `formatRelativeTime(isoString: string, locale: string): string` that computes elapsed time from ISO string, picks the right `Intl.RelativeTimeFormat` unit (seconds→"just now", minutes, hours, days), and returns the formatted string. Keep it inline in the component or as a small utility — not worth a separate file for ~20 lines.

3. **Build `SyncStatusSection.svelte`** — Component loads sync state on mount via `$effect` + `getSyncState()`. Renders:
   - Section header (matching existing Settings section style: `text-sm font-bold uppercase tracking-wide text-muted-foreground`)
   - Status row: `Badge` showing "Synced"/"Error"/"Syncing" + relative timestamp or "Never synced"
   - Error: `Alert` with `AlertTitle` + `AlertDescription` showing `lastError`, plus retry button
   - "Sync Now" `Button` with `LoaderCircle` spinner during sync. Handler: set local syncing state, await `triggerSync()`, re-read `getSyncState()`, update display.

4. **Integrate into Settings page** — Import `SyncStatusSection` in Settings. Render it between Account and Subscription sections, gated by `{#if authState.isSignedIn}`. No prop passing needed — component manages its own state loading.

5. **Verify** — Run `pnpm --filter mobile build` to ensure compilation. Check `de.json` and `en.json` key counts match. Run `pnpm --filter mobile test` to ensure no regressions.

## Must-Haves

- [ ] `SyncStatusSection.svelte` exists in `apps/mobile/src/lib/components/settings/`
- [ ] Component shows last sync time as relative timestamp using `Intl.RelativeTimeFormat`
- [ ] Component shows "Never synced" when no sync timestamps exist
- [ ] Component shows spinner during sync operations
- [ ] Component shows error alert with retry when `lastError` is set
- [ ] "Sync Now" button triggers sync and refreshes displayed state
- [ ] Section only visible when user is signed in
- [ ] i18n keys in `de.json` and `en.json` with zero drift
- [ ] Settings page compiles and renders correctly

## Verification

- `pnpm --filter mobile build` — compiles cleanly
- `pnpm --filter mobile test` — all tests pass (no regressions)
- `jq 'keys | length' apps/mobile/messages/de.json apps/mobile/messages/en.json` — counts match
- Visual inspection: component renders four states (synced, never synced, syncing, error)

## Observability Impact

- **User-visible signals:** SyncStatusSection surfaces `lastSyncAt` (relative time), `isSyncing` (spinner), `lastError` (error alert) — all read from `getSyncState()`. This is the first user-facing display of sync health.
- **Inspection:** A future agent can verify state rendering by calling `getSyncState()` and comparing its output to the displayed UI (badge variant, timestamp text, error message).
- **Failure visibility:** When `lastError` is set, the component renders a destructive Alert with the error message and a retry button — making sync failures visible to users rather than silent.
- **No new runtime logs:** Component is purely reactive UI; all runtime logging remains in sync.ts (`[Sync]` prefix).

## Inputs

- `apps/mobile/src/lib/services/sync.ts` — T01 output: `getSyncState()`, `triggerSync()`, `SyncState` type
- `apps/mobile/src/routes/settings/+page.svelte` — existing Settings page with section pattern
- `apps/mobile/messages/de.json` / `en.json` — existing 399 keys each
- S04 Research: component design, don't-hand-roll table (Badge, Alert, LoaderCircle patterns)

## Expected Output

- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — new component (~80-120 lines)
- `apps/mobile/src/routes/settings/+page.svelte` — import + render SyncStatusSection
- `apps/mobile/messages/de.json` — ~10-12 new sync status keys (~410 total)
- `apps/mobile/messages/en.json` — matching keys (~410 total)
