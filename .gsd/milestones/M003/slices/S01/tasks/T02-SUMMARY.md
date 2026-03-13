---
id: T02
parent: S01
milestone: M003
provides:
  - "Typed purchase-plugin.ts wrapper module with 7 functions, platform guards, and diagnostic logging"
  - "PRODUCT_IDS and PLAN_IDS constants for App Store / Google Play products"
  - "Re-exported PURCHASE_TYPE, Product, Transaction types from @capgo/native-purchases"
key_files:
  - apps/mobile/src/lib/services/purchase-plugin.ts
key_decisions:
  - "Wrapper functions accept simplified option objects (productId, productIds) and map internally to plugin's verbose names (productIdentifier, productIdentifiers) — cleaner consumer API"
  - "restorePurchases() calls NativePurchases.restorePurchases() then getPurchases() to return Transaction[] since the plugin's restore returns void"
patterns_established:
  - "Object-parameter pattern for wrapper functions (e.g. getProducts({ productIds, productType })) — consistent across all 7 functions"
  - "[PurchasePlugin] log prefix at debug/log/error levels matching [Premium] and [Haptics] conventions"
observability_surfaces:
  - "[PurchasePlugin] console.debug for web platform skips"
  - "[PurchasePlugin] console.log for native successes with product IDs / transaction IDs"
  - "[PurchasePlugin] console.error for native failures with full error object"
  - "[PurchasePlugin] console.warn when SUBS type used without planIdentifier"
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Create typed purchase-plugin wrapper module

**Built `purchase-plugin.ts` — the single integration point for all IAP operations with 7 typed wrapper functions, product ID constants, platform guards, and `[PurchasePlugin]` diagnostic logging.**

## What Happened

Created `apps/mobile/src/lib/services/purchase-plugin.ts` with:

1. **Constants**: `PRODUCT_IDS` (PREMIUM_ANNUAL, PREMIUM_MONTHLY, TEMPLATE_PACK) and `PLAN_IDS` (ANNUAL, MONTHLY) for Android subscription base plans.
2. **Type re-exports**: `PURCHASE_TYPE` enum, `Product` and `Transaction` types from `@capgo/native-purchases` for consumer convenience.
3. **7 wrapper functions** — each with:
   - `isNative()` platform guard returning typed safe defaults on web (false / [] / null / void)
   - try/catch around native plugin calls — functions never throw
   - `[PurchasePlugin]` prefixed logging at appropriate levels
   - Simplified parameter names (productId → productIdentifier mapping internal)

Functions: `isBillingSupported()`, `getProducts()`, `getProduct()`, `purchaseProduct()`, `getPurchases()`, `restorePurchases()`, `manageSubscriptions()`.

`purchaseProduct()` logs a warning when SUBS type is used without planIdentifier (Android requires it). `restorePurchases()` chains the native restore call with `getPurchases()` to return the restored Transaction array (the plugin's restore returns void).

## Verification

- `pnpm --filter mobile test -- --run`: **373 tests passed** across 17 test files, including all 19 purchase-plugin tests (product ID constants, function exports, platform guard behavior, type re-exports)
- `pnpm --filter mobile build`: **succeeded** with no TypeScript errors, built to `apps/mobile/build`

### Slice-level verification status (intermediate task — partial expected):
- `pnpm --filter mobile test` — PASS (373/373)
- `pnpm run build` — PASS
- `npx cap sync` — not re-run (no changes to native deps since T01)
- Manual iOS StoreKit test — not yet applicable (T03/T04)

## Diagnostics

Filter console logs by `[PurchasePlugin]` to see all IAP activity. Each log line includes function name and outcome:
- `console.debug` — web/non-native platform skips
- `console.log` — native successes (includes product IDs, transaction IDs — no tokens/receipts)
- `console.error` — native failures (includes full error object)
- `console.warn` — SUBS without planIdentifier

## Deviations

- Task plan specified positional parameters (e.g. `getProducts(productIds, productType)`). The test file from T01 uses object parameters (e.g. `getProducts({ productIds })`). Implemented object parameters to match the existing tests — this is also more consistent and extensible.
- `restorePurchases()` chains `NativePurchases.restorePurchases()` (which returns void) with `NativePurchases.getPurchases()` to return Transaction[] as the wrapper API promises.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/purchase-plugin.ts` — New typed wrapper module with 7 functions, 2 constant objects, and type re-exports
