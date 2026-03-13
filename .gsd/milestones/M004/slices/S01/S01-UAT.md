# S01: Backend API + Auth + Mobile Sign-In — UAT

**Milestone:** M004
**Written:** 2026-03-13

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: Auth is inherently a runtime integration — sign-up/sign-in/token flows must be tested against a running API + Postgres. Automated tests cover unit logic; UAT proves the end-to-end round-trip on a real device or browser.

## Preconditions

1. Docker running: `docker compose up -d` (Postgres on port 5433)
2. Schema pushed: `pnpm --filter web db:push` (13 tables created)
3. Web API running: `cd apps/web && pnpm dev` (port 5174)
4. Mobile dev server running: `cd apps/mobile && pnpm dev` (port 5173)
5. No existing test user in Postgres (or use a fresh email)

## Smoke Test

Navigate to Settings in the mobile app → tap "Anmelden" (Sign In) → verify the sign-in form renders with email and password fields, a submit button, and a link to the sign-up page.

## Test Cases

### 1. Sign Up — New Account

1. From Settings, tap "Registrieren" (Sign Up) or navigate to `/auth/sign-up`
2. Enter a valid email (e.g., `test@example.com`) and a password (min 8 characters)
3. Enter the same password in the confirm field
4. Tap "Registrieren"
5. **Expected:** Success toast appears. User is redirected to `/programs`. In Settings, the auth section now shows the user's email and a "Abmelden" (Sign Out) button.

### 2. Sign Out

1. After successful sign-up (test 1), navigate to Settings
2. Verify email is shown in the auth section
3. Tap "Abmelden" (Sign Out)
4. **Expected:** Auth section reverts to showing "Anmelden" and "Registrieren" buttons. No error toast.

### 3. Sign In — Existing Account

1. After sign-out (test 2), navigate to Settings → tap "Anmelden"
2. Enter the same email and password used in test 1
3. Tap "Anmelden"
4. **Expected:** Success toast appears. User is redirected to `/programs`. Settings shows email and sign-out button again.

### 4. Sign In — Wrong Password

1. Navigate to `/auth/sign-in`
2. Enter a valid email but an incorrect password
3. Tap "Anmelden"
4. **Expected:** Error toast or form error message appears. User stays on the sign-in page. No redirect.

### 5. Sign Up — Validation Errors

1. Navigate to `/auth/sign-up`
2. Leave email empty, tap submit → **Expected:** Email field shows validation error
3. Enter email but leave password empty → **Expected:** Password field shows validation error
4. Enter password but different confirm password → **Expected:** Confirm field shows "Passwörter müssen übereinstimmen" error
5. Enter password shorter than 8 characters → **Expected:** Password field shows min-length validation error

### 6. Bottom Nav Hidden on Auth Pages

1. Navigate to `/auth/sign-in`
2. **Expected:** Bottom tab bar is not visible
3. Navigate to `/auth/sign-up`
4. **Expected:** Bottom tab bar is not visible
5. Navigate back to any main page (e.g., `/programs`)
6. **Expected:** Bottom tab bar is visible again

### 7. Bearer Token Persistence

1. Sign in successfully (test 3)
2. Close the browser tab / reload the app
3. Navigate to Settings
4. **Expected:** Auth section still shows user email and sign-out button (token persisted in Preferences)

## Edge Cases

### Duplicate Email Sign-Up

1. Sign up with an email that already has an account (from test 1)
2. **Expected:** Error message indicating the email is already registered. No crash, no redirect.

### Network Error During Auth

1. Stop the web API server (`Ctrl+C` on `pnpm dev` in apps/web)
2. Attempt to sign in
3. **Expected:** Error toast with a network-related message. No crash. Form remains usable.
4. Restart the web API server and retry
5. **Expected:** Sign-in succeeds normally

## Failure Signals

- 401 or 500 errors in browser console during sign-up/sign-in
- Missing `set-auth-token` header in sign-in response (check Network tab)
- Toast not appearing after form submission
- Redirect to wrong page after successful auth
- Settings page not reflecting auth state change after sign-in/sign-out
- Bottom nav visible on `/auth/*` routes

## Requirements Proved By This UAT

- R026 (Account System) — Full sign-up/sign-in/sign-out cycle with Bearer token auth proven on device
- R025 (Cloud Sync Infrastructure) — partially: server API running with Drizzle schema, auth middleware, protected routes

## Not Proven By This UAT

- R027 (Cross-Device Sync) — no sync protocol yet (S02)
- R028 (Backup/Restore) — no data transfer yet (S02)
- R029 (Data Export) — separate slice (S03)
- Token refresh after expiry — Better Auth handles session expiry server-side; mobile token is session-scoped, not time-limited
- Production deployment (API_BASE_URL configuration, real BETTER_AUTH_SECRET)

## Notes for Tester

- The mobile app connects to `http://localhost:5174` by default — both dev servers must run simultaneously
- If using a physical device, the API URL must be changed to the machine's local IP (edit `API_BASE_URL` in `auth-client.ts`)
- The 33 pre-existing type errors from `pnpm check` are unrelated to auth — ignore them
- Better Auth may log `[Better Auth]: secret is too short` warning in the API console — expected with dev default secret
