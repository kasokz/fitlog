# S02: Purchase State Management & Premium Gate Wiring

**Goal:** Evolve `premium.ts` from a single boolean to a granular product-tracking system that maps real store transactions to per-product purchase records, persists state across restarts, and revalidates on app launch/resume.
**Demo:** After completing a sandbox purchase, premium features (analytics tabs, PR history, progression suggestions) unlock immediately. Restarting the app preserves the unlocked state. The dev toggle in settings continues to work. All 4 existing consumers of `isPremiumUser()` / `canAccessFeature()` work without modification.

## Must-Haves

- `PurchasedProduct` type with `productId`, `productType`, `isActive`, `purchaseDate`, `expirationDate?`, `transactionId`
- Persistence of product map as JSON in `@capacitor/preferences` under `purchased_products` key
- `isTransactionActive(transaction)` abstracting iOS (`isActive`, `subscriptionState`) vs Android (`purchaseState === "1"`, `isAcknowledged`) differences
- `canAccessFeature(feature)` maps features to required product IDs (analytics → subscription, templates → template pack)
- `isPremiumUser()` returns `true` if ANY product is active (backward compat — no signature change)
- `setPremiumStatus()` continues to work for dev toggle (PREMIUM_KEY override checked first)
- `PremiumFeature` enum extended with `premium_templates`
- `revalidatePurchases()` calls `getPurchases()`, reconciles against persisted state, persists result
- `grantPurchase(transaction)` for post-purchase state update (called by future paywall after purchase completes)
- Revalidation wired into app lifecycle: root `+layout.svelte` triggers on mount and on `App.addListener('resume', ...)`
- `UpgradePrompt` feature prop type extended to include `'premium_templates'`
- Existing test suite evolved with new granular product tracking tests
- All existing consumers (analytics, PR history, workout progression, settings) continue working without modification

## Proof Level

- This slice proves: contract + integration
- Real runtime required: no (contract verification via Vitest mocks; integration verified by backward compat of existing consumers)
- Human/UAT required: no (sandbox purchase flow UAT is S03 scope when paywall triggers real purchases; this slice verifies the state management layer)

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — all tests pass (evolved suite with ~30+ assertions covering granular products, feature-to-product mapping, dev override, revalidation, JSON persistence, corrupted data fallback)
- `pnpm --filter mobile test -- --run` — all existing test suites still pass (no regressions)
- `pnpm --filter mobile build` — TypeScript compiles, no type errors from consumer pages
- Grep verification: `rg 'isPremiumUser|canAccessFeature' apps/mobile/src/routes/` shows unchanged consumer call sites

## Observability / Diagnostics

- Runtime signals: `[Premium]` prefixed console logs for all state operations (grant, revalidate, feature checks, dev override). Structured as `[Premium] operation: result` with product IDs and feature names. Purchase tokens/receipts never logged.
- Inspection surfaces: `purchased_products` key in `@capacitor/preferences` contains JSON-serialized product map — inspectable via Capacitor preferences debug tools or `Preferences.get({ key: 'purchased_products' })` in console.
- Failure visibility: JSON parse failure on corrupted preferences logged as `[Premium] corrupted purchased_products data, resetting to empty`. Revalidation failure (from `getPurchases()` returning error) logged as `[Premium] revalidation failed` — falls back to last-known persisted state (not empty).
- Redaction constraints: Transaction IDs logged for traceability. Receipt data (`receipt`, `purchaseToken`, `jwsRepresentation`) never logged per D072.

## Integration Closure

- Upstream surfaces consumed: `purchase-plugin.ts` (`getPurchases()`, `restorePurchases()`, `PRODUCT_IDS`, `Transaction` type) from S01
- New wiring introduced in this slice: `revalidatePurchases()` called from `+layout.svelte` on mount + `App.addListener('resume', ...)`. `grantPurchase(transaction)` exported for S03 paywall to call after successful purchase. `UpgradePrompt` feature prop extended for S04 template UI.
- What remains before the milestone is truly usable end-to-end: S03 (paywall UI triggering real purchases and calling `grantPurchase()`), S04 (premium templates consuming `canAccessFeature(PremiumFeature.premium_templates)`), S06 (end-to-end device verification)

