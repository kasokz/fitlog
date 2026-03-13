---
id: T01
parent: S03
milestone: M003
provides:
  - PaywallDrawer component with dynamic product loading, purchase flow, and Apple-mandated terms
  - Paywall constants file with placeholder legal URLs
  - 17 new i18n keys in de.json and en.json for paywall UI
key_files:
  - apps/mobile/src/lib/components/premium/PaywallDrawer.svelte
  - apps/mobile/src/lib/components/premium/paywall-constants.ts
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Sequential getProducts calls (SUBS then INAPP) to avoid native billing client concurrency issues
  - Purchase button disables all buttons during any active purchase to prevent double-tap
  - Restore flow calls revalidatePurchases() after restorePurchases() to reconcile persisted state
patterns_established:
  - PaywallDrawer uses bind:open prop and onpurchasecomplete callback for parent page integration
  - Product cards split by subscription vs in-app using Set-based identifier matching
  - "[Paywall]" console prefix for all drawer lifecycle logging
observability_surfaces:
  - "[Paywall]" prefixed console logs for drawer opened, products loaded/failed, purchase initiated/complete/cancelled, restore initiated/complete/failed
  - Error UI state visible in drawer when products fail to load (with retry button)
  - Purchase button disabled+spinner state during active transaction
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Build PaywallDrawer component with dynamic product loading

**Built PaywallDrawer with three UI states (loading/loaded/error), dynamic product pricing via getProducts(), full purchase flow wired to grantPurchase(), Apple subscription terms, legal links, and restore purchases — all with i18n support.**

## What Happened

Created the core PaywallDrawer component as the central paywall UI for S03. The drawer:

1. **paywall-constants.ts** — Placeholder URLs for Privacy Policy and Terms of Service (real URLs in S05).
2. **17 i18n keys** added to both de.json and en.json covering title, subtitle, section headers, terms text, button labels, loading/error states, success toast, and restore link.
3. **PaywallDrawer.svelte** — Full vaul-svelte Drawer component with:
   - `bind:open` prop and `onpurchasecomplete` callback for parent integration
   - On open: loads products via sequential `getProducts()` calls (SUBS for annual/monthly, INAPP for template pack)
   - Three UI states: loading (Loader2 spinner), error (alert with retry button), loaded (product cards)
   - Product cards display `product.title` and `product.priceString` with period suffixes (/ year, / month)
   - Purchase buttons call `purchaseProduct()` → `grantPurchase()` → close drawer → toast.success
   - `null` purchase result (user cancel) does NOT show error toast — just resets button state
   - All buttons disabled during active purchase to prevent double-tap
   - Apple-mandated subscription terms (auto-renewal + cancellation) as small-print
   - Privacy Policy and Terms of Service external links
   - Restore Purchases button in footer calls `restorePurchases()` → `revalidatePurchases()`
   - 13 `[Paywall]` console log statements covering full drawer lifecycle

## Verification

- `pnpm --filter mobile build` — compiles with no type errors ✅
- `rg 'getProducts' PaywallDrawer.svelte` — 3 matches (import + 2 calls for SUBS/INAPP) ✅
- `rg 'grantPurchase' PaywallDrawer.svelte` — 2 matches (import + call) ✅
- `rg 'priceString' PaywallDrawer.svelte` — 2 matches (subscription + template pack cards) ✅
- `rg 'paywall_' de.json | wc -l` — 17 (>= 10 required) ✅
- `jq 'keys | length'` — de.json: 348, en.json: 348 (parity) ✅
- `pnpm --filter mobile test -- --run` — 409 tests pass, 17 files, 0 failures ✅
- `[Paywall]` prefix — 13 log statements covering all lifecycle events ✅

### Slice-level checks (partial — T01 only):
- ✅ Build passes with no type errors
- ✅ All 409 tests pass (no regressions)
- ✅ i18n key count parity (348 == 348)
- ✅ paywall_ keys exist (17 >= 10)
- ✅ grantPurchase wired in PaywallDrawer
- ✅ restorePurchases exists in settings (pre-existing)
- ⏳ onupgrade callback in UpgradePrompt (T02)
- ⏳ PaywallDrawer wired in consumer pages (T02)
- ⏳ manageSubscriptions in settings (T03)

## Diagnostics

- Filter browser console by `[Paywall]` to trace drawer lifecycle: opened → products loaded → purchase initiated → purchase complete/cancelled
- Chain with `[PurchasePlugin]` to see underlying native calls
- Chain with `[Premium]` to see state persistence after purchase
- Error UI state is user-visible when products fail to load (retry button available)
- Purchase button disabled+spinner state prevents double-tap during active transaction

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Created: placeholder Privacy Policy and Terms of Service URLs
- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — Created: full paywall Drawer with loading/loaded/error states, dynamic pricing, purchase flow, Apple terms, restore
- `apps/mobile/messages/de.json` — Added 17 paywall i18n keys (331 → 348)
- `apps/mobile/messages/en.json` — Added 17 matching English paywall translations (331 → 348)
