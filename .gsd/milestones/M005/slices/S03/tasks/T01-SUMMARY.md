---
id: T01
parent: S03
milestone: M005
provides:
  - getLinkedAccounts() function in auth-client
  - linkSocialAccount() function in auth-client
  - unlinkAccount() function in auth-client
  - LinkedAccount and LinkedAccountsResult types
key_files:
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
key_decisions:
  - getLinkedAccounts returns success with empty array when no token (not an error) — allows UI to render empty state without error toasts for signed-out users
  - unlinkAccount maps FAILED_TO_UNLINK_LAST_ACCOUNT to user-friendly "Cannot disconnect your only login method" message
  - linkSocialAccount and unlinkAccount return "Not signed in" error when no token, without calling fetch
patterns_established:
  - Bearer-authenticated GET request pattern (getLinkedAccounts) — extends existing POST-only pattern
  - Account management functions follow same catch-and-return + [Auth] logging pattern as sign-in/sign-out
observability_surfaces:
  - "[Auth] getLinkedAccounts:" console logs on attempt/success/failure
  - "[Auth] linkSocialAccount:" console logs on attempt/success/failure
  - "[Auth] unlinkAccount:" console logs on attempt/success/failure
  - LinkedAccountsResult.error and AuthResult.error expose failure details
duration: 12m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Add account management functions to auth-client with tests

**Added getLinkedAccounts, linkSocialAccount, and unlinkAccount functions to auth-client with 20 unit tests covering success, error, and edge cases.**

## What Happened

Added three new exported functions and two new types to `auth-client.ts`:

1. **`getLinkedAccounts()`** — GET `/api/auth/list-accounts` with Bearer token. Returns empty array (not error) when no token is stored. Parses response array into `LinkedAccount[]`.

2. **`linkSocialAccount(provider, idToken, accessToken?, nonce?)`** — POST `/api/auth/link-social` with `{ provider, idToken: { token, accessToken, nonce } }` body and Bearer auth. Returns `AuthResult`.

3. **`unlinkAccount(providerId)`** — POST `/api/auth/unlink-account` with `{ providerId }` body and Bearer auth. Maps `FAILED_TO_UNLINK_LAST_ACCOUNT` error to user-friendly message "Cannot disconnect your only login method".

All functions follow the established catch-and-return pattern (never throw), log with `[Auth]` prefix, and use `getStoredToken()` + raw fetch with `Authorization: Bearer` header.

Added 20 new unit tests across 3 describe blocks covering: success paths, Bearer header verification, no-token edge cases, HTTP errors, network errors, request body shape verification, last-account error message extraction, and never-throws guarantees.

## Verification

- `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — **554 tests pass** (20 new)
- `pnpm --filter mobile test` — full suite passes, no regressions
- `pnpm --filter mobile test -- --grep "last account"` — last-account error path verified specifically
- Slice verification: new tests pass ✅, build not yet tested (T02 scope), i18n not yet touched (T02 scope)

## Diagnostics

- Grep console for `[Auth] getLinkedAccounts:`, `[Auth] linkSocialAccount:`, `[Auth] unlinkAccount:` to trace operations
- `auth-client.test.ts` is the contract test — 20 tests in getLinkedAccounts/linkSocialAccount/unlinkAccount describe blocks
- Error messages surface in `AuthResult.error` / `LinkedAccountsResult.error` — includes specific message for last-account case

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/auth-client.ts` — Added `LinkedAccount` type, `LinkedAccountsResult` type, `getLinkedAccounts()`, `linkSocialAccount()`, `unlinkAccount()` functions
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — Added 20 new tests in 3 describe blocks for the new functions
- `.gsd/milestones/M005/slices/S03/S03-PLAN.md` — Added failure-path diagnostic verification step, marked T01 done
