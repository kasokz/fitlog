---
estimated_steps: 5
estimated_files: 3
---

# T04: Add dev-only test purchase UI in settings

**Slice:** S01 — IAP Plugin Integration & First Purchase Flow
**Milestone:** M003

## Description

Adds the developer-facing verification surface for the entire slice: an IAP testing section in the settings page (dev-only) that lets a developer trigger billing checks, load products, execute a purchase, and restore purchases. This is the demo outcome — without it, the sandbox purchase flow can't be exercised from within the app. On web, the section shows graceful degradation (billing not supported, buttons disabled).

## Steps

1. Add i18n keys to `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json` for the IAP testing section. Keys needed (all under dev section, keeping pattern from existing dev keys):
   - `settings_iap_test_label` — section header ("IAP Testing" / "IAP-Test")
   - `settings_iap_billing_supported` — billing status label ("Billing Supported" / "Billing verfuegbar")
   - `settings_iap_billing_not_supported` — billing not supported ("Not supported (web)" / "Nicht unterstuetzt (Web)")
   - `settings_iap_load_products` — button label ("Load Products" / "Produkte laden")
   - `settings_iap_purchase_annual` — button label ("Purchase Annual" / "Jahresabo kaufen")
   - `settings_iap_restore` — button label ("Restore Purchases" / "Kaeufe wiederherstellen")
   - `settings_iap_no_products` — empty state ("No products loaded" / "Keine Produkte geladen")
   - `settings_iap_transaction_success` — success message ("Transaction complete: {id}" / "Transaktion abgeschlossen: {id}")
   - `settings_iap_transaction_error` — error message ("Purchase failed: {error}" / "Kauf fehlgeschlagen: {error}")
   - `settings_iap_restored_count` — restore result ("Restored {count} purchases" / "{count} Kaeufe wiederhergestellt")
   Note: Use proper Umlaute for German: "ü" not "ue", "ä" not "ae".

2. Extend the `{#if import.meta.env.DEV}` section in `apps/mobile/src/routes/settings/+page.svelte`:
   - Add imports: `isBillingSupported`, `getProducts`, `purchaseProduct`, `restorePurchases`, `PRODUCT_IDS`, `PURCHASE_TYPE` from `$lib/services/purchase-plugin.js`
   - Add state variables: `billingSupported` (boolean | null, initialized via `$effect`), `products` (array), `lastResult` (string | null), `loading` (boolean)
   - On component mount (`$effect`), call `isBillingSupported()` and set `billingSupported`
   - Render "IAP Testing" section header

3. Build the IAP test UI components within the dev section:
   - **Billing status indicator:** Show `billingSupported` as green "Supported" / red "Not supported (web)" / gray "Checking..." badge
   - **Load Products button:** Calls `getProducts()` with all 3 product IDs and `PURCHASE_TYPE.SUBS` for subscriptions + `PURCHASE_TYPE.INAPP` for template pack (two calls). Displays product list showing name, price, and product ID for each. Button disabled while `loading` or `!billingSupported`.
   - **Purchase Annual button:** Calls `purchaseProduct(PRODUCT_IDS.PREMIUM_ANNUAL, PURCHASE_TYPE.SUBS, PLAN_IDS.ANNUAL)`. On success, displays transaction ID. On null result, shows error. Button disabled while `loading` or `!billingSupported`.
   - **Restore Purchases button:** Calls `restorePurchases()`. Shows count of restored transactions. Button disabled while `loading` or `!billingSupported`.
   - **Result display area:** Shows `lastResult` string — either success message or error, styled with green/red border. Clears on new action.

4. Use shadcn-svelte `Button` component for all action buttons. Use existing spacing/typography patterns from the settings page (border rounded-md, px-4 py-3, text-sm). Keep the UI simple — this is a dev tool, not a user-facing screen.

5. Verify:
   - `pnpm --filter mobile build` succeeds
   - `pnpm --filter mobile test -- --run` — all tests pass
   - Run dev server and check settings page — IAP section visible in dev mode with all buttons present. On web, billing shows "Not supported" and buttons are disabled.

## Must-Haves

- [ ] IAP testing section only visible in `import.meta.env.DEV` mode
- [ ] Billing status checked on mount and displayed
- [ ] Load Products button fetches and displays all 3 products
- [ ] Purchase Annual button triggers `purchaseProduct()` with correct product ID, type, and plan ID
- [ ] Restore Purchases button triggers `restorePurchases()` and shows result count
- [ ] All buttons disabled when billing not supported or action in progress
- [ ] Last result (success or error) displayed with visual distinction
- [ ] i18n keys added to both `de.json` and `en.json` with zero drift
- [ ] Existing premium toggle unchanged and still functional
- [ ] `pnpm run build` and `pnpm test` pass

## Verification

- `pnpm --filter mobile build` — succeeds
- `pnpm --filter mobile test -- --run` — all tests pass
- Visual: dev server → Settings → IAP Testing section visible with all elements
- On web: billing shows "Not supported", buttons disabled
- i18n key count check: `de.json` and `en.json` have same number of settings_iap_* keys

## Observability Impact

- Signals added/changed: Dev-only UI surface that displays `[PurchasePlugin]` log output visually. Shows billing support status, loaded products, and transaction results in-app rather than requiring console inspection.
- How a future agent inspects this: Run dev server, navigate to Settings, check IAP Testing section. On native build with StoreKit config, all buttons should be functional. On web, graceful degradation visible.
- Failure state exposed: Error messages from `purchaseProduct()` and `restorePurchases()` displayed inline. Missing products from `getProducts()` shown as empty state.

## Inputs

- `apps/mobile/src/routes/settings/+page.svelte` — existing settings page with dev section
- `apps/mobile/src/lib/services/purchase-plugin.ts` — wrapper module from T02
- `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json` — existing i18n files
- Existing settings page patterns: section headers, toggle groups, switch components

## Expected Output

- `apps/mobile/src/routes/settings/+page.svelte` — extended with IAP testing dev section
- `apps/mobile/messages/de.json` — new `settings_iap_*` keys added
- `apps/mobile/messages/en.json` — matching `settings_iap_*` keys added
