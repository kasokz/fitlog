# S03: Paywall UX & Upgrade Flows — Research

**Date:** 2026-03-12

## Summary

S03 builds the user-facing purchase experience: a paywall Drawer component that displays dynamically-loaded store prices with Apple-mandated subscription terms, wires the existing `UpgradePrompt` "Premium freischalten" button to open this paywall, executes the real purchase flow via S01/S02's infrastructure (`purchaseProduct()` → `grantPurchase()`), and adds production-grade Restore Purchases + Manage Subscription entries to the settings page. The existing premium infrastructure is solid — `purchase-plugin.ts` (S01) wraps all native calls with safe defaults, `premium.ts` (S02) has granular product tracking with `grantPurchase()` and `revalidatePurchases()`, and `UpgradePrompt.svelte` already renders in all 3 gated locations (analytics, PRs, workout progression). The primary work is: (1) a new `PaywallDrawer.svelte` component, (2) wiring `UpgradePrompt.handleUpgrade()` to open it, (3) connecting purchase completion to `grantPurchase()` + reactive state refresh, and (4) evolving the settings page with Restore/Manage for production users.

The highest risk in this slice is **Apple's subscription review requirements** — the paywall must display auto-renewal terms, price, period, and cancellation instructions near the purchase button, plus link to Privacy Policy and Terms of Service URLs. The technical integration itself is low-risk since S01/S02 already provide all the building blocks; this slice is primarily UI composition and flow orchestration.

## Recommendation

**Approach:** Build a `PaywallDrawer` component using the existing `Drawer` (vaul-svelte) pattern already used throughout the app (exercises, bodyweight, programs). The Drawer slides up from the bottom — natural for mobile paywall UX. On open, it calls `getProducts()` to fetch subscription and template pack products from the store, displays them with dynamic `product.priceString` / `product.title` / `product.description`, and shows Apple-required subscription terms as small-print text. Purchase buttons call `purchaseProduct()` → on success → `grantPurchase()` → close drawer → toast confirmation. The `UpgradePrompt` component gets an `onupgrade` callback prop that parent pages use to open the PaywallDrawer. Settings page evolves from dev-only IAP testing to production Restore Purchases button (visible to all users) + Manage Subscription link (visible when subscribed).

**Why Drawer over Dialog/Sheet:** The codebase already uses `Drawer` (vaul-svelte) for all bottom-up mobile interactions (exercise creation, bodyweight entry, exercise picker, etc.). This is the established pattern. Sheet is an alternative but isn't used anywhere in the app. Dialog is used for confirmations, not content-heavy flows.

