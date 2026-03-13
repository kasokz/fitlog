# S02: Apple Sign-In + Auth UI Finalization — UAT

**Milestone:** M005
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed (artifact-driven + human-experience)
- Why this mode is sufficient: Unit tests verify endpoint contract and request body shape. Native Apple Sign-In sheet and visual layout require real device interaction.

## Preconditions

- iOS device or simulator with Apple ID signed in
- Android device or emulator (for Google-only verification)
- App built and installed on both platforms via `pnpm --filter mobile build && pnpm cap sync`
- Better Auth server running with Google + Apple social providers configured
- User has an existing email/password account for account-linking test

## Smoke Test

Open the sign-in page on an iOS device. Verify both "Continue with Google" and "Continue with Apple" buttons are visible above the email form, separated by an "or" divider.

## Test Cases

### 1. Apple button renders on iOS only

1. Open the sign-in page on an iOS device
2. Verify "Continue with Apple" button is visible with black background and Apple logo
3. Verify "Continue with Google" button is also visible with outline style
4. Open the same page on an Android device
5. **Expected:** Only "Continue with Google" button is visible. No Apple button. No layout gap or empty space where the Apple button would be.

### 2. Apple Sign-In happy path (first authorization)

1. On iOS, tap "Continue with Apple" on the sign-in page
2. Apple Sign-In sheet appears (native ASAuthorizationController)
3. Choose to share name and email, authenticate with Face ID / Touch ID / passcode
4. **Expected:** Sign-in succeeds. User is navigated to `/programs`. Toast confirms success. User's name appears in Settings (profile data was forwarded to server).

### 3. Apple Sign-In happy path (subsequent authorization)

1. Sign out from the app
2. Tap "Continue with Apple" on the sign-in page again
3. Authenticate via Apple Sign-In sheet
4. **Expected:** Sign-in succeeds. User is navigated to `/programs`. User's name is preserved from the first authorization (Apple does not resend profile data).

### 4. Apple Sign-In cancellation

1. On iOS, tap "Continue with Apple"
2. When the Apple Sign-In sheet appears, tap "Cancel" or dismiss it
3. **Expected:** No error toast. No navigation. User stays on the sign-in page. Both social buttons are re-enabled (not stuck in loading state).

### 5. Sign-up page social buttons

1. Navigate to the sign-up page
2. Verify social login buttons appear above the email registration form
3. Verify "or" divider text appears between social buttons and email form
4. On iOS: verify both Google and Apple buttons are visible
5. On Android: verify only Google button is visible
6. **Expected:** Layout matches sign-in page: social buttons → "oder"/"or" divider → email form → sign-in link.

### 6. Sign-up via Apple (new user)

1. On the sign-up page, tap "Continue with Apple"
2. Complete Apple Sign-In with an Apple ID not yet registered
3. **Expected:** Account is created. User is navigated to `/programs`. Session token stored. Sync triggers automatically.

### 7. Google Sign-In still works (regression check)

1. On the sign-in page, tap "Continue with Google"
2. Complete Google sign-in via native credential picker
3. **Expected:** Sign-in succeeds. Same behavior as before S02 changes. Navigated to `/programs`.

### 8. Email/password sign-in unaffected (regression check)

1. On the sign-in page, ignore social buttons
2. Enter email and password in the form below the divider
3. Submit the form
4. **Expected:** Sign-in works exactly as before. Social buttons do not interfere with email form.

## Edge Cases

### Apple Sign-In with existing email account (account linking)

1. Create an email/password account with email `test@example.com`
2. Sign out
3. Tap "Continue with Apple" using an Apple ID whose email is `test@example.com`
4. **Expected:** Sign-in succeeds. The Apple provider is linked to the existing account. User sees their existing data (programs, workouts). In Settings > Connected Accounts (S03), both Email and Apple should appear.

### Both buttons disabled during loading

1. Tap "Continue with Apple" (or Google)
2. While the native sheet is showing (before completion)
3. **Expected:** Both social buttons show a loading state. Neither button is tappable. Prevents double-tap race condition.

### Network error during Apple Sign-In

1. Put the device in airplane mode
2. Tap "Continue with Apple"
3. Complete the native Apple Sign-In sheet (works offline — it's local credential)
4. **Expected:** After the native sheet, the server call fails. Error toast appears with a meaningful message. User stays on the sign-in page. Buttons re-enabled.

### Nonce mismatch scenario

1. This is a server-side verification scenario — if the nonce sent to Apple doesn't match the nonce sent to Better Auth, the server should reject with a 403
2. **Expected:** `signInWithSocial` returns `{ success: false, error }` with a descriptive message. Error toast appears. User can retry.

## Failure Signals

- Apple button visible on Android (isIOS() guard broken)
- Apple button missing on iOS (conditional rendering broken)
- Sign-in succeeds but user has empty name (profile forwarding failed on first auth)
- Endpoint returns 404 (URL still using old `/social/token` path)
- Both buttons remain in loading state after cancel/error (loading state not reset)
- Sign-up page missing social buttons or divider (import/layout broken)
- Cap sync fails or Apple Sign-In entitlement missing from iOS build

## Requirements Proved By This UAT

- R041-R050 (Social Login) — partially proved: Apple Sign-In flow, social buttons on both auth pages, nonce handling. Full proof requires S03 completion for Connected Accounts.

## Not Proven By This UAT

- Connected Accounts management in Settings (S03 scope)
- Server-side Apple identity token verification (server infrastructure, not mobile scope)
- Long-term token refresh behavior for Apple sessions

## Notes for Tester

- Apple only sends the user's name and email on the **very first** authorization. If you've already authorized the app with your Apple ID, you won't see the "share name/email" prompt. To test first-auth profile forwarding, you may need to: go to Settings > Apple ID > Sign-In & Security > Sign in with Apple, find the app, and tap "Stop Using Apple ID" to reset the authorization.
- The pre-existing test failure in `template-service.test.ts` (`no such table: exercises`) is unrelated to this slice — ignore it.
- The StoreKit test configuration (Products.storekit) is not relevant to social login testing.
