---
id: S03
parent: M005
milestone: M005
provides:
  - getLinkedAccounts() function in auth-client (GET /api/auth/list-accounts with Bearer auth)
  - linkSocialAccount() function in auth-client (POST /api/auth/link-social with Bearer auth)
  - unlinkAccount() function in auth-client (POST /api/auth/unlink-account with Bearer auth)
  - LinkedAccount and LinkedAccountsResult types
  - ConnectedAccountsSection.svelte component in Settings
  - 15 new i18n keys (connected_accounts_*) in de.json and en.json
requires:
  - slice: S01
    provides: signInWithSocial() in auth-client, server social provider config, loginWithGoogle()/loginWithApple() from social-login-plugin
  - slice: S02
    provides: isIOS() platform detection, SocialLoginButtons pattern
affects: []
key_files:
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
  - apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - D133: getLinkedAccounts returns empty array (not error) when no token — UI renders empty state without error toasts for signed-out users
  - D134: unlinkAccount maps FAILED_TO_UNLINK_LAST_ACCOUNT to user-friendly message
  - D135: window.confirm for disconnect confirmation — lightweight, works on native webview
  - D136: Credential row shows disconnect but no connect button — credential linking requires separate email/password flow
patterns_established:
  - Bearer-authenticated GET request pattern (getLinkedAccounts) — extends existing POST-only pattern
  - ConnectedAccountsSection follows SyncStatusSection self-contained pattern (load in $effect, manage own state)
  - actionInProgress state tracks which provider is in-flight to prevent concurrent operations
observability_surfaces:
  - "[Auth] getLinkedAccounts:" console logs on attempt/success/failure
  - "[Auth] linkSocialAccount:" console logs on attempt/success/failure
  - "[Auth] unlinkAccount:" console logs on attempt/success/failure
  - "[ConnectedAccounts] Google connect error:" / "Apple connect error:" / "Disconnect {providerId} error:" console logs
  - Toast messages for all success/failure outcomes
drill_down_paths:
  - .gsd/milestones/M005/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M005/slices/S03/tasks/T02-SUMMARY.md
duration: 24m
verification_result: passed
completed_at: 2026-03-13
---

# S03: Connected Accounts in Settings

**Users can view linked auth providers and connect/disconnect social accounts from Settings, with last-account protection and full i18n.**

## What Happened

**T01 (auth-client functions):** Added three new exported functions to `auth-client.ts` — `getLinkedAccounts()` (GET with Bearer auth, returns empty array when no token), `linkSocialAccount()` (POST with provider/idToken/nonce), and `unlinkAccount()` (POST with providerId, maps `FAILED_TO_UNLINK_LAST_ACCOUNT` to user-friendly message). All follow the existing catch-and-return + `[Auth]` logging pattern. Added `LinkedAccount` and `LinkedAccountsResult` types. 20 unit tests covering success paths, error handling, empty results, and last-account error.

**T02 (UI component + i18n):** Created `ConnectedAccountsSection.svelte` (~250 lines) following the SyncStatusSection self-contained pattern. Loads accounts via `$effect` → `getLinkedAccounts()`. Shows three provider rows (credential/google/apple) with appropriate icons and labels. Connect buttons trigger native social login → `linkSocialAccount()` → refresh → toast. Disconnect buttons show `window.confirm` → `unlinkAccount()` → refresh → toast. Disconnect disabled when only one account linked. Apple row gated behind `isIOS()`. `actionInProgress` state prevents concurrent operations. Integrated into Settings page after Auth section, inside the existing `{#if authState.isSignedIn}` block. Added 15 i18n keys to both de.json and en.json.

## Verification

- `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — 554 tests pass (20 new account management tests)
- `pnpm --filter mobile test -- --grep "unlinkAccount.*last account"` — last-account error path verified
- `pnpm --filter mobile build` — compiles successfully (23.9s)
- i18n key count: de.json 430, en.json 430 (zero drift)
- Full test suite: 554 tests pass, no regressions

## Requirements Advanced

- R046 (Connected Accounts UI) — Settings page shows linked providers with connect/disconnect actions
- R047 (Account linking from Settings) — Connect button triggers native social login then links account
- R048 (Account unlinking) — Disconnect with confirmation dialog and last-account protection

## Requirements Validated

- None — requires real device UAT to validate connect/disconnect flows end-to-end

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- ConnectedAccountsSection is ~250 lines (larger than estimated) due to three full provider rows with conditional connect/disconnect buttons and inline SVG icons. No functionality was cut.

## Known Limitations

- Connect/disconnect flows require real device testing — native social login plugins don't work in browser dev mode
- Credential row shows disconnect but no connect button — connecting email/password requires a separate flow not in scope for this slice

## Follow-ups

- Real device UAT for connect/disconnect flows (milestone-level UAT)
- Consider adding "Change Password" option for credential accounts in a future milestone

## Files Created/Modified

- `apps/mobile/src/lib/services/auth-client.ts` — Added LinkedAccount type, LinkedAccountsResult type, getLinkedAccounts(), linkSocialAccount(), unlinkAccount()
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — 20 new tests in 3 describe blocks
- `apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte` — New component, self-contained connected accounts UI
- `apps/mobile/src/routes/settings/+page.svelte` — Added import + rendered ConnectedAccountsSection in signed-in block
- `apps/mobile/messages/de.json` — 15 new connected_accounts_* keys (415 → 430)
- `apps/mobile/messages/en.json` — 15 matching connected_accounts_* keys (415 → 430)

## Forward Intelligence

### What the next slice should know
- This is the terminal slice for M005. No downstream slices depend on S03.
- The milestone is now feature-complete — all three slices (S01, S02, S03) are done.

### What's fragile
- Native social login connect flow in ConnectedAccountsSection depends on `loginWithGoogle()`/`loginWithApple()` returning valid idTokens — if the native plugin initialization is wrong, connect silently fails with a toast error.

### Authoritative diagnostics
- Grep `[Auth] getLinkedAccounts:` / `[Auth] linkSocialAccount:` / `[Auth] unlinkAccount:` for service-level operation tracing
- Grep `[ConnectedAccounts]` for UI-level connect/disconnect error logs
- `auth-client.test.ts` has 20 contract tests for the three new functions

### What assumptions changed
- None — slice executed as planned with no surprises.
