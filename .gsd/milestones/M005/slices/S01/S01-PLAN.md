# S01: Server Config + Auth Client + Google Sign-In

**Goal:** User can tap "Continue with Google" on the sign-in page, authenticate via native Google Credential Manager, and receive a valid session token stored in Preferences. Server has Google + Apple social providers configured. Auth client has `signInWithSocial()`.
**Demo:** On a real device, tapping the Google button opens the native credential picker. Selecting an account returns to the app signed in, with the token persisted and sync triggered.

## Must-Haves

- Better Auth server config has `socialProviders.google` and `socialProviders.apple` with account linking via `trustedProviders`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` env vars wired
- `signInWithSocial(provider, idToken, accessToken?, nonce?)` function in auth-client returning `AuthResult`
- Social sign-in endpoint response body handled correctly (`{ data: { user, session } }` shape)
- `@capgo/capacitor-social-login` installed and initialized with Google config in root layout
- Google sign-in button on the sign-in page, above the email form with a visual divider
- Post-social-login sync triggered (same `fullSync()` pattern as email sign-in)
- User cancel from credential picker returns silently (no error toast)
- `signInWithSocial` unit tests covering success, error, cancellation, and token extraction
- i18n keys for social login UI in `de.json` and `en.json`
- `isIOS()` platform detection utility exported

## Proof Level

- This slice proves: integration (native plugin → idToken → server → session token → Preferences)
- Real runtime required: yes (native credential picker only works on device)
- Human/UAT required: yes (Google account selection, visual button rendering)

## Verification

- `pnpm --filter mobile test -- --grep "signInWithSocial"` — unit tests for auth-client social flow
- `pnpm --filter web build` — server config compiles without error
- `pnpm --filter mobile build` — mobile app builds successfully
- `pnpm --filter mobile exec cap sync` — Capacitor sync succeeds for both platforms
- UAT: On a real device, tapping "Continue with Google" opens credential picker, selecting an account signs in and navigates to `/programs`

## Observability / Diagnostics

- Runtime signals: `[Auth] signInWithSocial:` prefixed console logs (attempting, success, failed, cancelled), `[SocialLogin]` prefixed logs for plugin init/login
- Inspection surfaces: `getAuthState()` returns social-signed-in user info, Preferences has `auth_token`
- Failure visibility: `signInWithSocial` returns `{ success: false, error: string }` with specific error message; plugin init failures logged with `[SocialLogin]` prefix
- Redaction constraints: idTokens and accessTokens never logged; only provider name and user email logged

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/lib/server/auth.ts` (Better Auth config), `apps/mobile/src/lib/services/auth-client.ts` (existing auth service), `apps/mobile/src/routes/+layout.svelte` (app init), `apps/mobile/src/routes/auth/sign-in/+page.svelte` (sign-in page)
- New wiring introduced in this slice: `socialProviders` in server auth config, `signInWithSocial()` in auth-client, `SocialLogin.initialize()` in root layout, `SocialLoginButtons` component on sign-in page, Capacitor plugin config in `capacitor.config.ts`
- What remains before the milestone is truly usable end-to-end: S02 (Apple Sign-In + sign-up page buttons + divider polish), S03 (Connected Accounts in Settings)

## Tasks

