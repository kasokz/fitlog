# M005: Native Social Login — Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

## Project Description

FitLog is a Capacitor-based mobile fitness tracking app (SvelteKit + static adapter) backed by a SvelteKit web API with Better Auth for authentication, PostgreSQL for server data, and SQLite for local-first storage. Auth currently supports email/password only. The mobile client uses raw `fetch` with Bearer tokens stored in `@capacitor/preferences` (D113).

## Why This Milestone

Users expect one-tap social sign-in on mobile — typing email/password on a phone keyboard is friction that depresses sign-up conversion. Apple requires any app offering third-party login to also offer Sign in with Apple. Adding Google + Apple native sign-in removes the biggest onboarding friction point.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Tap "Continue with Google" on the sign-in or sign-up screen and authenticate via the native Google Credential Manager sheet (iOS + Android)
- Tap "Continue with Apple" on the sign-in screen (iOS only) and authenticate via the native ASAuthorizationController sheet
- Sign in with social on a new device and have their existing data sync automatically (same account linking by email)
- View, connect, and disconnect social accounts from Settings → Connected Accounts
- Continue using email/password sign-in exactly as before

### Entry point / environment

- Entry point: `/auth/sign-in`, `/auth/sign-up` routes in the mobile app, `/settings` route
- Environment: iOS and Android via Capacitor native shell
- Live dependencies involved: Google OAuth (JWKS verification), Apple Sign-In (JWKS verification), Better Auth API server, PostgreSQL

## Completion Class

- Contract complete means: social sign-in/sign-up returns a valid session token, account records are created in the `account` table with correct `providerId`, auth-client stores the token identically to email flow
- Integration complete means: native plugin → idToken → Better Auth server → session → Bearer token → sync works end-to-end on a real device
- Operational complete means: Google and Apple credential revocation doesn't break existing sessions; disconnecting a provider in Settings works cleanly

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A new user can sign up via Google on Android, sign in via Apple on iOS, and both result in a synced account with full data access
- An existing email/password user can sign in with Google (same email) and see their data — accounts auto-linked
- A user can disconnect Google from Settings and still sign in with email/password
- Email/password flow is completely unaffected by the social login additions

## Risks and Unknowns

- **Better Auth `idToken` verification path**: The `sign-in/social` endpoint with `idToken` parameter exists in Better Auth source but is less documented than the redirect flow. Must verify it works with the Bearer plugin for token extraction. — High impact if broken; retire in S01.
- **Apple nonce handling**: Apple Sign-In requires a nonce passed to both the native plugin and Better Auth for verification. Must ensure `@capgo/capacitor-social-login` passes the nonce correctly. — Medium impact; retire in S01.
- **Capacitor plugin compatibility**: `@capgo/capacitor-social-login` must be compatible with the current Capacitor version in use. — Low risk; check during S01 setup.
- **Account linking edge cases**: Better Auth's auto-linking behavior when email matches across providers needs testing — what happens when a Google account email matches an existing email/password user. — Medium impact; retire in S01.

## Existing Codebase / Prior Art

- `apps/web/src/lib/server/auth.ts` — Better Auth server config. Currently: `emailAndPassword`, `jwt()`, `bearer()`, `sveltekitCookies()`. Social providers will be added here.
- `apps/mobile/src/lib/services/auth-client.ts` — Mobile auth service. Raw fetch to `/api/auth/sign-in/email` etc. Social sign-in will add a new `signInWithSocial()` function using the same `storeCredentials` / `extractToken` pattern.
- `apps/web/src/lib/server/db/auth.schema.ts` — Auth DB schema. `account` table already has `providerId`, `accountId`, `accessToken`, `idToken` columns. No migration needed.
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Sign-in page. Social buttons will be added above the form.
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Sign-up page. Same social buttons.
- `apps/mobile/src/routes/settings/+page.svelte` — Settings page. Connected Accounts section will be added after the Auth section.
- `apps/mobile/capacitor.config.ts` — Capacitor config. `SocialLogin` plugin init config will be added.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R041 — Native Google Sign-In (primary)
- R042 — Native Apple Sign-In iOS only (primary)
- R043 — Social Login idToken Handoff to Better Auth (primary)
- R044 — Auto-Link Accounts by Email (primary)
- R045 — Unified Social Sign-In/Sign-Up (primary)
- R046 — Social Buttons Above Email Form (primary)
- R047 — Connected Accounts Management in Settings (primary)
- R048 — Post-Social-Login Sync Trigger (primary)
- R049 — i18n for Social Login UI de + en (primary)
- R050 — Credential Setup Documentation (primary)

