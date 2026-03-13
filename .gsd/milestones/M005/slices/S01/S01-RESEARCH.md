# S01: Server Config + Auth Client + Google Sign-In — Research

**Date:** 2026-03-13

## Summary

The integration path is clean. Better Auth v1.5.5 has built-in social provider support via `socialProviders` config that accepts `google()` and `apple()` provider factories. The `@capgo/capacitor-social-login` plugin provides native Google/Apple sign-in sheets and returns `idToken` and `accessToken`. The idToken handoff flow is: native plugin → `SocialLogin.login()` → idToken → POST to Better Auth `/api/auth/sign-in/social/token` → session created → Bearer plugin extracts token into `set-auth-token` header. This is identical to the email sign-in token extraction path already working in `auth-client.ts`.

Account linking defaults to enabled (`accountLinking.enabled: true`, `disableImplicitLinking: false`), so a Google sign-in with an email matching an existing email/password user will auto-link without explicit config. The `trustedProviders` option should explicitly list `['google', 'apple', 'email-password']` as a safety net so linking only happens with verified email providers.

The endpoint path is `/api/auth/sign-in/social/token` (not `/sign-in/social` as the M005-CONTEXT.md stated). The request body shape is `{ provider: 'google', idToken: { token: string, accessToken?: string, nonce?: string } }`. The response wraps the user and session data — the Bearer plugin's `after` hook intercepts the session cookie and sets `set-auth-token` header, so the existing `extractToken()` function works without modification.

## Recommendation

Follow the "native token handoff" pattern documented in Capgo's Better Auth integration guide. On the server, add `socialProviders.google` and `socialProviders.apple` to the existing `betterAuth()` config. On the mobile client, add a `signInWithSocial(provider, idToken, nonce?)` function to `auth-client.ts` that POSTs to `/api/auth/sign-in/social/token` and reuses the existing `storeCredentials()` / `extractToken()` helpers. For the plugin initialization, add `SocialLogin.initialize()` in the root `+layout.svelte` mount effect. The Google sign-in button calls `SocialLogin.login({ provider: 'google' })`, extracts `idToken`, and calls `signInWithSocial()`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Native Google/Apple credential picker | `@capgo/capacitor-social-login` | Same Capgo vendor as fast-sql and native-purchases. Active maintenance. Capacitor 8 compatible. |
| idToken verification (JWKS) | Better Auth `socialProviders.google/apple` | Google/Apple have `verifyIdToken()` that fetches JWKS public keys automatically. No manual JWT validation needed. |
| Token extraction from social response | Better Auth Bearer plugin `after` hook | Already sets `set-auth-token` on every response that creates a session cookie. Works for social sign-in identically to email sign-in. |
| Platform detection | `Capacitor.getPlatform()` from `@capacitor/core` | Returns `'ios'`, `'android'`, or `'web'`. Already in dependencies. |
| Account linking | Better Auth `account.accountLinking` | Enabled by default. Just add `trustedProviders` list. No manual merge logic needed. |

## Existing Code and Patterns

