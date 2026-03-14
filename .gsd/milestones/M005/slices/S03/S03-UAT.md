# S03: Connected Accounts in Settings — UAT

**Milestone:** M005
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed (artifact-driven for build/tests/i18n, live-runtime for native connect/disconnect)
- Why this mode is sufficient: Auth-client functions are fully contract-tested (20 tests). UI rendering and native social login flows require device testing since Capacitor plugins don't work in browser dev mode.

## Preconditions

- iOS device or simulator with the app installed (for Apple-related tests)
- Android device or emulator (for Google-related tests)
- User signed in with email/password account
- Dev server NOT needed — use a built app on device
- Server running and accessible from device (for API calls)

## Smoke Test

1. Open the app on a device, sign in with an email/password account
2. Navigate to Settings
3. **Expected:** A "Connected Accounts" section appears below the Auth section showing at least "E-Mail" as a connected provider with a "Connected" badge

## Test Cases

### 1. View Connected Accounts — Email-Only User

1. Sign in with an email/password account (no social providers linked)
2. Navigate to Settings
3. Scroll to the "Connected Accounts" section
4. **Expected:** "E-Mail" row shows with Mail icon, "Connected" badge, and a disabled "Disconnect" button (since it's the only account)
5. **Expected:** "Google" row shows with Google icon and a "Connect" button
6. **Expected (iOS only):** "Apple" row shows with Apple icon and a "Connect" button
7. **Expected (Android):** No Apple row is visible

### 2. Connect Google Account from Settings

1. Sign in with email/password account
2. Navigate to Settings → Connected Accounts
3. Tap "Connect" on the Google row
4. **Expected:** Native Google credential picker appears
5. Select a Google account
6. **Expected:** Success toast appears ("Google account connected" / "Google-Konto verbunden")
7. **Expected:** Google row now shows "Connected" badge instead of "Connect" button
8. **Expected:** Disconnect button appears on Google row
9. **Expected:** E-Mail disconnect button is now enabled (two accounts linked)

### 3. Connect Apple Account from Settings (iOS Only)

1. Sign in with email/password account on iOS
2. Navigate to Settings → Connected Accounts
3. Tap "Connect" on the Apple row
4. **Expected:** Native Apple authorization sheet appears
5. Authenticate with Face ID / Touch ID / password
6. **Expected:** Success toast appears ("Apple account connected" / "Apple-Konto verbunden")
7. **Expected:** Apple row now shows "Connected" badge and Disconnect button

### 4. Disconnect Google Account

1. Sign in with account that has both email and Google linked
2. Navigate to Settings → Connected Accounts
3. Tap "Disconnect" on the Google row
4. **Expected:** Confirmation dialog appears asking "Do you really want to disconnect this login method?"
5. Confirm the dialog
6. **Expected:** Success toast appears ("Google account disconnected" / "Google-Konto getrennt")
7. **Expected:** Google row reverts to showing "Connect" button
8. **Expected:** E-Mail disconnect button becomes disabled again (only account left)

### 5. Cancel Disconnect Confirmation

1. Sign in with account that has email + Google linked
2. Navigate to Settings → Connected Accounts
3. Tap "Disconnect" on Google row
4. **Expected:** Confirmation dialog appears
5. Cancel/dismiss the dialog
6. **Expected:** Nothing changes — Google still shows as connected

### 6. Last-Account Protection

1. Sign in with email-only account (single provider)
2. Navigate to Settings → Connected Accounts
3. **Expected:** E-Mail row's "Disconnect" button is disabled/greyed out
4. Verify the button cannot be tapped

### 7. Section Visibility — Signed Out

1. Sign out of the app
2. Navigate to Settings
3. **Expected:** Connected Accounts section is NOT visible (hidden behind auth guard)

### 8. Connect Flow — User Cancels Native Picker

1. Sign in with email account
2. Navigate to Settings → Connected Accounts
3. Tap "Connect" on Google row
4. Dismiss/cancel the native Google credential picker without selecting an account
5. **Expected:** No error toast, no state change — silently returns to the accounts view

## Edge Cases

### Multiple Social Accounts Connected

1. Sign in with email account
2. Connect Google via Settings
3. Connect Apple via Settings (iOS)
4. **Expected:** All three providers show "Connected" badge
5. **Expected:** All three providers have enabled "Disconnect" buttons
6. Disconnect one provider
7. **Expected:** Two remaining providers still show "Connected" with enabled disconnect buttons

### Server Error on Disconnect

1. Ensure server is unreachable (airplane mode or stop server)
2. Try to disconnect a provider
3. **Expected:** Error toast appears (not a crash or unhandled exception)
4. **Expected:** Provider still shows as connected (state unchanged)

### Server Error on Connect

1. Ensure server is unreachable after native login succeeds
2. Try to connect a new provider
3. **Expected:** Error toast appears after native auth succeeds but server link fails
4. **Expected:** Provider still shows "Connect" button (state unchanged)

## Failure Signals

- Connected Accounts section not visible when signed in → import or auth guard issue
- Apple row visible on Android → `isIOS()` check broken
- Disconnect button enabled on sole account → last-account guard missing
- No confirmation dialog on disconnect → `window.confirm` call missing
- Error toast on user cancel of native picker → silent cancel handling broken (D081/D130)
- Console shows `[Auth] getLinkedAccounts: error` on page load → API endpoint or auth token issue
- Key count mismatch between de.json and en.json → i18n drift

## Requirements Proved By This UAT

- R046 — Connected Accounts UI renders correctly with provider list, icons, and status
- R047 — Connect flow links a social provider to an existing email account from Settings
- R048 — Disconnect flow removes a social provider with confirmation and last-account protection

## Not Proven By This UAT

- Server-side account linking behavior when email already exists on another provider (S01 server-side concern)
- Sync behavior after connecting/disconnecting providers
- Re-sign-in after disconnecting the only social provider (would need to test sign-in flow separately)

## Notes for Tester

- The connect flow requires a real device with Google/Apple accounts configured — simulators may have limited social login support
- Apple Sign-In only appears on iOS (by design — D131/S02)
- `window.confirm` renders as a native alert dialog on mobile webviews — this is expected and acceptable
- The "E-Mail" provider maps to the `credential` providerId internally — this is a Better Auth convention
- If testing on web dev server, social login buttons won't work (native plugins only) — the section will render but connect will fail gracefully
