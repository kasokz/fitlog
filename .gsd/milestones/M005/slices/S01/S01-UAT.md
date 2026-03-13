# S01: Server Config + Auth Client + Google Sign-In — UAT

**Milestone:** M005
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed (artifact-driven for code/config verification + live-runtime for native sign-in flow)
- Why this mode is sufficient: Server config and auth-client logic verified by unit tests and builds. Native credential picker and end-to-end sign-in require a real device with real Google credentials.

## Preconditions

- Real Google OAuth web client ID configured (replace `GOOGLE_WEB_CLIENT_ID` placeholder in layout or config)
- Real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `apps/web/.env`
- Web server running (`pnpm --filter web dev`)
- Mobile app built and deployed to a physical device or simulator with Google Play Services (Android) or iOS 16+ (iOS)
- A Google account available for testing
- (Optional) An existing email/password FitLog account with the same email as the Google account (for account linking test)

## Smoke Test

1. Open the FitLog app on a real device
2. Navigate to the sign-in page
3. Verify the "Mit Google anmelden" button (or "Continue with Google" in EN) appears above the email/password form with an "oder" / "or" divider between them
4. **Expected:** Button is visible, full-width, outline style with Google "G" logo

## Test Cases

### 1. Google sign-in — happy path (new user)

1. Sign out of any existing FitLog account
2. Navigate to the sign-in page
3. Tap "Mit Google anmelden" / "Continue with Google"
4. The native Google credential picker / account chooser appears
5. Select a Google account that has NOT been used with FitLog before
6. **Expected:** App navigates to `/programs`, success toast appears ("Erfolgreich angemeldet" / "Successfully signed in"), user is logged in

### 2. Google sign-in — happy path (returning user)

1. After completing test 1, sign out
2. Navigate to sign-in page
3. Tap "Mit Google anmelden" again, select the same Google account
4. **Expected:** App navigates to `/programs`, same success toast, user sees their existing data (programs created in test 1 session)

### 3. Google sign-in — account linking (same email as existing email/password account)

**Precondition:** An email/password account exists with email `test@gmail.com`. A Google account with the same email `test@gmail.com` is available.

1. Navigate to sign-in page
2. Tap "Mit Google anmelden"
3. Select the Google account with email `test@gmail.com`
4. **Expected:** Sign-in succeeds. User sees ALL data from their original email/password account (programs, workout history, body weight entries). The accounts are linked — both email/password and Google sign-in work for this user going forward.

### 4. Google sign-in — user cancels credential picker

1. Navigate to sign-in page
2. Tap "Mit Google anmelden"
3. When the native credential picker appears, dismiss it (tap outside, press back, or tap cancel)
4. **Expected:** App returns to sign-in page silently. No error toast. No loading state stuck. Button is interactive again.

### 5. Post-sign-in sync triggers

1. Have the web server running with sync enabled
2. Sign in via Google on the device
3. **Expected:** After successful sign-in, sync runs automatically (observable via `[Sync]` console logs or SyncStatusSection in Settings showing a recent sync time)

### 6. Sign-in page layout — social buttons above email form

1. Navigate to the sign-in page
2. **Expected:**
   - Google button at the top (full-width, outline variant, Google "G" SVG logo on the left)
   - "oder" / "or" divider below the Google button
   - Email/password form below the divider
   - Email/password form is fully functional and unaffected

### 7. Email/password sign-in still works

1. Navigate to sign-in page
2. Ignore the Google button
3. Sign in with email and password as before
4. **Expected:** Sign-in works exactly as it did before social login was added. No regressions.

### 8. Loading state during Google sign-in

1. Navigate to sign-in page
2. Tap "Mit Google anmelden"
3. **Expected:** Button shows a loading spinner (replaces Google icon) while authenticating. Button is disabled during loading.
4. Complete or cancel the sign-in
5. **Expected:** Loading state clears, button returns to normal

## Edge Cases

### Network error during token exchange

1. Enable airplane mode or disconnect from network AFTER the Google credential picker returns (but before the app calls the server)
2. **Expected:** Error toast appears ("Anmeldung fehlgeschlagen" / "Sign-in failed"). No crash. Button returns to interactive state.

### Server unreachable

1. Stop the web server
2. Attempt Google sign-in on the device
3. **Expected:** Error toast appears after the native credential picker succeeds but server call fails. App doesn't crash or hang.

### Rapid double-tap on Google button

1. Quickly double-tap the Google button
2. **Expected:** Only one credential picker opens. No duplicate requests. Loading state prevents the second tap.

### i18n — German locale

1. Set app language to German
2. Navigate to sign-in page
3. **Expected:** Button reads "Mit Google anmelden", divider reads "oder", success toast reads "Erfolgreich angemeldet", error toast reads "Anmeldung fehlgeschlagen"

### i18n — English locale

1. Set app language to English
2. Navigate to sign-in page
3. **Expected:** Button reads "Continue with Google", divider reads "or", success toast reads "Successfully signed in", error toast reads "Sign-in failed"

## Failure Signals

- Google button missing from sign-in page → SocialLoginButtons component not imported or not rendered
- Credential picker doesn't appear → Plugin not initialized (check `[SocialLogin] initialize:` console logs), or `GOOGLE_WEB_CLIENT_ID` is still placeholder
- Credential picker appears but sign-in fails → Server social provider misconfigured, or env vars missing (check `[Auth] signInWithSocial:` console logs)
- Success but no navigation → `onSuccess` callback not wired, or `goto('/programs')` failing
- Toast on user cancel → Cancel detection broken (check `[SocialLogin] loginWithGoogle:` logs for "cancelled" vs error)
- Email/password sign-in broken → Regression in sign-in page changes
- Loading spinner stuck → Error not caught in finally block

## Requirements Proved By This UAT

- R026 (Account System / Auth) — extended to support social provider sign-in via Google, with session token stored and sync triggered

## Not Proven By This UAT

- Apple Sign-In flow (S02 scope)
- Sign-up page social buttons (S02 scope)
- Connected Accounts view/disconnect in Settings (S03 scope)
- Android-specific native credential picker behavior (requires Android device testing)

## Notes for Tester

- The `GOOGLE_WEB_CLIENT_ID` in the codebase is a placeholder. You MUST configure a real Google OAuth web client ID (from Google Cloud Console) before any native sign-in will work. The plugin init will appear to succeed with the placeholder, but the credential picker will fail or not appear.
- Server env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) must also be real — the server verifies the idToken against Google's servers.
- Apple env vars can remain as dev placeholders for S01 testing — Apple sign-in is not wired to UI yet.
- Console logs with `[SocialLogin]` and `[Auth] signInWithSocial:` prefixes are the primary debugging signals. Connect the device to Safari/Chrome dev tools to see them.
- On web/dev mode, `loginWithGoogle()` returns `null` immediately (native-only guard) — this is expected behavior, not a bug. Test on a real device.
