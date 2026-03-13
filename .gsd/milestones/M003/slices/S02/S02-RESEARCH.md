# S02: Purchase State Management & Premium Gate Wiring — Research

**Date:** 2026-03-12

## Summary

S02 evolves the existing `premium.ts` service from a single boolean (`premium_status` in Preferences) to a granular product-tracking system that maps individual `Transaction` objects from `@capgo/native-purchases` to per-product purchase records persisted via `@capacitor/preferences`. The core challenge is abstracting platform-specific Transaction fields (iOS: `isActive`, `expirationDate`, `subscriptionState`; Android: `purchaseState === "1"`, `isAcknowledged`) into a unified `PurchasedProduct` type, then wiring `canAccessFeature()` to check specific product ownership instead of a single flag.

The existing infrastructure is well-suited for this evolution. S01 delivered a typed `purchase-plugin.ts` wrapper with `getPurchases()`, `restorePurchases()`, and product ID constants (`PRODUCT_IDS.PREMIUM_ANNUAL`, `PREMIUM_MONTHLY`, `TEMPLATE_PACK`). The existing `premium.ts` service has 4 consumers: analytics dashboard, PR history, workout progression suggestions, and settings. All use the same pattern: `const premium = await isPremiumUser()` in an `$effect` or `async function`. The evolution must maintain backward compatibility — all 4 consumers should continue working without modification by keeping `isPremiumUser()` as a convenience that delegates to the new granular system.

Subscription revalidation on app launch is achieved by calling `getPurchases()` (from the plugin wrapper) on app resume/launch and reconciling the returned transactions against persisted state. The `@capacitor/app` plugin (already installed) provides `addListener('resume', ...)` and `addListener('appStateChange', ...)` for lifecycle hooks. The root `+layout.svelte` is the natural initialization point — it already runs an async `$effect` on mount for onboarding checks.

## Recommendation

**Approach:** Evolve `premium.ts` into a `PurchaseService` module that:
1. Defines a `PurchasedProduct` type with `productId`, `productType` (subs/inapp), `isActive`, `purchaseDate`, `expirationDate?`, `transactionId`
2. Persists a `Map<productId, PurchasedProduct>` as JSON in Preferences under a new key (`purchased_products`), replacing the single `premium_status` key
3. Provides `isTransactionActive(transaction: Transaction): boolean` that abstracts iOS/Android differences
4. Evolves `canAccessFeature(feature)` to map features to required product IDs (analytics features → subscription, template features → template pack)
5. Keeps `isPremiumUser()` as a convenience that returns true if ANY product is active (maintains backward compat)
6. Adds `revalidatePurchases()` that calls `getPurchases()` and reconciles against persisted state
7. Wires revalidation into app lifecycle (launch + resume) via `@capacitor/app` listener in root layout

**Feature-to-product mapping:**
- `PremiumFeature.full_charts` / `volume_trends` / `extended_history` / `progression_suggestions` → requires active subscription (`PREMIUM_ANNUAL` or `PREMIUM_MONTHLY`)
- New `PremiumFeature.premium_templates` → requires template pack (`TEMPLATE_PACK`)

**State persistence strategy:** Store JSON-serialized array of `PurchasedProduct` in Preferences. On `revalidatePurchases()`, fetch fresh transactions from the store, compute active status per product, persist the result, and update the in-memory state. This ensures purchase state survives app restart even without network (reads from Preferences), while network-available launches refresh the data.

