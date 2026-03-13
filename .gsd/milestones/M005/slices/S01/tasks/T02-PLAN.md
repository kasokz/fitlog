---
estimated_steps: 7
estimated_files: 7
---

# T02: Install plugin, add signInWithSocial to auth-client, wire plugin init

**Slice:** S01 — Server Config + Auth Client + Google Sign-In
**Milestone:** M005

## Description

Install `@capgo/capacitor-social-login`, create the social login plugin wrapper (following the purchase-plugin.ts pattern), add the `signInWithSocial()` function to the auth-client, create a platform detection utility, initialize the plugin in the root layout, and write unit tests for the social sign-in flow.

## Steps

1. Install `@capgo/capacitor-social-login` in the mobile app: `pnpm --filter mobile add @capgo/capacitor-social-login`.
2. Create `apps/mobile/src/lib/utils/platform.ts` with `isIOS()` and `isAndroid()` functions using `Capacitor.getPlatform()` from `@capacitor/core`.
3. Create `apps/mobile/src/lib/services/social-login-plugin.ts` following the `purchase-plugin.ts` D073 pattern:
   - `initializeSocialLogin(googleWebClientId: string)` — calls `SocialLogin.initialize()` with `{ google: { webClientId, mode: 'online' }, apple: { clientId: 'com.fitlog.app' } }`. Guards with `Capacitor.isNativePlatform()`. Logs with `[SocialLogin]` prefix.
   - `loginWithGoogle()` — calls `SocialLogin.login({ provider: 'google', options: {} })`, returns `{ idToken, accessToken } | null`. Returns `null` on user cancel or error. Never throws.
   - `loginWithApple(nonce: string)` — calls `SocialLogin.login({ provider: 'apple', options: { nonce } })`, returns `{ idToken, accessToken, nonce } | null`. Returns `null` on user cancel. For S02 scope but define the signature now.
4. Add `signInWithSocial(provider: string, idToken: string, accessToken?: string, nonce?: string)` to `apps/mobile/src/lib/services/auth-client.ts`:
   - POSTs to `${API_BASE_URL}/api/auth/sign-in/social/token` with body `{ provider, idToken: { token: idToken, accessToken, nonce } }`
   - Handles social response body shape: `{ data: { user, session }, error }` — extracts user from `body.data.user` or falls back to `body.user`
   - Uses `extractToken()` for the `set-auth-token` header (primary path)
   - Falls back to `body.data?.session?.token` or `body.token` for body token extraction
   - Calls `storeCredentials()` on success
   - Returns `AuthResult` — same pattern as `signIn()`
   - Logs with `[Auth] signInWithSocial:` prefix
5. Add SocialLogin plugin config to `apps/mobile/capacitor.config.ts` under `plugins.SocialLogin` (empty config — initialization happens at runtime via `initializeSocialLogin()`).
6. Add `SocialLogin.initialize()` call in `apps/mobile/src/routes/+layout.svelte` mount effect — after onboarding check, before `ready = true`. Import and call `initializeSocialLogin()` with the Google web client ID constant. Fire-and-forget (catch and log).
7. Write unit tests in `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` for `signInWithSocial`:
   - Success with token from `set-auth-token` header and social response shape `{ data: { user, session } }`
   - Success with fallback body token
   - HTTP error returns `{ success: false, error }`
   - Network error returns `{ success: false, error }`
   - No token in response returns `{ success: false, error }`
   - Correct request body shape (provider, idToken object)
   - Never throws

## Must-Haves

- [ ] `@capgo/capacitor-social-login` installed in mobile app
- [ ] `social-login-plugin.ts` wrapper with `initializeSocialLogin`, `loginWithGoogle`, `loginWithApple` — never throws, `[SocialLogin]` logging
- [ ] `platform.ts` with `isIOS()` exported
- [ ] `signInWithSocial()` in auth-client handles social response shape and extracts token
- [ ] Plugin initialized in root layout mount effect
- [ ] Unit tests for `signInWithSocial` pass
- [ ] `pnpm --filter mobile build` succeeds

## Verification

- `pnpm --filter mobile test -- --grep "signInWithSocial"` — all tests pass
- `pnpm --filter mobile build` — compiles without errors
- `grep -c 'initializeSocialLogin' apps/mobile/src/routes/+layout.svelte` returns 1

## Observability Impact

- Signals added: `[Auth] signInWithSocial:` log lines (attempting/success/failed/cancelled), `[SocialLogin]` init and login log lines
- How a future agent inspects this: `getAuthState()` after social sign-in returns user info; console logs filterable by `[Auth]` and `[SocialLogin]` prefixes
- Failure state exposed: `signInWithSocial` returns `{ success: false, error: 'specific message' }`; plugin init failure logged but doesn't block app

## Inputs

- `apps/mobile/src/lib/services/auth-client.ts` — existing auth service with `storeCredentials`, `extractToken`, `AuthResult` type
- `apps/mobile/src/lib/services/purchase-plugin.ts` — reference pattern for plugin wrapper (D073 catch-and-return)
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — existing test patterns (mock Preferences, mock fetch, helper functions)
- `apps/mobile/src/routes/+layout.svelte` — existing root layout with mount effect
- S01-RESEARCH.md — endpoint path, request body shape, response shape, plugin init config

## Expected Output

- `apps/mobile/src/lib/services/social-login-plugin.ts` — new plugin wrapper
- `apps/mobile/src/lib/utils/platform.ts` — new platform detection utility
- `apps/mobile/src/lib/services/auth-client.ts` — updated with `signInWithSocial()` function
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — updated with social sign-in tests
- `apps/mobile/src/routes/+layout.svelte` — updated with plugin init call
- `apps/mobile/capacitor.config.ts` — updated with SocialLogin plugin config