**Why not a dedicated route:** A route (`/paywall`) would work but breaks the contextual flow — users want to unlock from where they are, not navigate away. A Drawer overlay preserves context and matches existing app patterns. The Drawer can be opened from any page via a shared open-state mechanism.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Bottom-sheet mobile paywall | `Drawer` from `@repo/ui/components/ui/drawer` (vaul-svelte) | Already used in 6 locations. Handles drag-to-dismiss, overlay, accessible focus trap. |
| Store product fetching | `getProducts()` / `getProduct()` from `purchase-plugin.ts` | S01 wrapper with safe web defaults, error logging, typed returns. |
| Purchase execution | `purchaseProduct()` from `purchase-plugin.ts` | Handles platform differences (planIdentifier for Android SUBS). Never throws. |
| Post-purchase state persistence | `grantPurchase()` from `premium.ts` | Maps Transaction → PurchasedProduct, persists to Preferences JSON map. |
| Restore purchases | `restorePurchases()` from `purchase-plugin.ts` | Calls native restore, fetches current purchases, returns Transaction[]. |
| Subscription management | `manageSubscriptions()` from `purchase-plugin.ts` | Opens native OS subscription management page. |
| Purchase revalidation after restore | `revalidatePurchases()` from `premium.ts` | Reconciles all store transactions to persisted state. |
| Toast notifications | `svelte-sonner` (`toast.success()` / `toast.error()`) | Used throughout the app for feedback. |
| Premium status check | `isPremiumUser()` / `getActiveProducts()` from `premium.ts` | Reads persisted product map, checks dev override. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/purchase-plugin.ts` — Complete purchase wrapper. Exports `getProducts()`, `getProduct()`, `purchaseProduct()`, `restorePurchases()`, `manageSubscriptions()`, `PRODUCT_IDS`, `PLAN_IDS`, `PURCHASE_TYPE`, `Product`, `Transaction` types. All functions return safe defaults on web, never throw (D073).
- `apps/mobile/src/lib/services/premium.ts` — Granular product tracking. Exports `grantPurchase(transaction)`, `revalidatePurchases()`, `getActiveProducts()`, `isPremiumUser()`, `canAccessFeature(feature)`, `PremiumFeature` enum, `PurchasedProduct` type. Feature-to-product mapping in `FEATURE_PRODUCT_MAP`.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Current upgrade card with Lock icon, feature-specific description, "Premium freischalten" button. `handleUpgrade()` currently only logs. Accepts `feature: 'full_charts' | 'extended_history' | 'premium_templates'`. Needs: `onupgrade` callback prop to open PaywallDrawer.
- `apps/mobile/src/routes/history/analytics/+page.svelte` — Uses `<UpgradePrompt feature="full_charts" />` at bottom of page when not premium. Pattern reference for how UpgradePrompt is placed.
- `apps/mobile/src/routes/history/prs/+page.svelte` — Uses `<UpgradePrompt feature="extended_history" />` when limited PR groups shown.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Uses `isPremiumUser()` to gate progression suggestions (fire-and-forget). No visible UpgradePrompt — just silently skips loading.
- `apps/mobile/src/routes/settings/+page.svelte` — Currently has dev-only IAP test section behind `import.meta.env.DEV`. Has `handleRestorePurchases()` already implemented but only in dev block. Needs production Restore + Manage Subscription sections.
- `apps/mobile/src/routes/exercises/+page.svelte` — Reference for Drawer usage pattern: `import * as Drawer from '@repo/ui/components/ui/drawer'`, `<Drawer.Root bind:open={...}>`, `<Drawer.Content>`, `<Drawer.Header>`, `<Drawer.Title>`.
- `apps/mobile/src/routes/+layout.svelte` — Root layout with `revalidatePurchases()` on mount + resume (wired in S02/T02).
- `apps/mobile/messages/de.json` / `en.json` — 331 keys each. 8 premium-related keys exist. Will need ~15-20 new keys for paywall content, subscription terms, restore/manage subscription, purchase states.

## Constraints

- **Apple dynamic pricing mandate:** All prices must come from `product.priceString` returned by `getProducts()`. Never hardcode prices. This means the paywall must handle a loading state while products are fetched.
- **Apple subscription terms display:** Must show auto-renewal terms, price per period, and cancellation instructions near the purchase button. Text like "Abonnement verlängert sich automatisch. Kündigung jederzeit über die Einstellungen möglich." required in the paywall UI.
- **Apple Privacy Policy + ToS links:** Must be visible in the paywall UI and in the store listing. URLs must be set up before store submission (S05 scope for URL creation, but paywall UI must link to them). Can use placeholder URLs initially and update in S05.
- **Apple Restore Purchases requirement:** A "Restore Purchases" button must be accessible to users. Common placement: settings page and/or paywall footer.
- **Web returns empty products:** `getProducts()` returns `[]` on web (D073). Paywall must handle gracefully — show fallback messaging or disable purchase buttons. Dev toggle in settings remains the web workflow.
- **`purchaseProduct()` returns `null` on failure/cancel:** The wrapper catches all errors and returns `null`. Paywall must differentiate "user cancelled" (no error toast) from "real failure" (error toast). Since the wrapper doesn't distinguish, treat `null` as user-cancelled-or-error and show a generic "try again" only if no transaction.
- **Android subscriptions need `planIdentifier`:** `PLAN_IDS.ANNUAL` / `PLAN_IDS.MONTHLY` must be passed alongside `PURCHASE_TYPE.SUBS`. Already handled in `purchase-plugin.ts` with warning logging. Paywall must pass the correct plan IDs.
- **Product type batching:** `getProducts()` requires separate calls for SUBS vs INAPP product types. Can't mix in one call. The settings page already demonstrates this pattern (two sequential calls).
- **i18n base locale is `de`:** All new keys go to `de.json` first. S07 handles full locale sync, but S03 should add keys to both `de.json` and `en.json` to avoid drift.
- **No concurrent `getProduct()` calls:** Plugin docs warn against `Promise.all` on `getProduct()`. Use `getProducts()` batch call instead for loading multiple products.

## Common Pitfalls

- **Paywall opens with empty/loading state and user taps purchase → crash** — Products must be fully loaded before purchase buttons are enabled. Use a loading state and disable buttons until products are resolved.
- **Forgetting to call `grantPurchase()` after successful purchase** — `purchaseProduct()` completes the native transaction but doesn't persist state. Must chain `grantPurchase(transaction)` immediately after to update the product map in Preferences.
- **Premium state not reactive after purchase** — Current `isPremiumUser()` is async and returns a snapshot. After purchase + grant, any open page checking premium status won't automatically update. Options: (a) reload/navigate after purchase, (b) use a reactive store. Simplest approach: close the drawer and let the parent page re-check on mount/effect. Pages already check `isPremiumUser()` in `$effect` at mount time.
- **Subscription terms text not in German base locale** — Apple doesn't mandate specific language, but the app's locale is German-primary. Subscription terms must be in the user's locale. Use i18n keys for all legal/terms text.
- **Drawer doesn't close on successful purchase** — Must explicitly set `open = false` after purchase completes. vaul-svelte's `Drawer.Root` uses `bind:open`.
- **Settings page Restore button duplicates dev-only restore** — The dev IAP testing section already has restore. Production Restore should be a separate section visible to all users, not duplicated inside the dev block.
- **Missing purchase-in-progress indicator** — Native purchase dialogs are async and can take several seconds. Show a spinner/loading state on the purchase button during the transaction to prevent double-taps.
- **`getProducts()` fails silently (returns `[]`)** — If products can't be loaded (network issue, store config error), the paywall should show an error state, not empty buttons.

## Open Risks

- **Privacy Policy and Terms of Service URLs don't exist yet** — Apple requires these linked in the paywall. S05 will create actual URLs. S03 should use placeholder constants (e.g., `https://fitlog.app/privacy`, `https://fitlog.app/terms`) that S05 will make real. This is acceptable for development/sandbox but must be real before store submission.
- **Reactive premium state after purchase** — The current architecture uses async `isPremiumUser()` checks in `$effect` at page mount. After a purchase in the paywall drawer, the underlying page won't auto-update until remounted. The simplest fix is `goto()` or `invalidateAll()` after purchase, but this may feel jarring. Alternative: a lightweight Svelte store wrapping premium state. This is a UX polish decision that may need iteration.
- **Product loading latency on native** — `getProducts()` makes a network call to Apple/Google servers. On slow connections, the paywall could show a spinner for several seconds. Consider pre-fetching products when the app launches (not just when paywall opens) and caching in memory.
- **User cancels native purchase dialog** — `purchaseProduct()` returns `null` for both cancellation and error. The paywall should not show an error toast on cancellation — just return to the paywall. Since the wrapper doesn't differentiate, the simplest approach is: show no error toast on `null` return, only a success toast on successful transaction.

