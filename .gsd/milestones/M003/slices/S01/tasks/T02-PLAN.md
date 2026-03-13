---
estimated_steps: 4
estimated_files: 1
---

# T02: Create typed purchase-plugin wrapper module

**Slice:** S01 — IAP Plugin Integration & First Purchase Flow
**Milestone:** M003

## Description

Creates the core deliverable of S01: a typed wrapper module around `@capgo/native-purchases` that guards all calls with platform checks, returns safe defaults on web, logs diagnostics with `[PurchasePlugin]` prefix, and exports product ID constants. This is the single integration point that S02-S06 will consume.

## Steps

1. Create `apps/mobile/src/lib/services/purchase-plugin.ts` with the following structure:
   - Import `Capacitor` from `@capacitor/core` and `NativePurchases`, `PURCHASE_TYPE` from `@capgo/native-purchases`
   - Import and re-export types: `Product`, `Transaction`, `PURCHASE_TYPE` from the plugin
   - Define `PRODUCT_IDS` constant object:
     ```ts
     export const PRODUCT_IDS = {
       PREMIUM_ANNUAL: 'com.fitlog.app.premium.annual',
       PREMIUM_MONTHLY: 'com.fitlog.app.premium.monthly',
       TEMPLATE_PACK: 'com.fitlog.app.templates.pack',
     } as const;
     ```
   - Define `PLAN_IDS` constant object for Android subscription plans:
     ```ts
     export const PLAN_IDS = {
       ANNUAL: 'annual-plan',
       MONTHLY: 'monthly-plan',
     } as const;
     ```
   - Create a `isNative()` helper that returns `Capacitor.isNativePlatform()` result
2. Implement all 7 wrapper functions following this pattern for each:
   - Check `isNative()` — if false, log `console.debug('[PurchasePlugin] functionName: skipped (web)')` and return safe default
   - Wrap the `NativePurchases.methodName()` call in try/catch
   - Log success: `console.log('[PurchasePlugin] functionName: success', relevantData)`
   - Log failure: `console.error('[PurchasePlugin] functionName: failed', error)`
   - Return typed result or null/empty on error
   - Function signatures:
     - `isBillingSupported(): Promise<boolean>` — returns `false` on web/error
     - `getProducts(productIds: string[], productType: PURCHASE_TYPE): Promise<Product[]>` — returns `[]` on web/error
     - `getProduct(productId: string, productType: PURCHASE_TYPE): Promise<Product | null>` — returns `null` on web/error
     - `purchaseProduct(productId: string, productType: PURCHASE_TYPE, planIdentifier?: string): Promise<Transaction | null>` — returns `null` on web/error. Log warning if `productType === SUBS && !planIdentifier` (Android requires it).
     - `getPurchases(): Promise<Transaction[]>` — returns `[]` on web/error
     - `restorePurchases(): Promise<Transaction[]>` — returns `[]` on web/error
     - `manageSubscriptions(): Promise<void>` — no-op on web/error
3. Add JSDoc comments to all exported functions and constants, matching the documentation style of `premium.ts` and `haptics.ts` (module-level `@module` doc comment, per-function descriptions).
4. Run tests and build to verify: `pnpm --filter mobile test -- --run` and `pnpm --filter mobile build`.

## Must-Haves

- [ ] All 7 wrapper functions implemented with platform guards
- [ ] Every function logs with `[PurchasePlugin]` prefix on both success and failure paths
- [ ] `PRODUCT_IDS` and `PLAN_IDS` constants match D068 product convention from research
- [ ] `PURCHASE_TYPE`, `Product`, `Transaction` types re-exported for consumer convenience
- [ ] Safe defaults returned on web: `false` for billing supported, `[]` for lists, `null` for single items
- [ ] `purchaseProduct()` logs warning when SUBS type used without planIdentifier
- [ ] All T01 tests pass
- [ ] `pnpm run build` from `apps/mobile` succeeds

## Verification

- `pnpm --filter mobile test -- --run src/lib/services/__tests__/purchase-plugin.test.ts` — all tests pass
- `pnpm --filter mobile build` — no TypeScript errors
- Manual code review: every exported function has platform guard, try/catch, and diagnostic logging

## Observability Impact

- Signals added/changed: `[PurchasePlugin]` console log prefix for all 7 functions — debug level for web skips, info level for success, error level for failures. Includes function name and relevant data (product IDs, not tokens/receipts).
- How a future agent inspects this: Filter console logs by `[PurchasePlugin]` to see all IAP activity. Each log line includes function name and outcome.
- Failure state exposed: Errors caught and logged with full error object. Functions never throw — they return safe defaults and log the problem.

## Inputs

- `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts` — test expectations from T01
- S01 research: Plugin API surface (`NativePurchases` methods, `PURCHASE_TYPE` enum, `Product`/`Transaction` types), product ID convention, Android planIdentifier requirement
- `apps/mobile/src/lib/services/haptics.ts` — reference pattern for native service wrapper with try/catch

## Expected Output

- `apps/mobile/src/lib/services/purchase-plugin.ts` — complete typed wrapper module with all 7 functions, product ID constants, type re-exports, platform guards, and diagnostic logging