## Scope

### In Scope

- Install and configure `@capgo/capacitor-social-login` plugin
- Better Auth server-side `socialProviders` config for Google and Apple
- Mobile `signInWithSocial()` function in auth-client using idToken handoff
- Social login buttons on sign-in and sign-up pages (social-first layout with divider)
- Platform detection: Apple button shown on iOS only, Google on both platforms
- Connected Accounts section in Settings (view providers, connect/disconnect)
- Account auto-linking by email
- Post-social-login `fullSync()` trigger
- All new i18n keys for de and en
- Step-by-step credential setup docs in context

### Out of Scope / Non-Goals

- Facebook, Twitter, or other social providers (R052)
- Apple Sign-In on Android via Chrome Custom Tab (R051 — deferred)
- Web-based OAuth redirect flows
- Changes to the server DB schema (account table already sufficient)
- Custom profile image sync from social providers

## Technical Constraints

- `@capgo/capacitor-social-login` is the plugin (user-specified, not capawesome)
- Better Auth's `sign-in/social` endpoint with `idToken` param is the server-side entry point
- Bearer plugin must still extract the session token from the social sign-in response (same as email flow)
- Apple requires `appBundleIdentifier` in Better Auth config for iOS token audience validation
- Google requires `webClientId` for Credential Manager initialization
- No new DB migration — existing `account` table columns are sufficient

## Integration Points

- **Google Cloud Console** — OAuth 2.0 client IDs (web client ID for token verification, iOS/Android client IDs for native apps)
- **Apple Developer Portal** — Sign in with Apple capability, Service ID configuration
- **Better Auth server** — `socialProviders` config, `sign-in/social` endpoint
- **@capgo/capacitor-social-login** — Native plugin bridge for Google/Apple sign-in
- **Capacitor native projects** — `npx cap sync` after plugin install; iOS entitlements for Apple Sign-In

## Open Questions

- **Better Auth `accountLinking` config**: Does Better Auth auto-link by email by default, or does it need explicit `accountLinking: { enabled: true }` config? — Will verify in S01.
- **Token extraction for social sign-in**: Does the Bearer plugin's `set-auth-token` header work identically on the social sign-in response? — Will verify in S01.

## Credential Setup Guide

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Credentials
2. Create an OAuth 2.0 Client ID with type "Web application" — this is the `webClientId` used for token verification
3. Create an OAuth 2.0 Client ID with type "iOS" — bundle ID: `com.fitlog.app`
4. Create an OAuth 2.0 Client ID with type "Android" — package name: `com.fitlog.app`, SHA-1 from your signing keystore
5. Enable the "Google Sign-In" API
6. Set env vars: `GOOGLE_CLIENT_ID` (web client ID), `GOOGLE_CLIENT_SECRET` (web client secret)
7. Pass the web client ID as `webClientId` in `SocialLogin.initialize()`

### Apple Developer Portal

1. Go to [Apple Developer](https://developer.apple.com/) → Certificates, Identifiers & Profiles
2. Enable "Sign in with Apple" capability on the App ID `com.fitlog.app`
3. Create a Service ID for web-based verification (used by Better Auth server)
4. Generate a private key for Sign in with Apple
5. Set env vars: `APPLE_CLIENT_ID` (Service ID), `APPLE_CLIENT_SECRET` (JWT signed with the private key)
6. The `appBundleIdentifier` in Better Auth config is `com.fitlog.app`
