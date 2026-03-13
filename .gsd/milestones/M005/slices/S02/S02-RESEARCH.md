# S02: Apple Sign-In + Auth UI Finalization — Research

**Date:** 2026-03-13

## Summary

S02 builds on a solid S01 foundation — all the hard infrastructure is done. The plugin wrapper (`loginWithApple`), the auth-client (`signInWithSocial` with nonce param), the server config (Apple social provider), and the reusable `SocialLoginButtons` component are all in place. The remaining work is: (1) add Apple button + nonce generation inside `SocialLoginButtons`, (2) forward Apple user profile data on first auth, (3) wire the same component + divider to the sign-up page, (4) conditionally show Apple only on iOS, (5) add iOS entitlements for Apple Sign-In, (6) fix a URL bug in auth-client, and (7) add i18n keys.

One surprise: the social sign-in endpoint URL in `auth-client.ts` is wrong — it uses `/api/auth/sign-in/social/token` but Better Auth registers the endpoint at `/sign-in/social` (becoming `/api/auth/sign-in/social`). This hasn't surfaced because no integration test has hit the real server yet. Must fix in S02.

A second finding: `signInWithSocial` doesn't forward the Apple user profile (name, email) in the `idToken.user` field. Apple only provides user name on the first authorization attempt — if we don't forward it to Better Auth, the server user record will have no name. The Better Auth social sign-in schema explicitly supports an `idToken.user` object with `name: { firstName, lastName }` and `email`. The plugin wrapper's `AppleProviderResponse.profile` provides these fields.

## Recommendation

Structure S02 as two tasks:

**T01: Apple Sign-In wiring + endpoint URL fix.** Add `handleAppleSignIn()` to `SocialLoginButtons` with nonce generation via `crypto.randomUUID()`. Add Apple button (black, Apple logo SVG) conditionally rendered via `isIOS()`. Extend `signInWithSocial()` to accept optional `user` parameter for Apple profile data forwarding. Fix the endpoint URL from `/api/auth/sign-in/social/token` to `/api/auth/sign-in/social`. Update the unit test URL assertion. Add `com.apple.developer.applesignin` to iOS entitlements. Run `pnpm cap sync`.

**T02: Sign-up page social buttons + divider + i18n.** Add `SocialLoginButtons` + divider to sign-up page (same pattern as sign-in). Extract the "or" divider into the `SocialLoginButtons` component (or keep inline — small enough to copy). Add new i18n keys (`auth_social_apple_button`) to both de.json and en.json. Verify key counts match.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Apple nonce generation | `crypto.randomUUID()` | Produces a 36-char random string sufficient for nonce. Available in all target runtimes. No library needed. |
| Platform detection | `isIOS()` from `$lib/utils/platform.ts` | Already created in S01, wraps `Capacitor.getPlatform()`. |
| Social login plugin | `loginWithApple(nonce)` from `social-login-plugin.ts` | Already created in S01, handles try/catch, cancel detection, `[SocialLogin]` logging. |
| Auth endpoint call | `signInWithSocial(provider, idToken, accessToken, nonce)` | Already created in S01, handles token extraction, user extraction, credential storage. |
| UI component reuse | `SocialLoginButtons.svelte` | Takes `onSuccess` callback — designed for reuse on both sign-in and sign-up pages. |

## Existing Code and Patterns

- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — Currently renders only Google button. Apple button + handler will be added here. Uses `loading` state to prevent double-taps. Calls `onSuccess` callback for caller-controlled post-auth behavior.
- `apps/mobile/src/lib/services/social-login-plugin.ts` — `loginWithApple(nonce)` already implemented. Returns `AppleSocialLoginResult` with `idToken`, `accessToken`, and `nonce`. The `AppleProviderResponse.profile` fields (`givenName`, `familyName`, `email`) need to be forwarded — currently discarded by the wrapper's return type.
- `apps/mobile/src/lib/services/auth-client.ts` — `signInWithSocial()` sends body `{ provider, idToken: { token, accessToken, nonce } }`. Needs extending to include `idToken.user` for Apple profile forwarding. **Endpoint URL bug**: currently `/api/auth/sign-in/social/token`, should be `/api/auth/sign-in/social`.
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Already has social buttons + "or" divider above email form. Pattern to replicate on sign-up page.
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — No social buttons yet. Needs same pattern: `<SocialLoginButtons>` + divider above `<SignUpForm />`.
- `apps/mobile/ios/App/App/App.entitlements` — Has `com.apple.developer.in-app-purchases` but missing `com.apple.developer.applesignin`. Must add for Apple Sign-In capability.

## Constraints

