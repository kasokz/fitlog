---
id: T01
parent: S01
milestone: M005
provides:
  - Better Auth social provider config (Google + Apple) with account linking
  - Social sign-in endpoint `/api/auth/sign-in/social/token` available
  - Env var templates for social provider credentials
key_files:
  - apps/web/src/lib/server/auth.ts
  - apps/web/.env.example
  - apps/web/.env
key_decisions:
  - Import social providers from `better-auth/social-providers` (re-exports from @better-auth/core)
  - Use dev placeholder strings for social env vars (real credentials needed only at integration testing)
patterns_established:
  - Social providers added as array to `socialProviders` config key
observability_surfaces:
  - `/api/auth/sign-in/social/token` endpoint available after server restart
  - Account linking observable via `account` DB table rows with `providerId: 'google'` or `'apple'`
duration: 15m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Add social providers to Better Auth server config

**Added Google and Apple social providers to Better Auth config with account linking and Apple trusted origin.**

## What Happened

Added `google()` and `apple()` provider factories from `better-auth/social-providers` to the existing `betterAuth()` config in `auth.ts`. Both providers read `clientId` and `clientSecret` from env vars. Apple provider includes `appBundleIdentifier: 'com.fitlog.app'` for iOS native token audience validation. Configured `account.accountLinking.trustedProviders` with `['google', 'apple', 'email-password']` so social sign-ins with matching emails auto-link to existing accounts. Added `trustedOrigins: ['https://appleid.apple.com']` for Apple token response handling. Added 4 env var placeholders to `.env.example` and dev placeholder values to `.env`.

## Verification

- `pnpm --filter web build` — passed, no errors
- `grep -c 'socialProviders' apps/web/src/lib/server/auth.ts` — returns 1
- All 6 must-haves confirmed via grep: socialProviders.google, socialProviders.apple with appBundleIdentifier, trustedProviders, trustedOrigins, env var placeholders in both .env files

Slice-level checks status:
- `pnpm --filter web build` — PASS
- `pnpm --filter mobile test -- --grep "signInWithSocial"` — not yet applicable (T02)
- `pnpm --filter mobile build` — not yet applicable (T03)
- `pnpm --filter mobile exec cap sync` — not yet applicable (T02/T03)
- UAT — not yet applicable (T03)

## Diagnostics

- Verify providers registered: `grep 'socialProviders' apps/web/src/lib/server/auth.ts`
- Social sign-in endpoint: `POST /api/auth/sign-in/social/token` with `{ provider: 'google', idToken: { token, accessToken?, nonce? } }`
- Missing env vars fail at request time (idToken verification), not at server startup
- Account linking creates rows in `account` table with `providerId: 'google'` or `'apple'`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/lib/server/auth.ts` — added social providers, account linking, trusted origins
- `apps/web/.env.example` — added 4 social provider env var placeholders
- `apps/web/.env` — added 4 social provider dev values