## Tasks

- [x] **T01: Evolve premium.ts with granular product tracking and write test suite** `est:1h`
  - Why: Core data model and business logic — `PurchasedProduct` type, `isTransactionActive()`, feature-to-product mapping, persistence, dev override, `revalidatePurchases()`, `grantPurchase()`. Tests written alongside code to verify all contract paths.
  - Files: `apps/mobile/src/lib/services/premium.ts`, `apps/mobile/src/lib/db/__tests__/premium.test.ts`
  - Do: Define `PurchasedProduct` type. Add `PRODUCTS_KEY` for JSON persistence. Implement `isTransactionActive()` with iOS/Android branching. Implement `mapTransactionToProduct()`. Evolve `isPremiumUser()` to check dev override first, then product map. Evolve `canAccessFeature()` with feature-to-product mapping. Add `grantPurchase()`, `revalidatePurchases()`, `getActiveProducts()`. Extend `PremiumFeature` enum with `premium_templates`. Keep `setPremiumStatus()` for dev toggle. Evolve test suite with: granular product assertions, feature-to-product mapping, dev override priority, revalidation mock, JSON corruption fallback, backward compat checks.
  - Verify: `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` passes all new + existing tests
  - Done when: All premium service functions work with granular product tracking, all tests pass, `isPremiumUser()` signature unchanged

- [x] **T02: Wire lifecycle revalidation and extend UpgradePrompt** `est:30m`
  - Why: Connects the premium service to app lifecycle (mount + resume) so purchase state stays fresh, and extends `UpgradePrompt` feature prop for S04 template UI consumption.
  - Files: `apps/mobile/src/routes/+layout.svelte`, `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte`
  - Do: Import `revalidatePurchases` and `App` from `@capacitor/app` in root layout. Add fire-and-forget `revalidatePurchases()` call after `ready = true`. Register `App.addListener('resume', revalidatePurchases)` with cleanup via returned handle. Extend `UpgradePrompt` Props `feature` union with `'premium_templates'` and add corresponding description derived. Add `premium_upgrade_description_premium_templates` key to `de.json` and `en.json`.
  - Verify: `pnpm --filter mobile build` succeeds. `pnpm --filter mobile test -- --run` all tests pass (no regressions). Grep `revalidatePurchases` in `+layout.svelte` confirms wiring. i18n key count parity between de.json and en.json.
  - Done when: Root layout calls `revalidatePurchases()` on mount and resume. UpgradePrompt accepts `'premium_templates'` feature. Build passes. No consumer regressions.

- [x] **T03: Verify backward compatibility and full-slice integration** `est:20m`
  - Why: Final verification that all 4 existing consumers work without modification, the full test suite passes, and the build is clean.
  - Files: `apps/mobile/src/routes/history/analytics/+page.svelte`, `apps/mobile/src/routes/history/prs/+page.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/src/routes/settings/+page.svelte`
  - Do: Run full test suite. Run build. Grep all consumer files to confirm zero changes to `isPremiumUser()` / `canAccessFeature()` call sites. Verify settings dev toggle still uses `setPremiumStatus()`. Verify i18n key parity across de.json and en.json. If any consumer needs a type update (e.g., importing new enum value), make the minimal fix.
  - Verify: `pnpm --filter mobile test -- --run` all suites pass. `pnpm --filter mobile build` succeeds. `rg 'isPremiumUser|canAccessFeature|setPremiumStatus' apps/mobile/src/routes/` shows no new changes to existing call patterns. i18n verification script shows zero drift.
  - Done when: All tests pass, build succeeds, zero regressions in existing consumer code, i18n parity confirmed.

## Files Likely Touched

- `apps/mobile/src/lib/services/premium.ts`
- `apps/mobile/src/lib/db/__tests__/premium.test.ts`
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
