---
estimated_steps: 6
estimated_files: 4
---

# T02: Build ConnectedAccountsSection component with Settings integration and i18n

**Slice:** S03 — Connected Accounts in Settings
**Milestone:** M005

## Description

Create the `ConnectedAccountsSection.svelte` component following the `SyncStatusSection.svelte` pattern — self-contained, loads data in `$effect`, manages its own state. Renders a list of linked providers with appropriate icons, "Connect" buttons for unlinked providers, and "Disconnect" buttons for linked ones (disabled when only one account remains). Integrate into the Settings page after the Auth section, guarded by `authState.isSignedIn`. Add all i18n keys to both de.json and en.json.

## Steps

1. Add i18n keys to `de.json` (base locale, source of truth): section header, provider labels (Email, Google, Apple), connected/not connected status, connect/disconnect buttons, disconnect confirmation, last-account warning, success/error toasts. Then add matching keys to `en.json`.
2. Create `ConnectedAccountsSection.svelte` in `apps/mobile/src/lib/components/settings/`:
   - Load accounts in `$effect` via `getLinkedAccounts()`, store in `$state`
   - Compute derived values: which providers are linked, whether disconnect should be disabled (only 1 account)
   - Render section header with same styling as other settings sections (`text-sm font-bold uppercase tracking-wide text-muted-foreground`)
   - For each provider (credential, google, apple): show icon + label + status badge + action button
   - Provider icons: Mail icon from lucide for credential, Google G SVG (same as SocialLoginButtons), Apple SVG (same as SocialLoginButtons)
   - "Connect" handler: call `loginWithGoogle()`/`loginWithApple()` → get idToken → call `linkSocialAccount()` → refresh accounts → toast
   - "Disconnect" handler: show confirmation (toast or confirm pattern), call `unlinkAccount()` → refresh accounts → toast. Catch last-account error and show specific message.
   - User cancel on connect exits silently (D081/D130 precedent)
3. Import `ConnectedAccountsSection` in `apps/mobile/src/routes/settings/+page.svelte`
4. Place component after Auth section, inside the existing `{#if authState.isSignedIn}` block (before SyncStatusSection)
5. Verify `pnpm --filter mobile build` succeeds
6. Verify de.json and en.json key counts match

## Must-Haves

- [ ] Component loads linked accounts on mount via `$effect`
- [ ] Shows provider rows for credential, google, apple with correct icons
- [ ] "Connect" button for unlinked social providers triggers native login → link flow
- [ ] "Disconnect" button calls `unlinkAccount()` with provider's `providerId`
- [ ] Disconnect disabled when only one account linked (last-account protection)
- [ ] Component only renders in Settings when user is signed in
- [ ] All UI strings use i18n keys from paraglide
- [ ] de.json and en.json have identical key sets (zero drift)
- [ ] Apple "Connect" button only shown on iOS (via `isIOS()`)

## Verification

- `pnpm --filter mobile build` — compiles successfully
- `jq 'keys | length' apps/mobile/messages/de.json` equals `jq 'keys | length' apps/mobile/messages/en.json`
- Visual inspection of component structure matches SyncStatusSection pattern

## Inputs

- `apps/mobile/src/lib/services/auth-client.ts` — T01's `getLinkedAccounts()`, `linkSocialAccount()`, `unlinkAccount()` functions and `LinkedAccount` type
- `apps/mobile/src/lib/services/social-login-plugin.ts` — `loginWithGoogle()`, `loginWithApple()` for the connect flow
- `apps/mobile/src/lib/utils/platform.ts` — `isIOS()` for Apple button visibility
- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — structural pattern to follow
- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — Google and Apple SVG icons to reuse

## Expected Output

- `apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte` — new component, ~120–160 lines
- `apps/mobile/src/routes/settings/+page.svelte` — import added + component rendered in signed-in block
- `apps/mobile/messages/de.json` — ~12 new keys (connected_accounts_*)
- `apps/mobile/messages/en.json` — ~12 matching keys

## Observability Impact

- **Console logs**: `[ConnectedAccounts] Google connect error:`, `[ConnectedAccounts] Apple connect error:`, `[ConnectedAccounts] Disconnect {providerId} error:` — emitted on catch paths for connect/disconnect flows. These complement the `[Auth]` prefix logs from auth-client.
- **Inspection surface**: Toast messages surface success/failure to the user for every connect and disconnect action. The `actionInProgress` state variable shows which provider operation is in-flight.
- **Failure visibility**: Last-account disconnect is blocked at the UI level (button disabled) and shows `connected_accounts_last_account_warning` toast if reached programmatically. Server-side `FAILED_TO_UNLINK_LAST_ACCOUNT` is also handled by auth-client and surfaced via `result.error`.
- **Future agent inspection**: Grep for `[ConnectedAccounts]` in console to trace UI-level connect/disconnect operations. Grep for `connected_accounts_` in i18n files for all related strings.