**Dev toggle preservation:** The existing `import.meta.env.DEV` premium toggle in settings must continue working. When the dev toggle is active, `isPremiumUser()` and `canAccessFeature()` should return true regardless of actual purchase state (existing behavior). This means the service reads the dev override first, then falls through to real purchase state.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Purchase state persistence | `@capacitor/preferences` (already in deps) | Same mechanism as current `premium.ts`. JSON serialization of product map is simple and sufficient. |
| Platform transaction abstraction | `Transaction` type from `@capgo/native-purchases` | Rich typed interface with platform-specific fields documented. Build a thin `isTransactionActive()` on top. |
| App lifecycle events (resume/foreground) | `@capacitor/app` `addListener('resume', ...)` | Already installed (`@capacitor/app@^8.0.0`). Provides app state change and resume events. |
| Feature gating infrastructure | Existing `premium.ts` + `canAccessFeature()` + `PremiumFeature` enum | All 4 consumers already use this API. Evolve internals, keep external API stable. |
| Reactive state in Svelte components | Svelte 5 `$state` + `$effect` pattern | All existing consumers use `$effect(() => { isPremiumUser().then(...) })`. Same pattern works with evolved service. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/premium.ts` — Current premium service. Single boolean via Preferences. Exports `isPremiumUser()`, `setPremiumStatus()`, `canAccessFeature()`, `PremiumFeature` enum. **Evolve in-place**: extend the enum, add `PurchasedProduct` type, change persistence from single boolean to product map, keep function signatures backward-compatible.
- `apps/mobile/src/lib/services/purchase-plugin.ts` — S01's typed wrapper. Exports `getPurchases()`, `restorePurchases()`, `PRODUCT_IDS`, `PLAN_IDS`, `PURCHASE_TYPE`, `Transaction` type. **Consume directly** in the evolved premium service for revalidation and post-purchase grant.
- `apps/mobile/src/routes/history/analytics/+page.svelte` — Reference consumer: `premium = await isPremiumUser()` in `initDashboard()`, gates Volume/Body Weight tabs + time range. Must continue working without modification.
- `apps/mobile/src/routes/history/prs/+page.svelte` — Reference consumer: `premium = await isPremiumUser()` in `loadPRHistory()`, limits free users to 3 exercise PR groups. Must continue working.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Reference consumer: `isPremiumUser()` gates progression suggestion loading (fire-and-forget). Must continue working.
- `apps/mobile/src/routes/settings/+page.svelte` — Uses both `isPremiumUser()`/`setPremiumStatus()` for dev toggle and S01's IAP test buttons. **Needs update**: `setPremiumStatus()` should remain for dev toggle but the underlying mechanism changes.
- `apps/mobile/src/routes/+layout.svelte` — Root layout with `$effect` on mount for onboarding check. **Add revalidation call here**: after `ready = true`, trigger `revalidatePurchases()` as fire-and-forget. Also register `App.addListener('resume', revalidatePurchases)`.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Upgrade prompt card. `handleUpgrade()` currently logs. **S03 scope** to wire to real purchase flow — but S02 should expand the `feature` prop type to include `'premium_templates'` so S04 can use it.
- `apps/mobile/src/lib/db/__tests__/premium.test.ts` — Existing test suite with 14 assertions. Mocks `@capacitor/preferences` with in-memory `Map`. **Evolve** to test new granular product tracking, feature-to-product mapping, and revalidation logic.

## Constraints

- **Backward compatibility required**: All 4 existing consumers of `isPremiumUser()` and `canAccessFeature()` must continue working without changes. The function signatures must not change. `isPremiumUser()` must still return `Promise<boolean>`.
- **Dev toggle must keep working**: The `import.meta.env.DEV` premium toggle in settings calls `setPremiumStatus(active)`. This must override real purchase state in dev mode. The evolved service must check for a dev override key before consulting real purchase data.
- **Platform transaction field differences**: iOS subscriptions have `isActive: boolean`, `expirationDate: string`, `subscriptionState`. Android has `purchaseState: "1"` for valid, `isAcknowledged: boolean`. Non-consumable INAPP on iOS doesn't have `isActive` — it's present in `getPurchases()` response and that's sufficient. The abstraction layer must handle all these cases.
- **Preferences stores only strings**: `@capacitor/preferences` `set()` takes `{key, value: string}`. The product map must be JSON-serialized for storage.
- **Web has no purchase data**: On web (dev mode), `getPurchases()` returns `[]` (plugin wrapper handles this). Revalidation on web is a no-op — only the dev toggle provides premium access. The service must not error when revalidation returns empty on web.
- **`getPurchases()` on Android may not return subscription expiry**: Android transactions don't have `expirationDate` or `isActive`. A subscription present in `getPurchases()` with `purchaseState === "1"` and `isAcknowledged === true` is considered active. Expired Android subscriptions simply stop appearing in `getPurchases()`.
- **No concurrent `getProduct()` calls**: S01 documented that the native billing client doesn't support concurrent queries. `revalidatePurchases()` should use `getPurchases()` (single call, returns all transactions) not multiple `getProduct()` calls.

## Common Pitfalls

- **Breaking existing consumers by changing function signatures** — `isPremiumUser()` must remain `() => Promise<boolean>`. Don't change it to accept parameters or return a different type. Instead, add new functions (`getActiveProducts()`, `hasProduct()`) alongside the existing API.
- **Forgetting the dev override path** — If the service only checks real purchase data, the dev toggle breaks. Must check `PREMIUM_KEY` (dev override) first, then real purchase state. Test both paths.
- **Race condition between revalidation and page-level checks** — If `revalidatePurchases()` is async and a page's `$effect` calls `isPremiumUser()` before revalidation completes, it reads stale persisted state. This is acceptable: the persisted state from the previous session is "good enough" for the first render, and revalidation updates it for subsequent checks. Document this as expected behavior.
- **JSON parse failure on corrupted Preferences data** — If the `purchased_products` JSON is corrupted (edge case: app crash during write), `JSON.parse` throws. Wrap in try/catch and fall back to empty product map (free user). Log the parse error for diagnostics.
- **Not handling the "subscription present but inactive" case on iOS** — An iOS transaction can have `isActive: false` with `subscriptionState: 'expired'` or `'revoked'`. Must check `isActive === true` (not just presence in the array) for subscriptions. For non-consumable INAPP, presence alone is sufficient.
- **Forgetting to persist after revalidation** — If `revalidatePurchases()` updates in-memory state but forgets to call `Preferences.set()`, the state is lost on restart. Always persist after reconciliation.
- **Over-frequent revalidation** — Calling `getPurchases()` on every page navigation would be excessive. Revalidate on app launch and resume only. Individual page premium checks read from persisted state (fast, synchronous after first load).

## Open Risks

- **Transaction data shape may differ between StoreKit sandbox and production** — Some Transaction fields (`subscriptionState`, `environment`) are only present on certain iOS versions (iOS 15+ for `isActive`, iOS 16+ for `environment`). The `isTransactionActive()` function must have fallback logic when fields are missing.
- **getPurchases() may return empty on first install before any purchase** — This is expected behavior. The service must handle this gracefully (empty product map = free user). Only becomes a risk if the code assumes `getPurchases()` always returns at least one transaction.
- **Preferences key migration** — The old `premium_status` key (dev toggle) coexists with the new `purchased_products` key. If a user was using the dev toggle, the old key persists. Must handle both keys: old key = dev override, new key = real purchases. Clear documentation of the dual-key semantics.
- **`addListener('resume')` cleanup** — The listener registered in `+layout.svelte` should be cleaned up when the component is destroyed (unlikely for root layout, but good practice). Use `onDestroy` or the returned `PluginListenerHandle.remove()`.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor best practices | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) — relevant for lifecycle management patterns |
| Capacitor security | `cap-go/capacitor-skills@capacitor-security` | available (91 installs) — lower priority for this slice |
| Capacitor app store | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) — more relevant for S05/S06 |
| @capgo/native-purchases | (no dedicated skill found) | none found |

## Sources

- `@capgo/native-purchases` Transaction interface — full typed definition with platform-specific field documentation (source: `node_modules/@capgo/native-purchases/dist/esm/definitions.d.ts`)
- `@capacitor/app` AppState listener — `addListener('resume', ...)` and `addListener('appStateChange', ...)` for lifecycle hooks (source: `node_modules/@capacitor/app/dist/esm/definitions.d.ts`)
- Existing `premium.ts` service — current single-boolean implementation, Preferences usage pattern, PremiumFeature enum (source: `apps/mobile/src/lib/services/premium.ts`)
- S01 task summaries — purchase-plugin wrapper API, PRODUCT_IDS, PLAN_IDS, test patterns (source: `.gsd/milestones/M003/slices/S01/tasks/T01-T04-SUMMARY.md`)
- Existing premium gate consumers — analytics, PR history, workout progression, settings page patterns (source: `rg` over `src/routes/`)
- Existing test patterns — Preferences mock with in-memory Map, dynamic import with `vi.mock` hoisting (source: `src/lib/db/__tests__/premium.test.ts`, `src/lib/services/__tests__/purchase-plugin.test.ts`)
- Plugin Transaction type platform differences — iOS `isActive`/`expirationDate`/`subscriptionState` vs Android `purchaseState`/`isAcknowledged` (source: plugin type definitions, M003-RESEARCH.md constraints)
- `runed` Context utility — available for Svelte context management but not needed here; premium service is a module singleton, not component-scoped context (source: `node_modules/runed/dist/utilities/context/context.d.ts`)
