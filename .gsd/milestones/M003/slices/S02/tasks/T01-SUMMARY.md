---
id: T01
parent: S02
milestone: M003
provides:
  - PurchasedProduct type and granular product-tracking system in premium.ts
  - Feature-to-product mapping (analytics → subscription, templates → template pack)
  - grantPurchase(), revalidatePurchases(), getActiveProducts() public API
  - isTransactionActive() abstracting iOS/Android transaction differences
  - PremiumFeature.premium_templates enum value
  - 51-assertion test suite covering all new and existing paths
key_files:
  - apps/mobile/src/lib/services/premium.ts
  - apps/mobile/src/lib/db/__tests__/premium.test.ts
key_decisions:
  - Persist product map as JSON array of [key, value] entries via Map serialization (Array.from(map.entries())), enabling lossless round-trip through JSON.stringify/parse
  - Dev override (PREMIUM_KEY) checked before product map in all public functions — this preserves the settings dev toggle behavior exactly as-is
  - revalidatePurchases() is a no-op when getPurchases() returns empty (web/error), preserving persisted state rather than wiping it
  - isTransactionActive() uses a priority chain: isActive boolean → subscriptionState → purchaseState → presence fallback, covering iOS 15+, iOS 16+, and Android field availability
patterns_established:
  - Feature-to-product mapping via FEATURE_PRODUCT_MAP constant — new features add an entry here with their required product IDs
  - Transaction mock helpers (mockIosSub, mockAndroidSub, mockIosInapp, mockAndroidInapp) in test file — reusable for future purchase-related tests
  - Dual-key Preferences pattern: PREMIUM_KEY for dev override, PRODUCTS_KEY for real purchase state
observability_surfaces:
  - "[Premium] granted: {productId}" log on grantPurchase()
  - "[Premium] revalidated: {count} active products" log on revalidatePurchases()
  - "[Premium] corrupted purchased_products data, resetting to empty" warning on JSON parse failure
  - "[Premium] canAccessFeature({feature}): {result} (dev override)" vs "(product check: [{productIds}])" logs
  - purchased_products key in @capacitor/preferences — JSON-serialized product map
duration: 25m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Evolve premium.ts with granular product tracking and write test suite

**Transformed premium.ts from single-boolean gate to granular product-tracking system with PurchasedProduct type, feature-to-product mapping, transaction activity detection, and 51-assertion test suite.**

## What Happened

Evolved `premium.ts` in-place from a single `premium_status` Preferences key to a dual-key system: `PREMIUM_KEY` (dev override) + `PRODUCTS_KEY` (JSON-serialized product map). Added `PurchasedProduct` interface, `isTransactionActive()` that abstracts iOS/Android transaction field differences (isActive, subscriptionState, purchaseState), `mapTransactionToProduct()`, `FEATURE_PRODUCT_MAP` mapping features to required product IDs, `grantPurchase()` for post-purchase persistence, `revalidatePurchases()` for store reconciliation (guards against empty results on web), and `getActiveProducts()` utility.

All existing public API signatures unchanged: `isPremiumUser()` → `Promise<boolean>`, `setPremiumStatus(active)` → `Promise<void>`, `canAccessFeature(feature)` → `Promise<boolean>`. These now check dev override first, then delegate to granular product map. Extended `PremiumFeature` enum with `premium_templates`.

Test suite evolved from 14 to 51 assertions. All 14 original assertions preserved verbatim (backward compatibility). New test groups: isTransactionActive (10 cases covering iOS sub active/expired/grace/billing-retry/revoked, Android sub valid/pending, iOS INAPP presence, Android INAPP valid/pending), PurchasedProduct persistence (grant, multi-product, corruption fallback, overwrite), feature-to-product mapping (6 cases), dev override priority (4 cases), revalidation (4 cases including web-safe empty guard and expired reconciliation), backward compat with products (4 cases), mapTransactionToProduct (3 cases).

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — **51 tests passed** (29ms)
- `pnpm --filter mobile test -- --run` — **409 tests passed** across 17 files (no regressions)
- `pnpm --filter mobile build` — succeeds with no type errors (26.26s)

### Slice-level checks (intermediate — T01 of 3):
- ✅ Premium test suite: 51 tests pass (exceeds 30+ target)
- ✅ Full test suite: 409 tests pass, no regressions
- ✅ Build: TypeScript compiles, no type errors
- ⏳ Grep verification of unchanged consumers: deferred to T03
- ⏳ Lifecycle wiring (revalidatePurchases in +layout.svelte): T02 scope
- ⏳ UpgradePrompt feature prop extension: T02 scope

## Diagnostics

- **Runtime inspection:** `Preferences.get({ key: 'purchased_products' })` returns JSON-serialized `[string, PurchasedProduct][]` array
- **Console filtering:** Filter by `[Premium]` to see all state operations (granted, revalidated, canAccessFeature, isPremiumUser, corrupted data)
- **Contract verification:** Run `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts`
- **Transaction IDs** logged for traceability; receipt/token data never logged

## Deviations

None. Implementation follows the task plan exactly.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/premium.ts` — Evolved from single-boolean to granular product-tracking with PurchasedProduct type, feature-to-product mapping, isTransactionActive(), grantPurchase(), revalidatePurchases(), getActiveProducts()
- `apps/mobile/src/lib/db/__tests__/premium.test.ts` — Evolved from 14 to 51 assertions covering all new paths plus full backward compatibility
