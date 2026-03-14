---
id: T02
parent: S03
milestone: M005
provides:
  - ConnectedAccountsSection component in settings
  - i18n keys for connected accounts UI (de + en)
key_files:
  - apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - window.confirm used for disconnect confirmation (lightweight, works on native webview, matches existing pattern simplicity)
  - actionInProgress state tracks which provider is in-flight to prevent concurrent operations
  - Email/credential row shows disconnect button but no connect button (credential linking requires separate email/password flow, not social login)
patterns_established:
  - ConnectedAccountsSection follows SyncStatusSection self-contained pattern (load in $effect, manage own state, section header styling)
  - Provider rows use Badge for status + Button for action, consistent with other settings sections
observability_surfaces:
  - "[ConnectedAccounts] Google connect error:" / "[ConnectedAccounts] Apple connect error:" / "[ConnectedAccounts] Disconnect {providerId} error:" console logs on catch paths
  - Toast messages for all success/failure outcomes
  - actionInProgress state variable shows which operation is in-flight
duration: 12min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Build ConnectedAccountsSection component with Settings integration and i18n

**Created ConnectedAccountsSection.svelte with full connect/disconnect flow, integrated into Settings page behind auth guard, with 15 new i18n keys in de.json and en.json.**

## What Happened

1. Added 15 i18n keys to both `de.json` and `en.json` — section header, provider labels (Email/Google/Apple), status badges, connect/disconnect buttons, confirmation dialog, success/error toasts, last-account warning, and loading state. Key counts: 430 each.

2. Created `ConnectedAccountsSection.svelte` (~250 lines) following the SyncStatusSection pattern:
   - Loads accounts on mount via `$effect` → `getLinkedAccounts()`
   - Shows three provider rows (credential, google, apple) with icons matching SocialLoginButtons SVGs
   - Apple row gated behind `isIOS()`
   - Connect buttons trigger native social login → `linkSocialAccount()` → refresh → toast
   - Disconnect buttons show `window.confirm` → `unlinkAccount()` → refresh → toast
   - Disconnect disabled when only one account linked (UI-level last-account guard)
   - `actionInProgress` state prevents concurrent operations
   - User cancel on native social login exits silently (D081/D130 precedent)

3. Imported and placed the component in `+page.svelte` after the Auth section, inside the existing `{#if authState.isSignedIn}` block, before SyncStatusSection.

## Verification

- `pnpm --filter mobile build` — compiles successfully (20.4s)
- `jq 'keys | length'` — de.json: 430, en.json: 430 (zero drift)
- `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — 554 tests pass
- `pnpm --filter mobile test -- --grep "unlinkAccount.*last account"` — passes (last-account error path verified)

### Slice-Level Verification Status

- [x] `pnpm --filter mobile test -- --grep "getLinkedAccounts|linkSocialAccount|unlinkAccount"` — all tests pass
- [x] `pnpm --filter mobile build` — compiles successfully
- [x] i18n key count: de.json and en.json have equal key counts (430 each)
- [x] `pnpm --filter mobile test -- --grep "unlinkAccount.*last account"` — passes

## Diagnostics

- Grep `[ConnectedAccounts]` in console for UI-level connect/disconnect error logs
- Grep `[Auth] getLinkedAccounts:` / `[Auth] linkSocialAccount:` / `[Auth] unlinkAccount:` for service-level operation tracing
- Toast messages surface all success/error outcomes to the user
- `connected_accounts_*` key prefix in i18n files for all related strings

## Deviations

- Component is ~250 lines (larger than estimated 120-160) due to three full provider rows with conditional connect/disconnect buttons and inline SVG icons. No functionality was cut.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/settings/ConnectedAccountsSection.svelte` — new component, self-contained connected accounts UI
- `apps/mobile/src/routes/settings/+page.svelte` — added import + rendered ConnectedAccountsSection in signed-in block before SyncStatusSection
- `apps/mobile/messages/de.json` — 15 new `connected_accounts_*` keys (415 → 430)
- `apps/mobile/messages/en.json` — 15 matching `connected_accounts_*` keys (415 → 430)
- `.gsd/milestones/M005/slices/S03/tasks/T02-PLAN.md` — added Observability Impact section (pre-flight fix)
