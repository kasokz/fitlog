# S04: Sync Status UI + Account Settings — UAT

**Milestone:** M004
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed (artifact-driven for state logic, human-experience for visual UI)
- Why this mode is sufficient: Sync state logic is covered by 6 unit tests. Visual rendering of SyncStatusSection and Settings page integration requires on-device verification.

## Preconditions

- Mobile app running on device or simulator (`pnpm dev` or native build)
- SvelteKit API server running at configured base URL (for sign-in/sign-out)
- A valid test account exists (email/password)
- Device has network connectivity (for sign-in and sync tests)
- A second test scenario with no prior sync history (fresh sign-in)

## Smoke Test

Sign in to the app → navigate to Settings → confirm the "Synchronisierung" / "Sync" section appears between Account and Subscription sections showing sync status with a "Jetzt synchronisieren" / "Sync Now" button.

## Test Cases

### 1. Sync status visible only when signed in

1. Open the app without signing in (or sign out if signed in)
2. Navigate to Settings
3. **Expected:** No sync status section visible. Account section shows sign-in options. Subscription section visible.
4. Sign in with valid credentials
5. Navigate to Settings
6. **Expected:** Sync status section now visible between Account and Subscription sections. Shows either "Noch nie synchronisiert" / "Never synced" or a last sync timestamp.

### 2. "Never synced" state display

1. Sign in with a fresh account that has never synced
2. Navigate to Settings
3. **Expected:** Sync status section shows green "Synchronisiert" / "Synced" badge and text "Noch nie synchronisiert" / "Never synced." "Jetzt synchronisieren" / "Sync Now" button is enabled.

### 3. Manual sync via "Sync Now" button

1. Sign in and navigate to Settings
2. Tap "Jetzt synchronisieren" / "Sync Now"
3. **Expected:** Button shows spinner icon, badge changes to grey "Synchronisiere..." / "Syncing...", button becomes disabled during sync
4. Wait for sync to complete
5. **Expected:** Badge returns to green "Synchronisiert" / "Synced", timestamp shows "gerade eben" / "just now", button is re-enabled

### 4. Relative time formatting

1. After a successful sync, stay on Settings page
2. Wait ~2 minutes, then navigate away and back to Settings
3. **Expected:** Timestamp shows "vor 2 Minuten" (de) or "2 minutes ago" (en)
4. Wait longer (or adjust device clock forward by 3 hours) and return to Settings
5. **Expected:** Timestamp shows "vor 3 Stunden" (de) or "3 hours ago" (en)

### 5. Sync error state with retry

1. Sign in to the app
2. Disable network connectivity (airplane mode or disconnect Wi-Fi)
3. Tap "Jetzt synchronisieren" / "Sync Now"
4. Wait for sync attempt to fail
5. **Expected:** Badge shows red "Fehler" / "Error", destructive alert appears showing error title "Synchronisierungsfehler" / "Sync Error" with error description, "Sync Now" button remains enabled for retry
6. Re-enable network connectivity
7. Tap "Jetzt synchronisieren" / "Sync Now" again
8. **Expected:** Sync succeeds, badge returns to green "Synchronisiert" / "Synced", error alert disappears, timestamp updates

### 6. Sign-out clears sync state (cross-account leak prevention)

1. Sign in as User A
2. Tap "Sync Now" and wait for successful sync
3. Note the "last synced" timestamp
4. Sign out from Settings
5. Sign in as User B (different account)
6. Navigate to Settings
7. **Expected:** Sync status shows "Noch nie synchronisiert" / "Never synced" — NOT User A's timestamp. This confirms `clearSyncState()` was called during sign-out.

### 7. Sync status section placement in Settings

1. Sign in and navigate to Settings
2. Scroll through the Settings page
3. **Expected:** Page sections appear in this order: Account (showing user email + sign-out button), Sync Status section, Subscription section, then other Settings sections (Export, etc.)

### 8. Locale-aware relative timestamps

1. Set app language to German (de)
2. Perform a sync, then return to Settings after 5 minutes
3. **Expected:** Timestamp reads "vor 5 Minuten"
4. Switch app language to English (en)
5. Return to Settings
6. **Expected:** Timestamp reads "5 minutes ago"

## Edge Cases

### App restart clears in-memory sync state

1. Perform a sync and note the error state (if any) or syncing state
2. Force-quit and relaunch the app
3. Navigate to Settings
4. **Expected:** `isSyncing` is false (not stuck in syncing state). `lastSyncAt` still shows the correct timestamp from Preferences. Any prior `lastError` is cleared (in-memory only).

### Rapid "Sync Now" taps

1. Sign in and navigate to Settings
2. Rapidly tap "Sync Now" multiple times in quick succession
3. **Expected:** Button is disabled during sync, preventing duplicate sync operations. Only one sync runs. UI recovers to idle state after completion.

### Very old sync timestamp

1. Sync successfully, then don't sync for 3+ days (or adjust device clock)
2. Return to Settings
3. **Expected:** Timestamp shows "vor 3 Tagen" (de) or "3 days ago" (en) — uses day units for intervals >= 24 hours.

## Failure Signals

- Sync status section visible when NOT signed in
- Sync status section missing when signed in
- "Sync Now" button stays disabled permanently after a sync attempt
- Badge stuck on "Syncing" indefinitely after a failed sync
- User A's sync timestamp appears after signing in as User B
- Relative timestamps show raw ISO strings instead of formatted text
- i18n key names (e.g. `sync_status_synced`) appear instead of translated text
- Error alert appears without an actual error condition

## Requirements Proved By This UAT

- R025 (Cloud Sync Infrastructure) — Sync state is observable to the user with visual feedback
- R026 (Account System) — Sign-out properly clears sync state, preventing cross-account leak
- R027 (Cross-Device Sync) — Sync status UI completes the user-facing sync experience

## Not Proven By This UAT

- Two-device sync correctness (covered by S02 UAT)
- Auth token refresh after extended offline (operational verification, not UI)
- Sync performance at scale (thousands of records)
- Server-side sync API behavior (covered by web tests)

## Notes for Tester

- The sync status section only appears when signed in. If you don't see it, verify auth state first.
- Error state testing requires intentionally breaking network connectivity — airplane mode is the easiest approach.
- Relative time thresholds: <60 seconds = "just now", <60 minutes = minutes, <24 hours = hours, >=24 hours = days.
- The 11 i18n keys all have `sync_status_` prefix in the JSON files. If any show up as raw keys in the UI, it's a paraglide compilation issue — run `pnpm paraglide:compile` and rebuild.
