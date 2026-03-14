# M005: Native Social Login

**Vision:** Users can sign in to FitLog with one tap using their Google or Apple account, with the same seamless session and sync experience as email/password auth.

## Success Criteria

- User can tap "Continue with Google" and authenticate via the native OS credential picker on both iOS and Android
- User can tap "Continue with Apple" and authenticate via the native ASAuthorizationController on iOS
- Social sign-in creates a valid Better Auth session with Bearer token stored in Preferences
- Existing email/password user signing in with Google (same email) sees their existing data — accounts auto-linked
- Post-social-login sync triggers automatically
- Users can view and disconnect social providers from Settings
- Email/password sign-in flow is completely unaffected
- All UI strings are localized in de and en

## Key Risks / Unknowns

- Better Auth `idToken` verification path with Bearer plugin token extraction — untested in this stack
- Apple nonce round-trip between native plugin and Better Auth server verification
- Account auto-linking behavior when email matches across providers

## Proof Strategy

- idToken + Bearer token extraction → retire in S01 by proving a Google sign-in returns a valid Bearer token from the `set-auth-token` header
- Apple nonce handling → retire in S01 by proving Apple sign-in with nonce produces a valid session
- Account linking → retire in S01 by proving a social sign-in with an email matching an existing email/password account links correctly

## Verification Classes

- Contract verification: auth-client unit behavior (token storage, error handling), server config validation
- Integration verification: native plugin → idToken → Better Auth server → session token → Preferences storage → sync trigger — must be exercised on a real device or simulator
- Operational verification: sign-out clears social state, disconnect provider in Settings, re-sign-in works
- UAT / human verification: native sign-in sheets appear correctly on iOS/Android, buttons render properly, divider looks right

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete
- Google sign-in works end-to-end on both iOS and Android
- Apple sign-in works end-to-end on iOS
- Account linking verified with existing email/password account
- Connected Accounts section in Settings allows view/disconnect
- Email/password flow verified unaffected
- All i18n keys present in de.json and en.json
- `pnpm cap sync` succeeds for both platforms

## Requirement Coverage

- Covers: R041, R042, R043, R044, R045, R046, R047, R048, R049, R050
- Partially covers: none
- Leaves for later: R051 (Apple on Android), R052 (other social providers)
- Orphan risks: none

## Slices

- [x] **S01: Server Config + Auth Client + Google Sign-In** `risk:high` `depends:[]`
  > After this: User can tap "Continue with Google" on the sign-in page, authenticate via native Credential Manager, and receive a valid session token stored in Preferences. Server has Google + Apple social providers configured. Auth client has `signInWithSocial()`. Verified on a real device.

- [x] **S02: Apple Sign-In + Auth UI Finalization** `risk:medium` `depends:[S01]`
  > After this: iOS users see both Google and Apple buttons. Android users see Google only. Apple Sign-In works end-to-end with nonce. Social buttons appear above email form with divider on both sign-in and sign-up pages. Post-login sync triggers. All i18n keys in de and en.

- [x] **S03: Connected Accounts in Settings** `risk:low` `depends:[S01]`
  > After this: Settings page shows Connected Accounts section listing linked providers (Email, Google, Apple) with connect/disconnect actions. User can disconnect Google and still sign in with email. User can connect Google to an email-only account from Settings.

## Boundary Map

### S01 → S02

Produces:
- `signInWithSocial(provider, idToken, nonce?)` function in auth-client returning `AuthResult`
- Better Auth server config with `socialProviders: { google, apple }` and `appBundleIdentifier`
- `SocialLogin.initialize()` call in app startup with Google config
- `SocialLoginButtons` component with Google button wired end-to-end
- Platform detection utility: `isIOS()` function

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- `signInWithSocial()` in auth-client (reused for connect flow)
- Server-side social provider config (accounts created with correct `providerId`)
- `getLinkedAccounts()` function or equivalent to query `account` table for current user

Consumes:
- nothing (first slice)

### S02 → (terminal)

Produces:
- Complete auth UI with social-first layout on both sign-in and sign-up pages
- Apple Sign-In flow with nonce
- Full i18n coverage

### S03 → (terminal)

Produces:
- Connected Accounts UI in Settings
- Connect/disconnect provider functionality
