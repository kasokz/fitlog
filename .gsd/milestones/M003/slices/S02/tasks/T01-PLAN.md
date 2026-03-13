---
estimated_steps: 5
estimated_files: 2
---

# T01: Evolve premium.ts with granular product tracking and write test suite

**Slice:** S02 — Purchase State Management & Premium Gate Wiring
**Milestone:** M003

## Description

Transform `premium.ts` from a single-boolean premium gate to a granular product-tracking system. Define `PurchasedProduct` type, implement `isTransactionActive()` abstracting iOS/Android transaction differences, evolve `canAccessFeature()` with feature-to-product mapping, add `grantPurchase()` and `revalidatePurchases()`, and persist product state as JSON via `@capacitor/preferences`. Simultaneously evolve the test suite to cover all new paths while maintaining backward compatibility with all 4 existing consumers.

## Steps

1. **Define types and constants in `premium.ts`**: Add `PurchasedProduct` interface (`productId`, `productType`, `isActive`, `purchaseDate`, `expirationDate?`, `transactionId`), `PRODUCTS_KEY = 'purchased_products'` constant, extend `PremiumFeature` enum with `premium_templates`. Define `FEATURE_PRODUCT_MAP` mapping each feature to required product IDs (analytics features → `[PREMIUM_ANNUAL, PREMIUM_MONTHLY]`, `premium_templates` → `[TEMPLATE_PACK]`).

2. **Implement core logic functions**: 
   - `isTransactionActive(transaction: Transaction): boolean` — For subscriptions (`productType === 'subs'`): check `isActive === true` on iOS, `purchaseState === '1'` on Android, presence of `subscriptionState` in `['subscribed', 'inGracePeriod', 'inBillingRetryPeriod']`. For non-consumable INAPP: presence in `getPurchases()` is sufficient (return true if the transaction exists with valid state — check `purchaseState === '1'` on Android if present, otherwise true).
   - `mapTransactionToProduct(transaction: Transaction): PurchasedProduct` — Maps a `Transaction` to a `PurchasedProduct` record.
   - Internal `loadProducts(): Promise<Map<string, PurchasedProduct>>` — Reads `PRODUCTS_KEY` from Preferences, JSON.parse with try/catch (corrupted → empty map + warn log).
   - Internal `saveProducts(products: Map<string, PurchasedProduct>): Promise<void>` — JSON.stringify and write to Preferences.

