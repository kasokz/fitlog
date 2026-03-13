---
estimated_steps: 5
estimated_files: 4
---

# T01: Build PaywallDrawer component with dynamic product loading

**Slice:** S03 — Paywall UX & Upgrade Flows
**Milestone:** M003

## Description

Create the core PaywallDrawer component — a vaul-svelte Drawer that slides up from the bottom displaying store products with dynamically loaded prices, Apple-mandated subscription terms, and purchase buttons wired to the real IAP flow. This is the central UI deliverable of S03 — everything else connects to it.

The Drawer has three states: loading (products being fetched), loaded (product cards with purchase buttons), and error (products failed to load or returned empty). On successful purchase, `grantPurchase()` persists the state and the drawer closes with a success toast. On user cancellation (`null` return), no toast is shown. A constants file holds placeholder Privacy Policy / Terms of Service URLs for Apple compliance (real URLs created in S05).

## Steps

1. Create `paywall-constants.ts` with placeholder Privacy Policy URL, Terms of Service URL, and any shared paywall config (these are simple string constants, updated to real URLs in S05).
2. Add ~15-20 i18n keys to `de.json` and `en.json` for: paywall title, paywall subtitle, subscription section header, template pack section header, subscription terms auto-renewal text, cancellation instructions text, privacy policy link label, terms of service link label, purchase button labels (per product type), loading text, error text (products unavailable), purchase success toast, restore purchases link label in paywall footer.
3. Create `PaywallDrawer.svelte` using the Drawer pattern from exercises page (`Drawer.Root bind:open`, `Drawer.Content`, `Drawer.Header`, `Drawer.Title`). Component accepts `bind:open` and an optional `onpurchasecomplete` callback. On open (`$effect` watching `open`), call `getProducts()` twice (SUBS for annual/monthly, INAPP for template pack) and merge results. Store in local state with loading/error tracking.
4. Build the Drawer body: loading state (Loader2 spinner + text), error state (alert with retry button), loaded state with product cards showing `product.title` and `product.priceString`, subscription terms small-print paragraph, Privacy Policy + Terms of Service links, and purchase buttons. Each purchase button calls `handlePurchase(product)` which sets button loading state, calls `purchaseProduct()` with correct productType/planIdentifier, on non-null result calls `grantPurchase(transaction)`, closes drawer, fires toast.success, and calls `onpurchasecomplete?.()`. On null result, resets button loading and stays on paywall (no error toast). Add Restore Purchases link in paywall footer.
5. Add `[Paywall]` console logging for: drawer opened, products loaded (count), products failed, purchase initiated (productId), purchase complete (productId), purchase cancelled/failed.

## Must-Haves

- [ ] PaywallDrawer uses vaul-svelte Drawer with `bind:open` prop
- [ ] Products loaded dynamically via `getProducts()` — separate calls for SUBS and INAPP types
- [ ] Product prices displayed using `product.priceString` (never hardcoded)
- [ ] Three UI states: loading, loaded, error (empty products)
- [ ] Apple subscription terms text visible near purchase buttons (auto-renewal, cancellation instructions)
- [ ] Privacy Policy and Terms of Service links visible in paywall
- [ ] Purchase button calls `purchaseProduct()` → `grantPurchase()` → close drawer → toast
- [ ] Purchase button shows loading state during transaction (disabled, spinner)
- [ ] `null` purchase result does not show error toast
- [ ] `onpurchasecomplete` callback prop for parent page reactivity
- [ ] All text uses i18n keys in both de.json and en.json
- [ ] `[Paywall]` console prefix for all diagnostic logging

## Verification

- `pnpm --filter mobile build` — compiles with no type errors
- `rg 'getProducts' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — dynamic product loading present
- `rg 'grantPurchase' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — purchase completion wired
- `rg 'priceString' apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — dynamic pricing (no hardcoded amounts)
- `rg 'paywall_' apps/mobile/messages/de.json | wc -l` >= 10 — i18n keys added
- `jq 'keys | length' apps/mobile/messages/de.json` == `jq 'keys | length' apps/mobile/messages/en.json` — parity

## Observability Impact

- Signals added/changed: `[Paywall]` console prefix for drawer lifecycle (opened, products loaded, purchase initiated/complete/cancelled)
- How a future agent inspects this: Filter browser console by `[Paywall]` to trace drawer state transitions; filter by `[PurchasePlugin]` for underlying native calls; filter by `[Premium]` for state persistence
- Failure state exposed: Error UI state in drawer when products fail to load; purchase button disabled state during transaction; console logs for all failure paths

## Inputs

- `apps/mobile/src/lib/services/purchase-plugin.ts` — `getProducts`, `purchaseProduct`, `PRODUCT_IDS`, `PLAN_IDS`, `PURCHASE_TYPE`, `Product` type
- `apps/mobile/src/lib/services/premium.ts` — `grantPurchase`, `revalidatePurchases`
- `apps/mobile/src/routes/exercises/+page.svelte` — Drawer usage pattern reference
- `apps/mobile/messages/de.json` / `en.json` — existing 331 keys, add new paywall keys

## Expected Output

- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — complete paywall Drawer component with loading/loaded/error states, dynamic pricing, Apple terms, purchase flow
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — placeholder Privacy Policy and Terms of Service URLs
- `apps/mobile/messages/de.json` — ~15-20 new paywall i18n keys added
- `apps/mobile/messages/en.json` — matching English translations added
