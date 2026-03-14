---
estimated_steps: 5
estimated_files: 2
---

# T01: Add account management functions to auth-client with tests

**Slice:** S03 — Connected Accounts in Settings
**Milestone:** M005

## Description

Add three new functions to `auth-client.ts` that call Better Auth's built-in account management REST endpoints using the existing raw-fetch + Bearer token pattern. These functions are the data layer for the Connected Accounts UI in T02.

- `getLinkedAccounts()` — GET `/api/auth/list-accounts` → returns `LinkedAccount[]`
- `linkSocialAccount(provider, idToken, accessToken?, nonce?)` — POST `/api/auth/link-social` → returns `AuthResult`
- `unlinkAccount(providerId)` — POST `/api/auth/unlink-account` → returns `AuthResult`

All follow the established `getStoredToken() → fetch with Authorization header → parse → return typed result` chain. Never throw — catch-and-return pattern (D073/D113).

## Steps

1. Add `LinkedAccount` type (`{ id: string; providerId: string; accountId: string }`) and `LinkedAccountsResult` type to auth-client.ts
2. Implement `getLinkedAccounts()` — GET request with Bearer token, returns `{ success: boolean; accounts: LinkedAccount[]; error?: string }`
3. Implement `linkSocialAccount(provider, idToken, accessToken?, nonce?)` — POST to `/api/auth/link-social` with `{ provider, idToken: { token, accessToken, nonce } }` body, returns `AuthResult`
4. Implement `unlinkAccount(providerId)` — POST to `/api/auth/unlink-account` with `{ providerId }` body, returns `AuthResult` with specific handling for `FAILED_TO_UNLINK_LAST_ACCOUNT` error
5. Add unit tests in auth-client.test.ts: success paths for all three functions, error handling (HTTP errors, network errors, no-token), empty accounts list, last-account error message extraction

## Must-Haves

- [ ] `getLinkedAccounts()` sends GET with `Authorization: Bearer <token>` header
- [ ] `getLinkedAccounts()` returns empty array when no token stored (not signed in)
- [ ] `linkSocialAccount()` sends correct request body shape: `{ provider, idToken: { token, accessToken, nonce } }`
- [ ] `unlinkAccount()` sends `{ providerId }` body
- [ ] `unlinkAccount()` surfaces a user-friendly message for last-account error
- [ ] All functions follow catch-and-return pattern (never throw)
- [ ] All functions log with `[Auth]` prefix
- [ ] ≥10 new unit tests covering success, error, and edge cases

## Verification

- `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — all pass
- `pnpm --filter mobile test` — full suite passes (no regressions)

## Observability Impact

- Signals added: `[Auth] getLinkedAccounts:`, `[Auth] linkSocialAccount:`, `[Auth] unlinkAccount:` console logs on attempt/success/failure
- How a future agent inspects this: grep console for `[Auth]` prefix logs; `auth-client.test.ts` is the contract test
- Failure state exposed: `AuthResult.error` string contains specific error message; `LinkedAccountsResult.error` for fetch failures

## Inputs

- `apps/mobile/src/lib/services/auth-client.ts` — existing pattern: `signInWithSocial()`, `getStoredToken()`, `storeCredentials()`, `parseErrorMessage()`
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — existing mock setup (mockFetch, mockStorage, Preferences mock)
- S03-RESEARCH.md — Better Auth endpoint specs: GET `/list-accounts`, POST `/link-social` with idToken body, POST `/unlink-account` with providerId body

## Expected Output

- `apps/mobile/src/lib/services/auth-client.ts` — 3 new exported functions + `LinkedAccount` and `LinkedAccountsResult` types
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — ≥10 new tests in 3 new describe blocks
