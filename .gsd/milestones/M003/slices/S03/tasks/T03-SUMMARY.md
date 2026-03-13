---
id: T03
parent: S03
milestone: M003
provides:
  - Production-visible Subscription section in settings with Restore Purchases, Manage Subscription, and current plan status
key_files:
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - None — followed established patterns from T01/T02
patterns_established:
  - Production subscription section uses getActiveProducts() on mount + after restore to drive both plan display and Manage button visibility via $derived
  - Restore flow chains restorePurchases() → revalidatePurchases() → refreshActiveProducts() → isPremiumUser() for full state reconciliation
observability_surfaces:
  - "[PurchasePlugin] restorePurchases" logs during production restore flow
  - "[Premium] revalidated" logs after restore reconciles state
  - "[PurchasePlugin] manageSubscriptions" logs when manage button tapped
  - Toast notifications surface restore success/empty/error to the user
duration: 10min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Add production Restore Purchases and Manage Subscription to settings

**Added production-visible Subscription section to settings with current plan status, Restore Purchases button with loading state and toast feedback, and conditional Manage Subscription button.**

## What Happened

Evolved the settings page to include a new "Abonnement" section visible to ALL users (outside the dev-only block), positioned between the Language section and the dev-only Premium toggle. The section contains:

1. **Current plan display** — reads `getActiveProducts()` on mount and shows product names (extracted from product IDs) or "Kostenlos"/"Free" for free users.
2. **Restore Purchases button** — calls `restorePurchases()` from purchase-plugin, then `revalidatePurchases()` from premium.ts to reconcile state, then refreshes the local active products and premium status. Shows a loading spinner during the operation and toasts with result (success with count, info if none found, error on failure).
3. **Manage Subscription button** — conditionally rendered only when `activeProducts` contains at least one subscription-type product. Calls `manageSubscriptions()` to open the native OS subscription management page.

Added 8 new i18n keys to both `de.json` and `en.json` (settings_subscription_label, settings_subscription_current_plan, settings_subscription_free, settings_subscription_restore, settings_subscription_restore_success, settings_subscription_restore_error, settings_subscription_restore_none, settings_subscription_manage).

The existing dev-only IAP testing section remains completely unchanged.

## Verification

- `pnpm --filter mobile build` — compiles with no type errors ✅
- `pnpm --filter mobile test -- --run` — 409 tests pass across 17 test files ✅
- `rg 'restorePurchases' apps/mobile/src/routes/settings/+page.svelte` — appears outside dev block (in handleProductionRestore) ✅
- `rg 'manageSubscriptions' apps/mobile/src/routes/settings/+page.svelte` — manage subscription wired ✅
- `rg 'getActiveProducts' apps/mobile/src/routes/settings/+page.svelte` — active product check for plan status ✅
- i18n key parity: de.json = 356 keys, en.json = 356 keys ✅
- Premium test suite: 51+ tests still pass (no regressions) ✅

### Slice-level verification (all pass — this is the final task):
- `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — 409 tests pass ✅
- `pnpm --filter mobile build` — clean ✅
- `rg 'onupgrade'` on UpgradePrompt — callback prop exists ✅
- `rg 'PaywallDrawer'` on analytics and PR history pages — drawer wired ✅
- `rg 'grantPurchase'` on PaywallDrawer — purchase completion wired ✅
- `rg 'restorePurchases'` on settings — visible outside dev block ✅
- `rg 'manageSubscriptions'` on settings — manage subscription wired ✅
- i18n key count parity: 356 == 356 ✅
- `rg 'paywall_'` count: 17 (>= 10) ✅

## Diagnostics

- Filter console by `[PurchasePlugin] restorePurchases` to trace production restore flow
- Filter console by `[Premium] revalidated` to see post-restore state reconciliation
- Filter console by `[PurchasePlugin] manageSubscriptions` to see manage button taps
- Toast notifications provide user-visible feedback for restore outcomes (success count, none found, error)
- Check `Preferences.get({ key: 'purchased_products' })` for post-restore persisted state

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/settings/+page.svelte` — Added production Subscription section with plan status, restore purchases, and manage subscription
- `apps/mobile/messages/de.json` — Added 8 new subscription management i18n keys (356 total)
- `apps/mobile/messages/en.json` — Added matching 8 English translations (356 total)
