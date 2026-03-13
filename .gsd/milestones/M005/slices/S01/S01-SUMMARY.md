---
id: S01
parent: M005
milestone: M005
provides:
  - Better Auth social provider config (Google + Apple) with account linking and trusted origins
  - signInWithSocial(provider, idToken, accessToken?, nonce?) in auth-client returning AuthResult
  - Social login plugin wrapper (initializeSocialLogin, loginWithGoogle, loginWithApple) — never throws
  - Platform detection utilities (isIOS, isAndroid)
  - SocialLoginButtons component with Google sign-in button (reusable via onSuccess prop)
  - Sign-in page wired with social buttons + "or" divider above email form
  - Plugin initialized in root layout mount effect
  - 4 i18n keys (auth_social_*) in de.json and en.json
requires:
  - slice: M004/S01
    provides: Better Auth server config with Bearer plugin, auth-client with signIn/signUp/signOut
affects:
  - S02 (Apple Sign-In + sign-up page reuses SocialLoginButtons, signInWithSocial, plugin wrapper)
  - S03 (Connected Accounts consumes signInWithSocial for connect flow, server social provider config)
key_files:
  - apps/web/src/lib/server/auth.ts
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/social-login-plugin.ts
  - apps/mobile/src/lib/utils/platform.ts
  - apps/mobile/src/lib/components/SocialLoginButtons.svelte
  - apps/mobile/src/routes/auth/sign-in/+page.svelte
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/capacitor.config.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
key_decisions:
  - D129: Social endpoint response shape ({ data: { user, session } }) differs from email endpoint — signInWithSocial handles both via flexible token/user extraction
  - D130: Social login plugin wrapper follows D073 catch-and-return pattern (never throws, null on user cancel)
  - D131: SocialLoginButtons takes onSuccess callback for page-specific navigation — reusable for S02 sign-up page
patterns_established:
  - Social login plugin wrapper follows purchase-plugin.ts pattern (catch-and-return, [SocialLogin] prefix logging, isNative() guard, null on cancel)
  - Token extraction chain: set-auth-token header > body.data.session.token > body.token — covers Bearer, social, and email response shapes
  - User-cancel detection via error message string matching (toLowerCase includes 'cancel')
  - Social button component with onSuccess callback for caller-controlled post-auth behavior
observability_surfaces:
  - "[SocialLogin] initialize:" / "loginWithGoogle:" / "loginWithApple:" prefixed console logs
  - "[Auth] signInWithSocial:" prefixed console logs (attempting/success/failed)
  - "[Auth UI] social sign-in error:" console log on unexpected button handler exceptions
  - signInWithSocial returns { success: false, error: 'specific message' } — idTokens never logged
  - Social sign-in endpoint: POST /api/auth/sign-in/social/token
  - Account linking observable via account table rows with providerId 'google' or 'apple'
drill_down_paths:
  - .gsd/milestones/M005/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M005/slices/S01/tasks/T03-SUMMARY.md
duration: 42m
verification_result: passed
completed_at: 2026-03-13
---

# S01: Server Config + Auth Client + Google Sign-In

**Google social sign-in wired end-to-end: server social providers configured, auth-client extended with signInWithSocial(), Capacitor plugin installed and initialized, Google button on sign-in page above email form with "or" divider.**

## What Happened

Three tasks, each building on the previous:

**T01 (Server Config):** Added `google()` and `apple()` social provider factories from `better-auth/social-providers` to the Better Auth config. Both read credentials from env vars. Apple provider includes `appBundleIdentifier: 'com.fitlog.app'`. Configured `account.accountLinking.trustedProviders: ['google', 'apple', 'email-password']` for automatic account linking when email matches. Added `trustedOrigins: ['https://appleid.apple.com']`. Env var placeholders added to `.env.example` and dev values to `.env`.

**T02 (Plugin + Auth Client):** Installed `@capgo/capacitor-social-login`. Created `social-login-plugin.ts` wrapper following the D073 purchase-plugin pattern — `initializeSocialLogin()`, `loginWithGoogle()`, `loginWithApple()`, all catch-and-return with `[SocialLogin]` prefix logging. User cancel returns `null` (not error). Created `platform.ts` with `isIOS()`/`isAndroid()`. Added `signInWithSocial()` to auth-client — POSTs to `/api/auth/sign-in/social/token`, extracts token via header-first chain, handles both social and email response shapes, calls `storeCredentials()`. Wired plugin init in root layout mount effect. Added 7 unit tests covering success paths, error cases, and request body shape.

