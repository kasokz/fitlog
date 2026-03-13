---
id: T01
parent: S02
milestone: M005
provides:
  - Apple Sign-In plugin wrapper with profile extraction
  - signInWithSocial user param forwarding
  - Corrected social sign-in endpoint URL
  - Apple button in SocialLoginButtons (iOS-only)
  - Apple Sign-In entitlement
  - auth_social_apple_button i18n key
key_files:
  - apps/mobile/src/lib/services/social-login-plugin.ts
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
  - apps/mobile/src/lib/components/SocialLoginButtons.svelte
  - apps/mobile/ios/App/App/App.entitlements
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Renamed internal `user` variable to `responseUser` in signInWithSocial to avoid TDZ conflict with new `user` parameter
  - Apple profile fields cast via Record<string, string | null> since plugin types are not locally installed
  - idToken.user field conditionally included (omitted entirely when user param is undefined) rather than sending null
patterns_established:
  - Social login profile forwarding pattern: plugin extracts profile -> maps to { name: { firstName, lastName }, email } -> forwarded as idToken.user
observability_surfaces:
  - "[SocialLogin] loginWithApple: profile data extracted" / "no profile data (returning sign-in)" logs
  - "[Auth] signInWithSocial:" hits corrected /api/auth/sign-in/social endpoint
  - Unit tests verify exact request body shape including idToken.user field presence/absence
duration: 20m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Wire Apple Sign-In with nonce, profile forwarding, and endpoint fix

**Extended social login infrastructure to fully support Apple Sign-In with nonce generation, profile forwarding, corrected endpoint URL, and iOS-only Apple button rendering.**

## What Happened

1. Extended `AppleSocialLoginResult` with `AppleProfile` type (`email`, `givenName`, `familyName`). Updated `loginWithApple` to extract `result.profile` when available (Apple only sends profile on first authorization) with diagnostic logging.

2. Added optional `user` parameter to `signInWithSocial` typed as `{ name?: { firstName?, lastName? }, email? }`. When provided, the user object is included as `idToken.user` in the request body. The internal `user` variable was renamed to `responseUser` to avoid a TDZ conflict with the new parameter.

3. Fixed endpoint URL from `/api/auth/sign-in/social/token` to `/api/auth/sign-in/social`.

4. Updated test assertions for corrected URL. Added two new tests: one verifying `idToken.user` is included when user param provided (with exact shape check), one verifying it's omitted when not provided. Added explicit check that URL does not contain `/social/token`.

5. Added `handleAppleSignIn()` in SocialLoginButtons with `crypto.randomUUID()` nonce generation, profile-to-user mapping, and same loading/toast/error pattern as Google handler.

6. Added Apple button conditionally rendered with `{#if isIOS()}`, using black/filled style (`bg-black text-white`) distinct from Google's outline style. Shares loading state with Google button for mutual exclusion.

7. Added `com.apple.developer.applesignin` with `Default` array value to App.entitlements.

8. Added `auth_social_apple_button` key to de.json ("Mit Apple fortfahren") and en.json ("Continue with Apple").

## Verification

- `pnpm --filter mobile test` — 534 tests pass across 22 test files (including 3 new signInWithSocial tests)
- `pnpm --filter mobile build` — compiles successfully
- `grep 'applesignin' App.entitlements` — entitlement present
- i18n key count: de.json = 415, en.json = 415 (zero drift)
- Failure path: existing test verifies `signInWithSocial` returns `{ success: false, error: 'Provider not configured' }` on HTTP 403

## Diagnostics

- `[SocialLogin] loginWithApple:` console logs show whether profile data was extracted or absent
- `[Auth] signInWithSocial:` logs confirm corrected endpoint URL in use
- Unit tests at `auth-client.test.ts` verify: (1) URL is `/social` not `/social/token`, (2) `idToken.user` included when user param provided, (3) `idToken.user` absent when user param omitted
- If Apple profile forwarding fails silently, Better Auth creates user with empty name — observable in user table

## Deviations

- Renamed internal `const user` to `const responseUser` in `signInWithSocial` body to avoid TDZ (temporal dead zone) conflict with the new `user` parameter. The original code shadowed the parameter with a local `const user` declaration, causing "Cannot access 'user' before initialization" at runtime.

## Known Issues

- The template-service test file (`src/lib/db/__tests__/template-service.test.ts`) has a pre-existing failure (`no such table: exercises`) unrelated to this task.

## Files Created/Modified

- `apps/mobile/src/lib/services/social-login-plugin.ts` — Added AppleProfile type, extended AppleSocialLoginResult, updated loginWithApple to extract profile data
- `apps/mobile/src/lib/services/auth-client.ts` — Added user param to signInWithSocial, fixed endpoint URL, renamed internal user to responseUser
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — Updated URL assertion, added 3 new tests (user forwarding, user omission, URL non-regression)
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — Added Apple handler with nonce + profile, Apple button with iOS-only rendering
- `apps/mobile/ios/App/App/App.entitlements` — Added com.apple.developer.applesignin entitlement
- `apps/mobile/messages/de.json` — Added auth_social_apple_button key
- `apps/mobile/messages/en.json` — Added auth_social_apple_button key
- `.gsd/milestones/M005/slices/S02/S02-PLAN.md` — Added failure-path verification step
