# S03: Paywall UX & Upgrade Flows

**Goal:** Tapping "Premium freischalten" on any UpgradePrompt opens a polished paywall Drawer with dynamically loaded store prices, Apple-required subscription terms, and a functional purchase button. Restore Purchases and Manage Subscription are accessible from settings for all users.
**Demo:** Open analytics page as free user → tap "Premium freischalten" → PaywallDrawer slides up with real product names/prices loaded from store (or loading/error state on web) → tap purchase button → native purchase dialog (or graceful no-op on web) → on success, drawer closes, premium features unlock immediately. In settings, Restore Purchases button is visible to all users and Manage Subscription appears when subscribed.

## Must-Haves

- PaywallDrawer component using vaul-svelte Drawer pattern with loading → products → error states
- Dynamic product prices from `getProducts()` (never hardcoded)
- Apple-mandated subscription terms text (auto-renewal, price/period, cancellation instructions) visible near purchase button
- Privacy Policy and Terms of Service links in paywall (placeholder URLs acceptable for S03)
- Purchase button calls `purchaseProduct()` → `grantPurchase()` → closes drawer → toast confirmation
- Loading/disabled state on purchase button during transaction to prevent double-taps
- UpgradePrompt wired with `onupgrade` callback to open PaywallDrawer from any page
- Restore Purchases button in settings visible to all users (not just dev mode)
- Manage Subscription link in settings visible when user has active subscription
- All new UI text added as i18n keys to both `de.json` and `en.json`
- Empty products (web) handled gracefully — informative fallback message, no broken buttons
- `null` return from `purchaseProduct()` treated as user-cancelled — no error toast, just return to paywall

## Proof Level

- This slice proves: integration
- Real runtime required: yes (native sandbox for real purchase flow, web for graceful degradation)
- Human/UAT required: yes (native purchase dialog is platform-gated; web flow can be verified by build + visual inspection)

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — existing 51 tests still pass (no regressions)
- `pnpm --filter mobile test -- --run` — full test suite passes (no regressions)
- `pnpm --filter mobile build` — TypeScript compiles with no errors
- `rg 'onupgrade' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — callback prop exists
- `rg 'PaywallDrawer' apps/mobile/src/routes/history/analytics/+page.svelte apps/mobile/src/routes/history/prs/+page.svelte` — drawer wired in both UpgradePrompt consumer pages
- `rg 'grantPurchase' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — purchase completion wired to state persistence
- `rg 'restorePurchases' apps/mobile/src/routes/settings/+page.svelte` — restore visible outside dev block
- `rg 'manageSubscriptions' apps/mobile/src/routes/settings/+page.svelte` — manage subscription wired
- i18n key count parity: `jq 'keys | length' apps/mobile/messages/de.json` == `jq 'keys | length' apps/mobile/messages/en.json`
- `rg 'paywall_' apps/mobile/messages/de.json | wc -l` >= 10 (new paywall keys exist)

## Observability / Diagnostics

- Runtime signals: `[PurchasePlugin]` prefixed logs for product loading, purchase attempts, restore; `[Premium]` prefixed logs for grant and revalidation; `[Paywall]` prefix for drawer state transitions (open, products loaded, purchase initiated, purchase complete, purchase cancelled, error)
- Inspection surfaces: Filter console by `[Paywall]` to trace drawer lifecycle; filter by `[Premium]` to see state changes after purchase; `Preferences.get({ key: 'purchased_products' })` to inspect persisted state
- Failure visibility: PaywallDrawer shows user-visible error state when products fail to load; purchase button disabled state prevents double-tap; `null` transaction logged at debug level (user cancel vs error indistinguishable per D073)
- Redaction constraints: Transaction IDs logged; purchase tokens/receipts never logged (per D072)

## Integration Closure

- Upstream surfaces consumed: `purchase-plugin.ts` (`getProducts`, `purchaseProduct`, `restorePurchases`, `manageSubscriptions`, `PRODUCT_IDS`, `PLAN_IDS`, `PURCHASE_TYPE`), `premium.ts` (`grantPurchase`, `revalidatePurchases`, `isPremiumUser`, `getActiveProducts`), `UpgradePrompt.svelte`, settings page, vaul-svelte Drawer, svelte-sonner toast
- New wiring introduced in this slice: PaywallDrawer component (new), UpgradePrompt → PaywallDrawer callback bridge, settings production Restore Purchases + Manage Subscription sections, i18n keys for paywall/subscription UI
- What remains before the milestone is truly usable end-to-end: S04 (premium templates), S05 (store listing), S06 (end-to-end integration + submission), S07 (full locale sync). Real Privacy Policy / Terms of Service URLs (S05). Physical device sandbox purchase verification (S06).

## Tasks

