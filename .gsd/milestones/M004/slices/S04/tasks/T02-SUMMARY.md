---
id: T02
parent: S04
milestone: M004
provides:
  - SyncStatusSection.svelte component rendering sync status (synced/syncing/error/never synced states)
  - 11 new i18n keys in de.json and en.json for sync status UI
  - Relative time formatting using Intl.RelativeTimeFormat with paraglide locale
  - Settings page integration gated by authState.isSignedIn
key_files:
  - apps/mobile/src/lib/components/settings/SyncStatusSection.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Relative time formatter kept inline in the component (~25 lines) — not worth a separate utility file
  - Used Badge with variant toggling (default/destructive/secondary) for status indicator
  - Local `syncing` state OR-ed with syncState.isSyncing for immediate UI feedback during manual sync
  - Error alert uses Alert.Root destructive variant with AlertCircle icon, matching shadcn patterns
patterns_established:
  - SyncStatusSection as self-contained component managing its own state via $effect + getSyncState()
  - Settings sub-components in apps/mobile/src/lib/components/settings/ directory
observability_surfaces:
  - SyncStatusSection visually surfaces getSyncState() data (isSyncing, lastSyncAt, lastError)
  - Badge variant maps to state: default=synced, destructive=error, secondary=syncing
  - Error alert shows raw lastError message from sync service
duration: 12m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Build SyncStatusSection component + i18n keys

**Created SyncStatusSection.svelte displaying sync status with relative timestamps, error alerts, and manual sync trigger, plus 11 i18n keys in de/en.**

## What Happened

Added 11 i18n keys to both `de.json` and `en.json` (section header, status badges, never synced, just now, last synced with time parameter, sync now button, error title/description, retry). Built `SyncStatusSection.svelte` in `apps/mobile/src/lib/components/settings/` — component loads sync state on mount via `$effect` + `getSyncState()`, renders a status row with `Badge` (synced/syncing/error) + relative timestamp using `Intl.RelativeTimeFormat` with `getLocale()`, a destructive `Alert` with retry on error, and a "Sync Now" `Button` with spinner. Integrated into Settings page between Account and Subscription sections, gated by `{#if authState.isSignedIn}`.

## Verification

- `pnpm --filter mobile build` — compiles cleanly (40s, adapter-static)
- `pnpm --filter mobile test` — **524 tests pass** (zero regressions)
- `pnpm --filter web test` — **26 tests pass** (no web changes)
- `jq 'keys | length' apps/mobile/messages/de.json apps/mobile/messages/en.json` — both at 410 keys, zero drift
- Settings page renders SyncStatusSection between Account and Subscription sections when signed in

## Diagnostics

- Component renders four states based on `getSyncState()` output:
  1. **Synced** — green Badge "Synced" + relative timestamp (e.g. "vor 5 Minuten" / "5 minutes ago")
  2. **Never synced** — green Badge "Synced" + "Noch nie synchronisiert" / "Never synced" text
  3. **Syncing** — grey Badge "Synchronisiere..." with spinner + disabled Sync Now button
  4. **Error** — red Badge "Fehler" / "Error" + destructive Alert showing lastError + Sync Now button available
- Relative time thresholds: <60s = "just now", <60m = minutes, <24h = hours, else days

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — New component (~115 lines) displaying sync status with Badge, Alert, relative time, and manual sync trigger
- `apps/mobile/src/routes/settings/+page.svelte` — Imported SyncStatusSection, rendered between Account and Subscription sections gated by authState.isSignedIn
- `apps/mobile/messages/de.json` — Added 11 sync status i18n keys (399→410 total)
- `apps/mobile/messages/en.json` — Added 11 matching sync status i18n keys (399→410 total)
- `.gsd/milestones/M004/slices/S04/tasks/T02-PLAN.md` — Added Observability Impact section (pre-flight fix)
