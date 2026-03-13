---
id: T04
parent: S01
milestone: M003
provides:
  - "Dev-only IAP Testing section in settings with billing status, product loading, purchase, and restore buttons"
  - "11 i18n keys (settings_iap_*) in de.json and en.json with zero drift"
key_files:
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - "IAP state variables declared unconditionally but UI rendered only inside import.meta.env.DEV block — avoids conditional declaration complexity while keeping dev-only rendering"
  - "Load Products makes two sequential calls (SUBS then INAPP) rather than mixing types — aligns with native billing client constraint against concurrent queries documented in purchase-plugin.ts"
  - "Added settings_iap_billing_checking key for the null/loading state — not in original plan but needed for complete 3-state indicator"
patterns_established:
  - "Dev IAP test section pattern: status indicator + action buttons + product list + result display, all inside existing {#if import.meta.env.DEV} block"
  - "lastResult as { message, success } object for typed success/error display with visual distinction via conditional border/text colors"
observability_surfaces:
  - "Dev-only IAP Testing section in Settings: shows billing support status (green/red/gray badge), loaded products (title, price, ID), and last action result (success green / error red)"
  - "All button actions log via [PurchasePlugin] prefix from purchase-plugin.ts wrapper — visible in browser/Xcode console"
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Add dev-only test purchase UI in settings

**Built complete IAP testing section in settings (dev-only) with billing status indicator, Load Products / Purchase Annual / Restore Purchases buttons, product list display, and success/error result area — gracefully degraded on web.**

## What Happened

Extended the settings page with an IAP Testing section inside the existing `{#if import.meta.env.DEV}` block. The section sits below the existing Premium (Dev) toggle and provides:

1. **Billing status indicator** — 3-state badge: gray "Checking..." on mount, green "Supported" when native billing available, red "Not supported (web)" on web/failure. Checked automatically via `$effect` calling `isBillingSupported()`.

2. **Three action buttons** using shadcn-svelte `Button` component with `variant="outline"`:
   - **Load Products** — calls `getProducts()` twice (SUBS for annual+monthly, INAPP for template pack), displays returned products with title, price, and identifier
   - **Purchase Annual** — calls `purchaseProduct()` with `PRODUCT_IDS.PREMIUM_ANNUAL`, `PURCHASE_TYPE.SUBS`, `PLAN_IDS.ANNUAL`, shows transaction ID on success or error message
   - **Restore Purchases** — calls `restorePurchases()`, shows count of restored transactions

3. **Product list display** — renders each loaded product in a bordered card with name and price + product ID
4. **Result display** — shows last action result with green border for success, red border for errors
5. **All buttons disabled** when `loading` is true or `billingSupported` is false

Added 11 i18n keys to both `de.json` and `en.json` with proper Umlaute (ü, ä) in German translations. Both files remain at 330 keys with zero drift.

## Verification

- `pnpm --filter mobile build` — succeeded (TypeScript compilation, adapter-static output)
- `pnpm --filter mobile test -- --run` — 17 test files, 373 tests passed (including purchase-plugin tests from T01)
- `pnpm paraglide:compile` — compiled successfully with new keys
- i18n key parity: `de.json` and `en.json` both have 330 keys, `diff` shows zero differences
- i18n IAP-specific: 11 `settings_iap_*` keys in each file

**Slice-level verification status (T04 is the final task):**
- ✅ `pnpm --filter mobile test` — all 373 tests pass
- ✅ `pnpm run build` from `apps/mobile` — succeeds
- ⬜ `npx cap sync` — verified in T01 (not re-run, no native changes in T04)
- ⬜ Manual: iOS build in Xcode → StoreKit → Settings → Test Purchase — requires human UAT (dev must select Products.storekit in Xcode scheme)

## Diagnostics

- Run dev server, navigate to Settings — IAP Testing section visible below Premium (Dev) toggle
- On web: billing shows red "Nicht unterstützt (Web)" / "Not supported (web)" badge, all buttons disabled
- On native: billing should show green "Supported", buttons enabled, each action logs via `[PurchasePlugin]` prefix
- Filter browser console by `[PurchasePlugin]` to see all IAP activity from button presses
- Error messages from purchase/restore displayed inline in red-bordered result area

## Deviations

- Added `settings_iap_billing_checking` key (11th key) not in original plan — needed for the 3-state billing indicator (null/true/false). This is a minor addition, not a structural change.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/settings/+page.svelte` — Extended with IAP Testing dev section: imports from purchase-plugin, state variables, 3 handler functions, billing status badge, action buttons, product list, result display
- `apps/mobile/messages/de.json` — Added 11 `settings_iap_*` keys with proper German Umlaute
- `apps/mobile/messages/en.json` — Added matching 11 `settings_iap_*` keys in English