3. **Evolve public API functions**:
   - `isPremiumUser()` — Check `PREMIUM_KEY` (dev override) first; if set, return true. Otherwise, load product map and return true if ANY product has `isActive === true`. Signature stays `() => Promise<boolean>`.
   - `setPremiumStatus(active)` — Unchanged behavior: sets/removes `PREMIUM_KEY` in Preferences. Used for dev toggle only.
   - `canAccessFeature(feature: PremiumFeature)` — Check dev override first (return true if `PREMIUM_KEY` set). Otherwise, load product map, look up required products for the feature via `FEATURE_PRODUCT_MAP`, return true if any matching product is active.
   - Add `grantPurchase(transaction: Transaction): Promise<void>` — Maps transaction to PurchasedProduct, adds to product map, persists. Logs `[Premium] granted: {productId}`.
   - Add `revalidatePurchases(): Promise<void>` — Calls `getPurchases()` from purchase-plugin, maps each to PurchasedProduct via `isTransactionActive()`, persists the reconciled map, logs count. On `getPurchases()` failure (returns `[]` on web/error per D073), keeps existing persisted state unchanged (don't overwrite with empty on web).
   - Add `getActiveProducts(): Promise<PurchasedProduct[]>` — Returns all active products from persisted map. Utility for future UI.

4. **Evolve test suite in `premium.test.ts`**: Keep all 14 existing assertions (they test `isPremiumUser`, `setPremiumStatus`, `canAccessFeature`, enum values — all must still pass). Add mock for `purchase-plugin.ts` (`getPurchases` returns configurable transaction arrays). Add test groups:
   - **PurchasedProduct persistence**: grant a mock transaction → load products → verify persisted. Grant two different products → verify both stored. Corrupt JSON in preferences → verify fallback to empty.
   - **isTransactionActive**: iOS subscription active (`isActive: true`), iOS subscription expired (`isActive: false, subscriptionState: 'expired'`), Android subscription valid (`purchaseState: '1', isAcknowledged: true`), iOS INAPP (no `isActive` field — presence = active), Android INAPP (`purchaseState: '1'`).
   - **Feature-to-product mapping**: `canAccessFeature(full_charts)` true when annual sub active, false when only template pack active. `canAccessFeature(premium_templates)` true when template pack active, false when only sub active.
   - **Dev override priority**: Set `PREMIUM_KEY` → `canAccessFeature` returns true even with empty product map. Clear `PREMIUM_KEY` → returns false.
   - **Revalidation**: Mock `getPurchases` returning transactions → `revalidatePurchases()` → verify product map updated. Mock `getPurchases` returning `[]` on web → verify existing persisted state not cleared.
   - **Backward compat**: `isPremiumUser()` returns true when any product is active (subscription OR template pack). `isPremiumUser()` returns false when no products and no dev override.

5. **Run verification**: `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — all tests pass. `pnpm --filter mobile build` — no type errors.

## Must-Haves

- [ ] `PurchasedProduct` type exported from `premium.ts`
- [ ] `PremiumFeature.premium_templates` added to enum
- [ ] `isTransactionActive()` handles iOS subs, Android subs, iOS INAPP, Android INAPP
- [ ] `isPremiumUser()` signature unchanged `() => Promise<boolean>`, checks dev override then product map
- [ ] `canAccessFeature()` maps features to specific product IDs
- [ ] `grantPurchase()` persists transaction as PurchasedProduct
- [ ] `revalidatePurchases()` calls `getPurchases()` and reconciles state; does NOT clear state when `getPurchases()` returns empty on web
- [ ] JSON corruption fallback in `loadProducts()`
- [ ] All 14 existing test assertions still pass
- [ ] New test groups cover: persistence, isTransactionActive, feature-product mapping, dev override, revalidation, backward compat

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — all tests pass (30+ assertions)
- `pnpm --filter mobile build` — succeeds with no type errors
- `pnpm --filter mobile test -- --run` — full suite passes (no regressions)

## Observability Impact

- Signals added/changed: `[Premium]` log entries for: `granted: {productId}`, `revalidated: {count} active products`, `loadProducts: corrupted data, reset to empty`, `canAccessFeature({feature}): {result} (dev override)` vs `canAccessFeature({feature}): {result} (product check: {productIds})`
- How a future agent inspects this: Read `purchased_products` from Preferences. Filter console by `[Premium]`. Run the test suite for contract verification.
- Failure state exposed: JSON parse errors logged with `[Premium]` prefix. Revalidation that produces empty results on native (unexpected) logged as warning.

## Inputs

- `apps/mobile/src/lib/services/premium.ts` — current single-boolean implementation to evolve in-place
- `apps/mobile/src/lib/db/__tests__/premium.test.ts` — current 14-assertion test suite using `vi.mock` for Preferences
- `apps/mobile/src/lib/services/purchase-plugin.ts` — `getPurchases()`, `PRODUCT_IDS`, `Transaction` type to consume
- S02-RESEARCH.md — platform transaction field differences, constraints, pitfalls

## Expected Output

- `apps/mobile/src/lib/services/premium.ts` — evolved with `PurchasedProduct` type, extended enum, granular product tracking, `grantPurchase()`, `revalidatePurchases()`, `getActiveProducts()`, feature-to-product mapping
- `apps/mobile/src/lib/db/__tests__/premium.test.ts` — evolved test suite with 30+ assertions covering all new paths plus all existing backward-compat assertions
