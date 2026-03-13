# S02: Apple Sign-In + Auth UI Finalization

**Goal:** Apple Sign-In works end-to-end with nonce on iOS, social buttons appear on both auth pages, endpoint URL bug is fixed, and Apple user profile is forwarded on first auth.
**Demo:** iOS shows both Google and Apple buttons on sign-in and sign-up pages. Android shows Google only. Tapping the Apple button generates a nonce, calls the native Apple Sign-In sheet, forwards the idToken + nonce + user profile to the corrected server endpoint, and stores a valid session.

## Must-Haves

- Apple button in `SocialLoginButtons` conditionally rendered via `isIOS()` — black/filled style with Apple logo SVG
- Nonce generated via `crypto.randomUUID()` and passed to both `loginWithApple(nonce)` and `signInWithSocial('apple', idToken, accessToken, nonce, user)`
- `loginWithApple` wrapper returns Apple user profile fields (`givenName`, `familyName`, `email`) alongside idToken
- `signInWithSocial` accepts optional `user` param and forwards as `idToken.user` in request body for Apple profile data
- Endpoint URL fixed from `/api/auth/sign-in/social/token` to `/api/auth/sign-in/social`
- Test assertion updated to match corrected URL
- Sign-up page has `SocialLoginButtons` + "or" divider above email form (same pattern as sign-in)
- `com.apple.developer.applesignin` entitlement added to iOS
- i18n key `auth_social_apple_button` in de.json and en.json
- `pnpm cap sync` succeeds for iOS
- All existing tests pass

## Proof Level

- This slice proves: integration (Apple nonce round-trip, profile forwarding, UI composition)
- Real runtime required: yes (native Apple Sign-In sheet only on real iOS device)
- Human/UAT required: yes (native credential picker interaction)

## Verification

- `pnpm --filter mobile test` — all tests pass (including updated URL assertion and new user-forwarding test)
- `pnpm --filter mobile build` — mobile app builds successfully
- `pnpm --filter mobile exec cap sync` — iOS sync succeeds with Apple Sign-In entitlement
- i18n key count: same count in de.json and en.json (zero drift)
- Manual: sign-in and sign-up pages both render social buttons above email form with divider
- Failure path: unit test verifies `signInWithSocial` returns `{ success: false, error }` with specific message on HTTP error (e.g. nonce mismatch returns 403); `loginWithApple` returns `null` on cancel/error — both paths covered by existing and new tests

## Observability / Diagnostics

- Runtime signals: `[SocialLogin] loginWithApple:` logs include profile data extraction outcome; `[Auth] signInWithSocial:` logs show corrected endpoint URL
- Inspection surfaces: unit tests verify request body shape including `idToken.user` field
- Failure visibility: `signInWithSocial` returns `{ success: false, error }` with specific message — profile/nonce issues surfaced in server-side verification errors

## Integration Closure

- Upstream surfaces consumed: `SocialLoginButtons.svelte`, `social-login-plugin.ts`, `auth-client.ts`, `platform.ts` — all from S01
- New wiring introduced in this slice: Apple button + handler in `SocialLoginButtons`, sign-up page imports `SocialLoginButtons`, `idToken.user` field in social sign-in request body
- What remains before the milestone is truly usable end-to-end: S03 (Connected Accounts in Settings)

## Tasks

- [x] **T01: Wire Apple Sign-In with nonce, profile forwarding, and endpoint fix** `est:45m`
  - Why: Core Apple Sign-In plumbing — extends the plugin wrapper, auth-client, and UI component to support Apple end-to-end. Fixes the S01 endpoint URL bug before it causes a 404 in production.
  - Files: `social-login-plugin.ts`, `auth-client.ts`, `SocialLoginButtons.svelte`, `auth-client.test.ts`, `App.entitlements`, `de.json`, `en.json`
  - Do: (1) Extend `loginWithApple` return type to include `profile` fields. (2) Add optional `user` param to `signInWithSocial` and forward as `idToken.user`. (3) Fix endpoint URL `/social/token` → `/social`. (4) Add `handleAppleSignIn()` in `SocialLoginButtons` with `crypto.randomUUID()` nonce. (5) Add Apple button with black style + Apple SVG, conditional on `isIOS()`. (6) Add Apple Sign-In entitlement. (7) Add `auth_social_apple_button` i18n key. (8) Update test URL assertion and add test for `user` field in request body.
  - Verify: `pnpm --filter mobile test` passes, `pnpm --filter mobile build` succeeds
  - Done when: Apple button renders on iOS only, `signInWithSocial` sends corrected URL with `idToken.user` field, all tests green

- [x] **T02: Add social buttons to sign-up page and run final sync** `est:15m`
  - Why: Completes the auth UI — sign-up page gets the same social-first layout as sign-in. Final build + sync verification.
  - Files: `sign-up/+page.svelte`
  - Do: (1) Import `SocialLoginButtons` and add above `SignUpForm` with the same "or" divider pattern from sign-in page. (2) Wire `onSuccess` to navigate to `/programs`. (3) Run `pnpm cap sync` and verify entitlement appears.
  - Verify: `pnpm --filter mobile build` succeeds, `pnpm --filter mobile exec cap sync` succeeds, i18n key counts match between de.json and en.json
  - Done when: Sign-up page renders social buttons + divider above email form, cap sync succeeds with Apple Sign-In entitlement in output

## Files Likely Touched

- `apps/mobile/src/lib/services/social-login-plugin.ts`
- `apps/mobile/src/lib/services/auth-client.ts`
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte`
- `apps/mobile/src/routes/auth/sign-up/+page.svelte`
- `apps/mobile/ios/App/App/App.entitlements`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