- **Apple Sign-In button branding**: Apple's HIG requires specific styling — dark/black button with Apple logo. The Google button uses `variant="outline"` with an SVG logo. Apple button should use a dark/filled style.
- **Apple user info only on first auth**: Apple provides `givenName`, `familyName`, and `email` in the plugin response's `profile` field only on the first authorization. Subsequent sign-ins return `null` for name fields. This data must be forwarded in the `idToken.user` body field on the Better Auth request so the server stores it on first account creation.
- **`crypto.randomUUID()` for nonce**: Nonce must be a unique random string per sign-in attempt. `crypto.randomUUID()` is available in all target runtimes (Safari, Chrome, JSC, V8). The native plugin internally SHA-256 hashes it before embedding in the Apple JWT's `nonce` claim. Better Auth's `verifyIdToken` hashes the raw nonce server-side to compare.
- **iOS only**: Apple button must only render on iOS (per roadmap). Use `isIOS()` from `platform.ts`. On Android and web, only Google button shows.
- **Better Auth endpoint path**: The registered endpoint is `/sign-in/social` (not `/sign-in/social/token`). SvelteKit handler mounts this at `/api/auth/sign-in/social`.

## Common Pitfalls

- **Not forwarding Apple user profile** — If the `idToken.user` field is omitted, Better Auth creates a user record with an empty name. Apple only sends this data once. Recovery requires the user to re-authorize the app in Apple ID settings and sign in again. Must get this right on first implementation.
- **Nonce mismatch** — The same nonce string must be passed to both `loginWithApple(nonce)` (which the plugin hashes for the JWT) and `signInWithSocial('apple', idToken, accessToken, nonce)` (which Better Auth hashes to verify). If different nonces are used, verification fails.
- **Loading state for two buttons** — Both Google and Apple buttons share the same `loading` state in `SocialLoginButtons`. This is actually correct — you shouldn't be able to tap Apple while a Google sign-in is in progress, and vice versa.
- **Wrong endpoint URL** — The S01 bug (`/social/token` instead of `/social`) will cause a 404 on real integration. Tests mock `fetch` so they don't catch it. Must fix the URL and update the test assertion.

## Open Risks

- **Plugin nonce handling on web**: `loginWithApple` returns `null` on web (guarded by `isNative()`), so the Apple button won't work in dev mode. Not a risk per se, but developers can only test this on a real iOS device/simulator.
- **Apple Sign-In capability in Xcode**: Adding the entitlement to `App.entitlements` is necessary but may not be sufficient — the capability also needs to be enabled in the Apple Developer Portal's App ID configuration. This is a credential setup step, not a code change.
- **`loginWithApple` wrapper discards `profile`**: The current wrapper returns `{ idToken, accessToken, nonce }` but the native response also has `profile: { user, email, givenName, familyName }`. The wrapper's return type (`AppleSocialLoginResult`) needs extending to include profile fields, or the wrapper function itself needs updating to extract and return them.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Better Auth | `better-auth/skills@better-auth-best-practices` (22.1K installs) | available — not needed, patterns established in S01 |
| Capacitor Social Login | `g1joshi/agent-skills@capacitor` (3 installs) | available — too low installs, not relevant |
| SvelteKit | — | none installed, already well-known in codebase |

No skills worth installing — the codebase patterns from S01 and the reference project are sufficient.

## Requirement Coverage

| Requirement | Relevance | Notes |
|------------|-----------|-------|
| R042 — Native Apple Sign-In iOS only | **Primary** | Apple button + nonce flow + entitlements. This is the core deliverable. |
| R045 — Unified Social Sign-In/Sign-Up | **Primary** | Social buttons on both sign-in and sign-up pages with identical behavior. |
| R046 — Social Buttons Above Email Form | **Primary** | Sign-up page needs the same social-first layout with divider. |
| R048 — Post-Social-Login Sync Trigger | **Supporting** | Already handled by `SocialLoginButtons` calling `fullSync()` — just needs verification it works for Apple too. |
| R049 — i18n for Social Login UI de + en | **Primary** | New Apple button key + verify complete coverage. |

## Sources

- Better Auth sign-in social endpoint source (`apps/web/node_modules/better-auth/dist/api/routes/sign-in.mjs.map`) — confirmed endpoint is `/sign-in/social`, accepts `idToken.user` with `name.firstName/lastName` and `email`
- `@capgo/capacitor-social-login` type definitions (`definitions.d.ts`) — confirmed `AppleProviderOptions.nonce`, `AppleProviderResponse.profile` with `givenName/familyName/email`
- Apple Sign-In HIG — black/dark button with Apple logo is the standard