**T03 (UI + i18n):** Created `SocialLoginButtons.svelte` with a full-width outline Google button featuring the official "G" SVG logo. Takes `onSuccess` callback prop for reuse on sign-up page in S02. Click flow: loading state → `loginWithGoogle()` → `signInWithSocial()` → toast + navigate + fire-and-forget `fullSync()`. User cancel exits silently (no toast). Updated sign-in page with social buttons above email form and centered "or" divider. Added 4 i18n keys to both `de.json` and `en.json`.

## Verification

- `pnpm --filter mobile test -- --grep "signInWithSocial"` — 532/532 tests pass (7 new + 525 existing)
- `pnpm --filter web build` — server config compiles, social providers registered
- `pnpm --filter mobile build` — mobile app builds successfully
- `pnpm --filter mobile exec cap sync` — syncs iOS + web, `@capgo/capacitor-social-login` in plugin list
- i18n key count: 414 keys in both de.json and en.json (zero drift)
- UAT: requires real device + Google credentials (documented in S01-UAT.md)

## Requirements Advanced

- R026 (Account System / Auth) — extended with social provider sign-in capability (Google + Apple server config, signInWithSocial client function)

## Requirements Validated

- None — full validation requires real device integration testing (UAT)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

None. All three tasks executed as planned.

## Known Limitations

- `GOOGLE_WEB_CLIENT_ID` in the mobile app is a placeholder string — real Google OAuth web client ID must be configured before integration testing
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` in server `.env` are dev placeholders — real credentials needed for integration
- `cap sync` for Android not explicitly run (iOS + web confirmed) — Android sync expected to work identically
- Native credential picker only works on real devices — cannot be verified in web dev mode

## Follow-ups

- Configure real Google OAuth credentials for integration testing
- Configure real Apple credentials for integration testing
- S02 will add Apple sign-in button (iOS only) and wire SocialLoginButtons to sign-up page
- S03 will add Connected Accounts UI in Settings using the same signInWithSocial function

## Files Created/Modified

- `apps/web/src/lib/server/auth.ts` — added social providers (Google + Apple), account linking, trusted origins
- `apps/web/.env.example` — added 4 social provider env var placeholders
- `apps/web/.env` — added 4 social provider dev values
- `apps/mobile/src/lib/services/social-login-plugin.ts` — new: plugin wrapper (init, loginWithGoogle, loginWithApple)
- `apps/mobile/src/lib/utils/platform.ts` — new: isIOS() and isAndroid() platform detection
- `apps/mobile/src/lib/services/auth-client.ts` — added signInWithSocial() function
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — added 7 signInWithSocial tests
- `apps/mobile/src/routes/+layout.svelte` — added initializeSocialLogin() call in mount effect
- `apps/mobile/capacitor.config.ts` — added SocialLogin plugin config
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — new: Google sign-in button component
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — added social buttons + "or" divider above email form
- `apps/mobile/messages/de.json` — added 4 auth_social_* keys
- `apps/mobile/messages/en.json` — added 4 auth_social_* keys

## Forward Intelligence

### What the next slice should know
- `SocialLoginButtons.svelte` is designed for reuse — just import it and pass `onSuccess`. No props needed for provider selection; S02 should add Apple button logic inside the component (conditional on `isIOS()` from `platform.ts`).
- `signInWithSocial()` already accepts a `nonce` parameter — Apple Sign-In nonce support is ready, just needs `loginWithApple(nonce)` from the plugin wrapper to supply it.
- The "or" divider is inline in the sign-in page — S02 may want to extract it if the same pattern is needed on sign-up.

### What's fragile
- User-cancel detection relies on error message string matching (`toLowerCase().includes('cancel')`) — if the plugin changes its error messages, cancels could surface as errors. Low risk but worth knowing.
- `GOOGLE_WEB_CLIENT_ID` placeholder means the plugin init will "succeed" in dev but native login will fail until real credentials are configured.

### Authoritative diagnostics
- `[SocialLogin]` and `[Auth] signInWithSocial:` console logs — these are the trustworthy signal chain for debugging social login issues
- `signInWithSocial` unit tests (7 cases) — prove the auth-client request/response handling is correct independent of the native plugin

### What assumptions changed
- No assumptions changed — the social endpoint response shape, token extraction, and plugin patterns all worked as planned.