## Skills Discovered

| Technology | Skill | Status | Recommendation |
|------------|-------|--------|----------------|
| Capacitor best practices | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) | Consider installing — high install count, same vendor as IAP plugin. Relevant to purchase flow patterns. |
| Capacitor App Store | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) | Consider installing — directly relevant to App Store submission requirements and review checklist. Most useful for S05/S06 but paywall compliance overlaps. |
| Paywall UX & CRO | `coreyhaines31/marketingskills@paywall-upgrade-cro` | available (15.5K installs) | Consider installing — very high install count. May provide paywall design best practices and conversion optimization patterns. |
| shadcn-svelte components | `exceptionless/exceptionless@shadcn-svelte components` | available (120 installs) | Skip — codebase already has established shadcn-svelte patterns. |

## Sources

- `@capgo/native-purchases` Product type, pricing display, and App Store compliance (source: Context7 /cap-go/capacitor-native-purchases, trust 9.8/10)
- `@capgo/native-purchases` iOS Testing Guide — App Store Connect approval checklist: Privacy Policy URL, Terms of Service URL, subscription terms in paywall UI (source: Context7 docs/iOS_TESTING_GUIDE.md)
- S01 task summaries — purchase-plugin.ts wrapper implementation details (source: .gsd/milestones/M003/slices/S01/tasks/)
- S02 task summaries — premium.ts evolution, lifecycle revalidation, UpgradePrompt extension (source: .gsd/milestones/M003/slices/S02/tasks/)
- Existing codebase — Drawer usage pattern (exercises, bodyweight, programs pages), toast pattern (svelte-sonner), i18n pattern (de.json base, 331 keys)
- M003 Research (D066-D078) — IAP plugin choice, product model, pricing model, transaction abstraction decisions