- `apps/web/src/lib/server/auth.ts` — Better Auth server config. Currently has `emailAndPassword`, `jwt()`, `bearer()`, `sveltekitCookies()`. Add `socialProviders` at the same level. Add `account.accountLinking.trustedProviders`. Env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` must be added.
- `apps/mobile/src/lib/services/auth-client.ts` — Mobile auth service. `extractToken()` reads `set-auth-token` header, `storeCredentials()` persists to Preferences. Both reused directly by `signInWithSocial()`. The `API_BASE_URL` constant is already defined. Follow the same catch-and-return `AuthResult` pattern (D073 style).
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — Test patterns: mock `@capacitor/preferences` with Map, mock `fetch` globally, helper functions for mock user/response. New `signInWithSocial` tests follow the same structure.
- `apps/mobile/src/lib/services/purchase-plugin.ts` — Platform guard pattern with `Capacitor.isNativePlatform()`. Reference for the social login plugin wrapper pattern (catch-and-return defaults, never throw).
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Sign-in form with `fullSync().catch(() => {})` after successful sign-in. Social sign-in must trigger the same post-login sync.
- `apps/mobile/src/routes/+layout.svelte` — App root layout with mount-time initialization (onboarding check, purchase revalidation, incremental sync). `SocialLogin.initialize()` call goes here.
- `apps/web/src/hooks.server.ts` — Server hooks. `handleBetterAuth` resolves sessions, `handleApiAuth` guards `/api/` routes. No changes needed — social sign-in goes through `/api/auth/sign-in/social/token` which is under `/api/auth/` (excluded from auth guard).
- `apps/web/src/lib/server/db/auth.schema.ts` — Auth DB schema. `account` table already has `providerId`, `accountId`, `accessToken`, `idToken` columns. No migration needed.
- `capacitor.config.ts` — Capacitor config. `SocialLogin` plugin providers config should be added under `plugins`.

## Constraints

- **Endpoint path is `/api/auth/sign-in/social/token`** — Not `/api/auth/sign-in/social` as M005-CONTEXT.md initially stated. The `/token` suffix is required for the idToken handoff flow (vs the redirect-based OAuth flow at `/sign-in/social`).
- **Google requires `mode: 'online'`** — The `@capgo/capacitor-social-login` plugin must be initialized with `google.mode: 'online'` to return an `idToken`. Offline mode returns only `serverAuthCode` which Better Auth doesn't consume.
- **Apple `appBundleIdentifier` required** — Better Auth's Apple provider needs `appBundleIdentifier: 'com.fitlog.app'` (D038) so it validates the idToken audience against the iOS bundle ID, not the Service ID.
- **Raw fetch, not Better Auth client SDK** — Per D113, the mobile app uses raw `fetch` against Better Auth REST endpoints. No `createAuthClient()` or `authClient.signIn.social()` — POST directly to the endpoint.
- **Apple nonce round-trip** — Apple Sign-In requires generating a nonce client-side (`crypto.randomUUID()`) and passing it to both `SocialLogin.login({ options: { nonce } })` AND the Better Auth endpoint body `idToken.nonce`. This is for S02 scope but the server config enables it in S01.
- **`GOOGLE_CLIENT_SECRET` required** — Even though native mobile uses only the `clientId` (web client ID) and token verification happens via JWKS, Better Auth's Google provider constructor requires `clientSecret` as a non-optional parameter. The web client secret from Google Cloud Console must be set.
- **No DB migration needed** — The existing `account` table in Postgres already has all columns needed for social providers (`providerId`, `accountId`, `accessToken`, `idToken`, etc.). Better Auth creates account records automatically when a social sign-in succeeds.
- **CORS consideration** — The mobile app makes cross-origin requests to the API. The `set-auth-token` header must be in `Access-Control-Expose-Headers`. The Bearer plugin's `after` hook already adds this automatically.

## Common Pitfalls

- **Using the wrong endpoint** — `/api/auth/sign-in/social` is the redirect-based OAuth flow. For native idToken handoff, use `/api/auth/sign-in/social/token`. Using the wrong one will get a redirect response instead of a JSON session.
- **Missing `mode: 'online'` for Google** — Default mode may vary. Without `mode: 'online'`, the plugin may return `serverAuthCode` instead of `idToken`, and `idToken` will be `undefined`. Explicitly set `google.mode: 'online'` in `SocialLogin.initialize()`.
- **Not passing `accessToken` alongside `idToken`** — The Better Auth endpoint documents `accessToken` as required in the `idToken` object. In practice, Google `mode: 'online'` returns both `idToken` and `accessToken.token`. Pass both to be safe; the server uses the idToken for verification but may use the accessToken to fetch additional profile data.
- **Apple nonce not matching** — If the nonce passed to the native plugin and the nonce passed to Better Auth don't match, Apple idToken verification will fail silently. Must use the exact same string for both. Generate once, use twice.
- **`SocialLogin.login()` returning `null` on user cancel** — User dismissing the Google credential picker returns `null` or throws. The wrapper must catch this and return a non-error result (similar to D081 for purchase cancellation). No error toast on cancel.
- **Account linking race condition** — Two near-simultaneous social sign-ins with the same email could create a race in account linking. Low probability but worth noting. Better Auth handles this at the DB level with unique constraints.
- **`trustedOrigins` for Apple** — The Capgo integration guide adds `trustedOrigins: ['https://appleid.apple.com']` to the Better Auth config. This may be needed for Apple's token response handling. Include it.

## Open Risks

- **`@capgo/capacitor-social-login` Capacitor 8 compatibility** — The plugin is from the same Capgo vendor as `capacitor-fast-sql` and `native-purchases` (both Cap 8 compatible), but must be verified at install time. If `pnpm add` or `cap sync` fails, this blocks the entire slice.
- **Google sign-in response shape changes** — The `SocialLogin.login()` return type wraps the result in a `{ result: { responseType, idToken, accessToken } }` shape. If the plugin version changes this shape, the wrapper breaks. Pin the version after successful install.
- **Bearer plugin `set-auth-token` on social response** — Confirmed by reading the plugin source: the `after` hook fires on any response with `set-cookie`, extracts the session token, and exposes it via `set-auth-token`. However, there's a subtle edge: if Better Auth's social endpoint doesn't set a cookie (e.g., returns an error), the header won't be present. The `extractToken()` fallback to `body.token` is important to keep but the social endpoint response body wraps data differently (`{ data: { user, session }, error }`) than the email endpoint (`{ token, user }`). Must handle both response shapes.
- **Social endpoint response body structure** — The API docs show the response as `{ data: { user: {...}, session: {...} }, error: null }` which differs from the email sign-in response `{ token: '...', user: {...} }`. The `extractToken()` function should primarily rely on the `set-auth-token` header (which always works), with the body token extraction as fallback adapting to the social response shape.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Better Auth | `better-auth/skills@better-auth-best-practices` (22.1K installs) | available — worth installing for the overall auth setup patterns |
| Better Auth | `better-auth/skills@create-auth-skill` (8.7K installs) | available — less relevant (creates custom auth plugins) |
| Capacitor Social Login | `g1joshi/agent-skills@capacitor` (3 installs) | available — very low adoption, skip |
| OAuth Social Login | `dadbodgeoff/drift@oauth-social-login` (32 installs) | available — generic OAuth, not Capacitor-specific, skip |

## Sources

- Better Auth social sign-in endpoint is `POST /auth/sign-in/social/token` with `{ provider, idToken: { token, accessToken?, nonce? } }` body (source: [Better Auth API docs](https://context7.com/better-auth/better-auth/llms.txt))
- Account linking enabled by default: `accountLinking.enabled: true`, `disableImplicitLinking: false` (source: Better Auth core types `init-options.d.mts`)
- Bearer plugin `after` hook adds `set-auth-token` header on any response that sets a session cookie (source: `better-auth/dist/plugins/bearer/index.mjs` — confirmed by reading the actual source code)
- `@capgo/capacitor-social-login` init: `SocialLogin.initialize({ google: { webClientId, mode: 'online' }, apple: { clientId, useProperTokenExchange: true } })` (source: [Capgo Getting Started](https://capgo.app/docs/plugins/social-login/getting-started/))
- Capgo Better Auth integration pattern: native `SocialLogin.login()` → extract `idToken` → `authClient.signIn.social()` with `idToken.token` and `idToken.accessToken` (source: [Capgo Better Auth Integration](https://capgo.app/docs/plugins/social-login/better-auth/))
- Apple provider needs `appBundleIdentifier` for iOS native token audience validation (source: Better Auth Apple provider types `apple.d.mts`)
- Google provider has `verifyIdToken(token, nonce)` method — JWKS verification is handled internally (source: Better Auth Google provider types `google.d.mts`)
- `trustedProviders` config controls which providers can auto-link by email (source: Better Auth core types `init-options.d.mts`)