- [x] **T01: Add social providers to Better Auth server config** `est:30m`
  - Why: Server must accept and verify Google/Apple idTokens before any client-side social sign-in can work. This is the foundation all other tasks depend on.
  - Files: `apps/web/src/lib/server/auth.ts`, `apps/web/.env`, `apps/web/.env.example`
  - Do: Add `socialProviders: { google: { clientId, clientSecret, ... }, apple: { clientId, clientSecret, appBundleIdentifier: 'com.fitlog.app' } }` to Better Auth config. Add `account.accountLinking.trustedProviders: ['google', 'apple', 'email-password']`. Add `trustedOrigins: ['https://appleid.apple.com']`. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` to env template with placeholder values. Use `secure_env_collect` for actual dev env vars if needed.
  - Verify: `pnpm --filter web build` succeeds
  - Done when: Server config compiles, social providers registered, env vars templated

- [x] **T02: Install plugin, add signInWithSocial to auth-client, wire plugin init** `est:1h`
  - Why: The mobile client needs the `signInWithSocial()` function to POST idTokens to the server endpoint, and the Capacitor plugin must be installed and initialized for the native credential picker to work. These are tightly coupled — the function calls the plugin, the plugin needs initialization.
  - Files: `apps/mobile/src/lib/services/auth-client.ts`, `apps/mobile/src/lib/services/social-login-plugin.ts`, `apps/mobile/src/lib/utils/platform.ts`, `apps/mobile/src/routes/+layout.svelte`, `apps/mobile/capacitor.config.ts`, `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
  - Do: (1) `pnpm --filter mobile add @capgo/capacitor-social-login`. (2) Create `social-login-plugin.ts` wrapper following purchase-plugin.ts pattern: `initializeSocialLogin()`, `loginWithGoogle()`, `loginWithApple()` — catch-and-return, never throw, `[SocialLogin]` prefix logging. User cancel returns `null` (not error). (3) Create `platform.ts` with `isIOS()` using `Capacitor.getPlatform()`. (4) Add `signInWithSocial(provider, idToken, accessToken?, nonce?)` to auth-client.ts — POSTs to `/api/auth/sign-in/social/token` with `{ provider, idToken: { token, accessToken, nonce } }`, handles social response shape `{ data: { user } }`, extracts token from `set-auth-token` header, calls `storeCredentials()`. (5) Add `SocialLogin.initialize()` call in root `+layout.svelte` mount effect with Google config (`webClientId` from env/constant, `mode: 'online'`). (6) Add plugin config to `capacitor.config.ts`. (7) Write unit tests for `signInWithSocial` covering: success with header token, success with body token fallback, HTTP error, network error, no token in response, correct request body shape.
  - Verify: `pnpm --filter mobile test -- --grep "signInWithSocial"` passes; `pnpm --filter mobile build` succeeds
  - Done when: `signInWithSocial` tested and working, plugin wrapper created, plugin initialized on app mount, `isIOS()` exported

- [x] **T03: Add Google sign-in button to sign-in page with i18n** `est:45m`
  - Why: This is the user-visible deliverable — without the button wired to the plugin and auth-client, there's no demo. The button must appear above the email form with a divider, matching the roadmap's described layout.
  - Files: `apps/mobile/src/lib/components/SocialLoginButtons.svelte`, `apps/mobile/src/routes/auth/sign-in/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: (1) Create `SocialLoginButtons.svelte` component: Google button (full-width, outline variant, Google icon), calls `loginWithGoogle()` from plugin wrapper → on success calls `signInWithSocial()` from auth-client → on success shows toast, navigates to `/programs`, fires `fullSync()`. On user cancel (plugin returns null): do nothing. On error: show error toast. Loading state while authenticating. (2) Add component to sign-in `+page.svelte` above `<SignInForm />` with "or" divider between social buttons and form. (3) Add i18n keys to `de.json` (base locale) and `en.json`: `auth_social_google_button`, `auth_social_divider_or`, `auth_social_signin_success`, `auth_social_signin_error`. (4) `SocialLoginButtons` takes an `onSuccess` callback prop so the parent page controls navigation and sync — keeps it reusable for S02 sign-up page.
  - Verify: `pnpm --filter mobile build` succeeds; visual inspection of sign-in page layout; i18n keys present in both locale files
  - Done when: Google button visible on sign-in page, tapping it calls through to native plugin and auth-client, i18n complete for de and en

## Files Likely Touched

- `apps/web/src/lib/server/auth.ts`
- `apps/web/.env`
- `apps/web/.env.example`
- `apps/mobile/src/lib/services/auth-client.ts`
- `apps/mobile/src/lib/services/social-login-plugin.ts`
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
- `apps/mobile/src/lib/utils/platform.ts`
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte`
- `apps/mobile/src/routes/auth/sign-in/+page.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