- [x] **T01: Build PaywallDrawer component with dynamic product loading** `est:1h30m`
  - Why: Core deliverable — the paywall UI that displays store products with dynamic prices, subscription terms, and purchase buttons. Without this, there's nothing for UpgradePrompt to open.
  - Files: `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte`, `apps/mobile/src/lib/components/premium/paywall-constants.ts`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Create PaywallDrawer using Drawer pattern from exercises page. Three states: loading (spinner while getProducts fetches), loaded (product cards with priceString/title, subscription terms, purchase buttons), error (informative message when products empty). Subscription terms text as small print near purchase button per Apple requirements. Privacy Policy + Terms of Service as tappable links (placeholder URLs in constants file). Purchase button calls purchaseProduct → on success → grantPurchase → close drawer → toast.success. On null return (cancel), no toast, stay on paywall. Loading state on purchase button during transaction. Separate getProducts calls for SUBS and INAPP product types. Add all i18n keys to de.json and en.json. Use `[Paywall]` console prefix for all logging.
  - Verify: `pnpm --filter mobile build` passes. `rg 'grantPurchase' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` shows purchase→grant wiring. `rg 'paywall_' apps/mobile/messages/de.json | wc -l` >= 10. i18n key parity check.
  - Done when: PaywallDrawer component exists with all three states, purchase flow wired end-to-end, Apple subscription terms displayed, all i18n keys in both locales.

- [x] **T02: Wire UpgradePrompt to open PaywallDrawer from consumer pages** `est:45m`
  - Why: Connects the existing UpgradePrompt "Premium freischalten" button to actually open the paywall. Without this wiring, the button still only logs to console.
  - Files: `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte`, `apps/mobile/src/routes/history/analytics/+page.svelte`, `apps/mobile/src/routes/history/prs/+page.svelte`
  - Do: Add `onupgrade?: () => void` callback prop to UpgradePrompt. Replace `handleUpgrade()` console.log with `onupgrade?.()` call. In analytics page: add PaywallDrawer with `bind:open`, pass `() => paywallOpen = true` as onupgrade to UpgradePrompt. Same pattern for PR history page. After successful purchase in drawer, the page's existing `$effect` calling `isPremiumUser()` will re-evaluate on next mount/interaction — for immediate reactivity, call `invalidateAll()` or re-trigger the premium check after drawer closes.
  - Verify: `pnpm --filter mobile build` passes. `rg 'onupgrade' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` shows prop. `rg 'PaywallDrawer' apps/mobile/src/routes/history/analytics/+page.svelte apps/mobile/src/routes/history/prs/+page.svelte` shows drawer in both pages.
  - Done when: Tapping "Premium freischalten" on analytics and PR history pages opens PaywallDrawer. Completing a purchase closes drawer and the page re-checks premium status.

- [x] **T03: Add production Restore Purchases and Manage Subscription to settings** `est:45m`
  - Why: Apple requires a Restore Purchases button accessible to all users. Manage Subscription link improves retention by making cancellation/modification easy (also an Apple review requirement). Currently both are dev-only.
  - Files: `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Add a "Abonnement" section visible to ALL users (outside dev block) with: (1) Restore Purchases button that calls `restorePurchases()` → `revalidatePurchases()` → toast with count, with loading state. (2) Manage Subscription button (visible only when `getActiveProducts()` returns subscription products) that calls `manageSubscriptions()`. (3) Current plan status display showing active product name or "Kostenlos" for free users. Add i18n keys for all new labels. Keep existing dev-only IAP test section unchanged.
  - Verify: `pnpm --filter mobile build` passes. `rg 'restorePurchases' apps/mobile/src/routes/settings/+page.svelte` shows restore outside dev block. `rg 'manageSubscriptions' apps/mobile/src/routes/settings/+page.svelte` shows manage subscription wired. i18n key parity check.
  - Done when: Settings page shows Subscription section to all users with Restore Purchases button, conditional Manage Subscription link, and current plan status. All text is i18n'd in de + en.

- [x] **T04: Final integration verification and cleanup** `est:30m`
  - Why: Ensures no regressions across the full test suite, all consumer pages work together, i18n is synchronized, and all paywall flows are properly connected.
  - Files: none created — verification only
  - Do: Run full test suite. Run build. Verify i18n key parity. Grep all consumer wiring points. Verify no hardcoded prices in any PaywallDrawer or settings code. Verify Apple compliance checklist: subscription terms text, restore button accessible, privacy/terms links present. Verify `[Paywall]` logging exists for key state transitions.
  - Verify: `pnpm --filter mobile test -- --run` passes (all tests, zero failures). `pnpm --filter mobile build` succeeds. `jq 'keys | length' de.json` == `jq 'keys | length' en.json`. `rg 'priceString\|product\.price' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` shows dynamic pricing (no hardcoded €/$). `rg '\[Paywall\]' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` shows logging.
  - Done when: Full test suite green, build clean, i18n synchronized, all wiring verified via grep, Apple compliance checklist passed.

## Files Likely Touched

- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` (new)
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` (new)
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` (evolve — add onupgrade prop)
- `apps/mobile/src/routes/history/analytics/+page.svelte` (evolve — add PaywallDrawer + wiring)
- `apps/mobile/src/routes/history/prs/+page.svelte` (evolve — add PaywallDrawer + wiring)
- `apps/mobile/src/routes/settings/+page.svelte` (evolve — add production subscription section)
- `apps/mobile/messages/de.json` (add ~15-20 paywall/subscription keys)
- `apps/mobile/messages/en.json` (add ~15-20 paywall/subscription keys)
