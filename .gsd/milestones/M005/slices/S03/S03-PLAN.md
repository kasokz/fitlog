# S03: Connected Accounts in Settings

**Goal:** Users can view their linked auth providers and connect/disconnect social accounts from Settings.
**Demo:** Settings page shows a "Connected Accounts" section listing Email, Google, and/or Apple providers. User can tap "Connect" to link a social provider or "Disconnect" to unlink one (unless it's the last account).

## Must-Haves

- `getLinkedAccounts()`, `linkSocialAccount()`, `unlinkAccount()` functions in auth-client with Bearer token auth
- Unit tests for all three new auth-client functions
- `ConnectedAccountsSection.svelte` component following SyncStatusSection pattern
- Provider list shows correct icons and labels for credential, google, apple
- "Connect" button triggers native social login then calls `linkSocialAccount()`
- "Disconnect" button calls `unlinkAccount()` with confirmation
- Last-account protection: disable disconnect when only one account linked
- Component renders in Settings only when signed in, after Auth section
- i18n keys for all new UI strings in both de.json and en.json

## Verification

- `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — all new tests pass
- `pnpm --filter mobile build` — compiles successfully
- i18n key count: de.json and en.json have equal key counts (zero drift)
- `pnpm --filter mobile test -- --grep "unlinkAccount.*last account"` — verifies last-account error path returns user-friendly message (not raw error code)

## Observability / Diagnostics

- Runtime signals: `[Auth] getLinkedAccounts:`, `[Auth] linkSocialAccount:`, `[Auth] unlinkAccount:` prefixed console logs
- Inspection surfaces: Console logs on success/failure for each operation
- Failure visibility: Error messages returned in `AuthResult.error` for link/unlink failures, specific handling for `FAILED_TO_UNLINK_LAST_ACCOUNT`
- Redaction constraints: idTokens never logged

## Integration Closure

- Upstream surfaces consumed: `signInWithSocial()` from auth-client (S01), `loginWithGoogle()`/`loginWithApple()` from social-login-plugin (S01/S02), SyncStatusSection pattern, Settings page layout
- New wiring introduced in this slice: `ConnectedAccountsSection` imported in settings page, auth-client extended with 3 new functions
- What remains before the milestone is truly usable end-to-end: real device UAT for native connect/disconnect flows

## Tasks

- [x] **T01: Add account management functions to auth-client with tests** `est:25m`
  - Why: Service layer for listing, linking, and unlinking accounts — the data backbone for the Connected Accounts UI
  - Files: `apps/mobile/src/lib/services/auth-client.ts`, `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
  - Do: Add `getLinkedAccounts()` (GET `/api/auth/list-accounts`), `linkSocialAccount()` (POST `/api/auth/link-social`), `unlinkAccount()` (POST `/api/auth/unlink-account`). All follow the existing raw-fetch + Bearer token pattern. Add types for `LinkedAccount`. Write unit tests covering success paths, error handling, empty results, and last-account error.
  - Verify: `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` passes
  - Done when: All three functions exported, typed, and tested with ≥10 new tests covering success/error/edge cases

- [x] **T02: Build ConnectedAccountsSection component with Settings integration and i18n** `est:30m`
  - Why: The user-facing UI that renders the provider list, connect/disconnect actions, and integrates into Settings
  - Files: `apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte`, `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Create ConnectedAccountsSection following SyncStatusSection pattern. Load accounts via `$effect`. Show provider rows with icons (Mail for credential, Google G SVG, Apple SVG). "Connect" uses `loginWithGoogle()`/`loginWithApple()` → `linkSocialAccount()` → refresh. "Disconnect" shows confirmation, calls `unlinkAccount()`, handles last-account error. Disable disconnect on sole account. Add to Settings page after Auth section, guarded by `authState.isSignedIn`. Add all i18n keys to de.json and en.json.
  - Verify: `pnpm --filter mobile build` succeeds; de.json and en.json key counts match
  - Done when: Component renders in Settings, shows provider list, connect/disconnect buttons work at the code level, all strings localized

## Files Likely Touched

- `apps/mobile/src/lib/services/auth-client.ts`
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`
- `apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
