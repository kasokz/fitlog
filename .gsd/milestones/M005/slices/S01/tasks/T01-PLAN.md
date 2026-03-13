---
estimated_steps: 4
estimated_files: 3
---

# T01: Add social providers to Better Auth server config

**Slice:** S01 — Server Config + Auth Client + Google Sign-In
**Milestone:** M005

## Description

Add Google and Apple social providers to the existing Better Auth server configuration. This enables the server to accept and verify idTokens from native social sign-in flows. Also configure account linking with trusted providers so that a Google sign-in with an email matching an existing email/password account auto-links correctly.

## Steps

1. Read `apps/web/src/lib/server/auth.ts` and add `socialProviders` config with `google()` and `apple()` provider factories, reading client IDs and secrets from `env`. Add `account.accountLinking.trustedProviders: ['google', 'apple', 'email-password']`. Add `trustedOrigins: ['https://appleid.apple.com']` to the Better Auth config. Apple provider needs `appBundleIdentifier: 'com.fitlog.app'` (D038).
2. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` placeholder values to `apps/web/.env.example`. Add development values to `apps/web/.env` using `secure_env_collect` or placeholder strings (dev values are sufficient since actual Google/Apple verification happens at integration time).
3. Verify `pnpm --filter web build` succeeds with the new config.
4. Verify the social provider imports resolve correctly (Better Auth exports `google` and `apple` from the appropriate path).

## Must-Haves

- [ ] `socialProviders.google` configured with `clientId`, `clientSecret` from env
- [ ] `socialProviders.apple` configured with `clientId`, `clientSecret`, `appBundleIdentifier: 'com.fitlog.app'` from env
- [ ] `account.accountLinking.trustedProviders` includes `['google', 'apple', 'email-password']`
- [ ] `trustedOrigins` includes `'https://appleid.apple.com'`
- [ ] Env var placeholders in `.env.example`
- [ ] Build succeeds

## Verification

- `pnpm --filter web build` completes without errors
- `grep -c 'socialProviders' apps/web/src/lib/server/auth.ts` returns 1+

## Inputs

- `apps/web/src/lib/server/auth.ts` — existing Better Auth config with emailAndPassword, jwt, bearer, sveltekitCookies
- S01-RESEARCH.md — documents the correct import paths, config shape, and constraints

## Expected Output

- `apps/web/src/lib/server/auth.ts` — updated with socialProviders and accountLinking config
- `apps/web/.env.example` — updated with 4 new env var placeholders
- `apps/web/.env` — updated with dev values for the 4 new env vars

## Observability Impact

- **New endpoints exposed:** Better Auth automatically registers `/api/auth/sign-in/social/token` endpoint for Google and Apple idToken handoff. This endpoint becomes available once the server restarts with the updated config.
- **Inspection:** `grep 'socialProviders' apps/web/src/lib/server/auth.ts` confirms provider registration. The server logs will show provider initialization on startup when `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` env vars are set.
- **Failure visibility:** Missing or empty `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`APPLE_CLIENT_ID`/`APPLE_CLIENT_SECRET` env vars will cause the social provider factories to fail at request time (idToken verification), not at startup. The error response from `/api/auth/sign-in/social/token` will include the provider-specific verification failure.
- **Account linking:** When a social sign-in matches an existing email, the `trustedProviders` config auto-links the account. This is observable in the `account` DB table: a new row with `providerId: 'google'` or `'apple'` linked to the existing user.
