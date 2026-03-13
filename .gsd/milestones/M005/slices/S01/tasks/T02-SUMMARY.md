---
id: T02
parent: S01
milestone: M005
provides:
  - Social login plugin wrapper (initializeSocialLogin, loginWithGoogle, loginWithApple) — never throws
  - signInWithSocial() in auth-client handling social response shape
  - Platform detection utility (isIOS, isAndroid)
  - Plugin initialized in root layout mount effect
key_files:
  - apps/mobile/src/lib/services/social-login-plugin.ts
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/utils/platform.ts
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/capacitor.config.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
key_decisions:
  - Google web client ID passed as string constant ('GOOGLE_WEB_CLIENT_ID') from layout — real credentials injected at integration time, same pattern as API_BASE_URL in auth-client
  - signInWithSocial extracts user from body.data.user (social response) OR body.user (email response) — handles both shapes
  - Token extraction chain: set-auth-token header > body.data.session.token > body.token — covers Bearer plugin, social, and email response shapes
patterns_established:
  - Social login plugin wrapper follows purchase-plugin.ts D073 pattern (catch-and-return, never throws, [SocialLogin] prefix logging, isNative() guard)
  - User-cancel detection via error message string matching (toLowerCase includes 'cancel')
observability_surfaces:
  - "[SocialLogin] initialize:" log lines (success/failed/skipped)
  - "[SocialLogin] loginWithGoogle:" log lines (attempting/success/failed/cancelled)
  - "[SocialLogin] loginWithApple:" log lines (attempting/success/failed/cancelled)
  - "[Auth] signInWithSocial:" log lines (attempting/success/failed) with provider name
  - signInWithSocial returns { success: false, error: 'specific message' } on failure
duration: 15min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Install plugin, add signInWithSocial to auth-client, wire plugin init

**Installed @capgo/capacitor-social-login, created social-login-plugin.ts wrapper and platform.ts utility, added signInWithSocial() to auth-client with social response shape handling, wired plugin init in root layout, and added 7 unit tests.**

## What Happened

1. Installed `@capgo/capacitor-social-login` in mobile app via pnpm.
2. Created `platform.ts` with `isIOS()` and `isAndroid()` using `Capacitor.getPlatform()`.
3. Created `social-login-plugin.ts` following the purchase-plugin.ts D073 pattern:
   - `initializeSocialLogin(googleWebClientId)` — initializes Google (mode: 'online') and Apple (clientId: 'com.fitlog.app')
   - `loginWithGoogle()` — returns `{ idToken, accessToken } | null`, detects user cancel
   - `loginWithApple(nonce)` — returns `{ idToken, accessToken, nonce } | null`, detects user cancel
4. Added `signInWithSocial(provider, idToken, accessToken?, nonce?)` to auth-client:
   - POSTs to `/api/auth/sign-in/social/token` with `{ provider, idToken: { token, accessToken, nonce } }`
   - Token extraction chain: header > body.data.session.token > body.token
   - User extraction: body.data.user > body.user (handles both social and email response shapes)
   - Calls storeCredentials() on success, returns AuthResult
5. Added `SocialLogin` config section to capacitor.config.ts (empty — runtime init via wrapper).
6. Added `initializeSocialLogin()` call in root layout mount effect, fire-and-forget after onboarding check.
7. Added 7 unit tests for signInWithSocial covering success (header token, body fallbacks), HTTP errors, network errors, no-token response, correct request body shape, and never-throws.

## Verification

- `pnpm --filter mobile test -- --grep "signInWithSocial"` — **34/34 auth-client tests pass** (7 new signInWithSocial + 27 existing)
- `pnpm --filter mobile build` — **compiles without errors**
- `pnpm --filter web build` — **compiles without errors** (slice-level check)
- `grep -c 'initializeSocialLogin' apps/mobile/src/routes/+layout.svelte` returns 2 (import + call — plugin is initialized in layout)

## Diagnostics

- Filter social login logs: `[SocialLogin]` prefix (init, login attempts, cancel, errors)
- Filter auth social logs: `[Auth] signInWithSocial:` prefix (attempting, success, failed)
- After social sign-in: `getAuthState()` returns user info, `getStoredToken()` returns bearer token
- Social login failures return `{ success: false, error: 'specific message' }` — idTokens/accessTokens never logged

## Deviations

- `grep -c 'initializeSocialLogin'` returns 2 (import line + call) instead of plan's expected 1. Both are necessary — the intent (plugin initialized in layout) is satisfied.

## Known Issues

- `GOOGLE_WEB_CLIENT_ID` is a placeholder string — real Google OAuth web client ID must be configured before integration testing. Same pattern as `API_BASE_URL` which is also a dev placeholder.
- `cap sync` not run as part of T02 verification — requires native project setup (iOS/Android). Will be verified at slice completion.

## Files Created/Modified

- `apps/mobile/src/lib/services/social-login-plugin.ts` — new: plugin wrapper with initializeSocialLogin, loginWithGoogle, loginWithApple
- `apps/mobile/src/lib/utils/platform.ts` — new: isIOS() and isAndroid() platform detection
- `apps/mobile/src/lib/services/auth-client.ts` — modified: added signInWithSocial() function
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — modified: added 7 signInWithSocial tests
- `apps/mobile/src/routes/+layout.svelte` — modified: import and call initializeSocialLogin() in mount effect
- `apps/mobile/capacitor.config.ts` — modified: added SocialLogin plugin config entry
