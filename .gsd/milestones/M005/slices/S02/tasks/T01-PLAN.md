---
estimated_steps: 8
estimated_files: 7
---

# T01: Wire Apple Sign-In with nonce, profile forwarding, and endpoint fix

**Slice:** S02 — Apple Sign-In + Auth UI Finalization
**Milestone:** M005

## Description

Extends the social login infrastructure from S01 to fully support Apple Sign-In. Three concerns in one task: (1) fix the endpoint URL bug from S01 that would cause a 404 on real integration, (2) extend the plugin wrapper and auth-client to forward Apple user profile data so the server creates user records with names, (3) add the Apple button to `SocialLoginButtons` with nonce generation and iOS-only rendering.

## Steps

1. **Extend `loginWithApple` return type** in `social-login-plugin.ts`: add `profile?: { email: string | null; givenName: string | null; familyName: string | null }` to `AppleSocialLoginResult`. Update the function to extract `result.profile` fields and include them in the return value.

2. **Extend `signInWithSocial` signature** in `auth-client.ts`: add optional `user` parameter typed as `{ name?: { firstName?: string; lastName?: string }; email?: string }`. When provided, include it as `idToken.user` in the request body JSON.

3. **Fix endpoint URL** in `auth-client.ts`: change `${API_BASE_URL}/api/auth/sign-in/social/token` to `${API_BASE_URL}/api/auth/sign-in/social`.

4. **Update test assertions** in `auth-client.test.ts`: change the URL assertion from `/api/auth/sign-in/social/token` to `/api/auth/sign-in/social`. Add a new test case verifying that when `user` param is provided, the request body includes `idToken.user` with the correct shape.

5. **Add `handleAppleSignIn()`** in `SocialLoginButtons.svelte`: generate nonce via `crypto.randomUUID()`, call `loginWithApple(nonce)`, extract profile from result, call `signInWithSocial('apple', idToken, accessToken, nonce, user)` with profile data mapped to `{ name: { firstName, lastName }, email }`. Same loading/toast/error pattern as Google handler.

6. **Add Apple button** in `SocialLoginButtons.svelte`: render conditionally with `{#if isIOS()}`. Black/filled style button with Apple logo SVG. Shares `loading` state with Google button (mutual exclusion).

7. **Add iOS entitlement**: add `com.apple.developer.applesignin` with value `['Default']` to `apps/mobile/ios/App/App/App.entitlements`.

8. **Add i18n key**: add `auth_social_apple_button` to both `de.json` ("Mit Apple fortfahren") and `en.json` ("Continue with Apple").

## Must-Haves

- [ ] `loginWithApple` returns profile fields from Apple response
- [ ] `signInWithSocial` forwards `idToken.user` when user param provided
- [ ] Endpoint URL is `/api/auth/sign-in/social` (not `/social/token`)
- [ ] Apple button rendered only on iOS via `isIOS()`
- [ ] Apple button uses black/filled style distinct from Google outline style
- [ ] Nonce generated per sign-in attempt via `crypto.randomUUID()`
- [ ] Same nonce passed to both plugin and auth-client
- [ ] Test for corrected URL passes
- [ ] Test for `idToken.user` field in request body passes
- [ ] `auth_social_apple_button` key present in de.json and en.json
- [ ] `com.apple.developer.applesignin` entitlement in App.entitlements

## Verification

- `pnpm --filter mobile test` — all tests pass including updated URL assertion and new user-forwarding test
- `pnpm --filter mobile build` — app compiles with new component changes
- `grep 'applesignin' apps/mobile/ios/App/App/App.entitlements` — entitlement present
- i18n: `jq 'keys | length' apps/mobile/messages/de.json` equals `jq 'keys | length' apps/mobile/messages/en.json`

## Observability Impact

- Signals added/changed: `[SocialLogin] loginWithApple:` now logs whether profile data was extracted; `[Auth] signInWithSocial:` hits corrected endpoint URL
- How a future agent inspects this: unit tests verify exact request body shape including `idToken.user`; `[SocialLogin]` console logs trace the full nonce + profile flow
- Failure state exposed: if Apple profile forwarding fails, Better Auth creates user with empty name — observable in user table; nonce mismatch causes server 401 visible in `signInWithSocial` error response

## Inputs

- `apps/mobile/src/lib/services/social-login-plugin.ts` — S01 created `loginWithApple()` but discards `result.profile`
- `apps/mobile/src/lib/services/auth-client.ts` — S01 created `signInWithSocial()` with wrong URL and no `user` param
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — S01 created with Google-only button
- S01 forward intelligence: `signInWithSocial` already accepts `nonce` param, `SocialLoginButtons` designed for reuse via `onSuccess` prop

## Expected Output

- `apps/mobile/src/lib/services/social-login-plugin.ts` — `loginWithApple` returns profile alongside idToken/accessToken/nonce
- `apps/mobile/src/lib/services/auth-client.ts` — `signInWithSocial` accepts `user` param, forwards as `idToken.user`, uses corrected endpoint URL
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — URL assertion updated, new test for `idToken.user` field
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — Apple button with nonce + profile forwarding, iOS-only rendering
- `apps/mobile/ios/App/App/App.entitlements` — includes `com.apple.developer.applesignin`
- `apps/mobile/messages/de.json` — `auth_social_apple_button` key added
- `apps/mobile/messages/en.json` — `auth_social_apple_button` key added
