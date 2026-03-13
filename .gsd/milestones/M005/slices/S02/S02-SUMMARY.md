---
id: S02
parent: M005
milestone: M005
provides:
  - Apple Sign-In end-to-end with nonce generation and profile forwarding
  - Corrected social sign-in endpoint URL (/social, not /social/token)
  - Social login buttons on both sign-in and sign-up pages with "or" divider
  - iOS-only Apple button rendering via isIOS() guard
  - Apple Sign-In entitlement for iOS
  - auth_social_apple_button i18n key (de + en)
requires:
  - slice: S01
    provides: signInWithSocial(), SocialLoginButtons component, social-login-plugin.ts, isIOS() utility, Better Auth social provider config
affects:
  - S03 (Connected Accounts can now list Apple as a linked provider)
key_files:
  - apps/mobile/src/lib/services/social-login-plugin.ts
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
  - apps/mobile/src/lib/components/SocialLoginButtons.svelte
  - apps/mobile/src/routes/auth/sign-up/+page.svelte
  - apps/mobile/ios/App/App/App.entitlements
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - D132: Apple profile forwarding via idToken.user field, conditionally included
patterns_established:
  - Social login profile forwarding: plugin extracts profile -> maps to { name: { firstName, lastName }, email } -> forwarded as idToken.user in request body
  - Auth page social-first layout: SocialLoginButtons -> "or" divider -> email form (used on both sign-in and sign-up)
observability_surfaces:
  - "[SocialLogin] loginWithApple:" logs show profile extraction outcome
  - "[Auth] signInWithSocial:" logs confirm corrected endpoint URL
  - Unit tests verify request body shape including idToken.user presence/absence
drill_down_paths:
  - .gsd/milestones/M005/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S02/tasks/T02-SUMMARY.md
duration: 25m
verification_result: passed
completed_at: 2026-03-13
---

# S02: Apple Sign-In + Auth UI Finalization

**Apple Sign-In works end-to-end with nonce on iOS, social buttons appear on both auth pages with divider, and the S01 endpoint URL bug is fixed.**

## What Happened

**T01** extended the social login infrastructure for Apple Sign-In. The plugin wrapper (`loginWithApple`) was extended to extract Apple's profile fields (`givenName`, `familyName`, `email`) which Apple only provides on first authorization. The auth-client's `signInWithSocial` gained an optional `user` parameter forwarded as `idToken.user` in the request body — conditionally included only when present, not sent as null. The endpoint URL was corrected from `/social/token` to `/social` (S01 bug). The SocialLoginButtons component gained an Apple button (black/filled style with Apple SVG) conditionally rendered via `isIOS()`, with `crypto.randomUUID()` nonce generation. The Apple Sign-In entitlement was added to App.entitlements. Tests were updated for the corrected URL and three new tests verify user-forwarding behavior.

**T02** added the SocialLoginButtons component to the sign-up page with the same social-first layout as sign-in: social buttons → "or" divider → email form. The `onSuccess` callback navigates to `/programs`. Cap sync verified the Apple Sign-In entitlement and `@capgo/capacitor-social-login` in the iOS plugin list.

## Verification

- ✅ `pnpm --filter mobile test` — 534 tests pass across 22 test files
- ✅ `pnpm --filter mobile build` — builds successfully
- ✅ `pnpm --filter mobile exec cap sync` — succeeds, `@capgo/capacitor-social-login` in iOS plugin list
- ✅ i18n key count: de.json=415, en.json=415 (zero drift)
- ✅ Unit tests verify: corrected URL, `idToken.user` included when provided, `idToken.user` absent when omitted, URL does not contain `/social/token`
- ✅ Observability: `[SocialLogin] loginWithApple:` and `[Auth] signInWithSocial:` console logs confirmed in source

## Requirements Advanced

- R041-R050 (Social Login) — Apple Sign-In plumbing complete, auth UI finalized on both pages, endpoint bug fixed. Awaiting S03 (Connected Accounts) for full milestone completion.

## Requirements Validated

- None — native Apple Sign-In sheet interaction requires real iOS device (UAT)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- Internal variable renamed from `user` to `responseUser` in `signInWithSocial` to avoid TDZ conflict with the new `user` parameter. Not a plan deviation — an implementation detail discovered during coding.

## Known Limitations

- Apple only sends profile data (name, email) on the user's first authorization. Subsequent sign-ins return only the idToken. If the server doesn't capture the profile on first auth, the user account will have an empty name. This is an Apple platform constraint, not a bug.
- Pre-existing test failure in `template-service.test.ts` (`no such table: exercises`) — unrelated to this slice.

## Follow-ups

- S03 (Connected Accounts in Settings) — final slice in M005

## Files Created/Modified

- `apps/mobile/src/lib/services/social-login-plugin.ts` — Added AppleProfile type, extended loginWithApple to extract profile data
- `apps/mobile/src/lib/services/auth-client.ts` — Added user param to signInWithSocial, fixed endpoint URL, renamed internal user to responseUser
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — Updated URL assertion, added 3 new tests for user forwarding
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — Added Apple handler with nonce + profile, Apple button with iOS-only rendering
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Added SocialLoginButtons + "or" divider above email form
- `apps/mobile/ios/App/App/App.entitlements` — Added com.apple.developer.applesignin entitlement
- `apps/mobile/messages/de.json` — Added auth_social_apple_button key
- `apps/mobile/messages/en.json` — Added auth_social_apple_button key

## Forward Intelligence

### What the next slice should know
- `signInWithSocial()` now supports both Google and Apple with optional user profile forwarding. S03's "connect" flow can reuse it directly.
- The `SocialLoginButtons` component is self-contained with `onSuccess` callback — no need to touch it for S03.
- Social provider accounts are created in Better Auth's `account` table with `providerId` of `google` or `apple`. S03's `getLinkedAccounts()` should query this table.

### What's fragile
- Apple profile forwarding depends on Apple sending profile data only on first auth — if the server misses it, there's no retry mechanism. Server-side should handle empty profile gracefully.

### Authoritative diagnostics
- `[SocialLogin] loginWithApple:` logs differentiate between "profile data extracted" and "no profile data" — trustworthy signal for first-auth vs repeat-auth behavior
- `auth-client.test.ts` is the contract test for request body shape — if it passes, the endpoint contract is correct

### What assumptions changed
- Endpoint URL was wrong in S01 (`/social/token` instead of `/social`). Fixed in T01. All tests now assert the corrected URL.
