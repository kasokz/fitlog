---
estimated_steps: 4
estimated_files: 3
---

# T03: Add production Restore Purchases and Manage Subscription to settings

**Slice:** S03 — Paywall UX & Upgrade Flows
**Milestone:** M003

## Description

Evolve the settings page to include a production-visible "Abonnement" (Subscription) section with Restore Purchases, Manage Subscription, and current plan status. Apple requires a Restore Purchases button accessible to all users (not hidden behind dev mode). The Manage Subscription link opens the native OS subscription management page and should only appear when the user has an active subscription. The current plan status shows either the active product name or a "Free" indicator.

The existing dev-only IAP testing section remains unchanged — it provides developer diagnostics. The new production section is separate and positioned above the dev block.

## Steps

1. Add i18n keys to `de.json` and `en.json` for: subscription section header, current plan label, free plan label, restore purchases button text, restore purchases success toast, restore purchases error toast, manage subscription button text, subscription active status text.
2. Evolve `settings/+page.svelte`: Add new "Abonnement" section OUTSIDE the dev block, positioned between the Language section and the dev-only Premium toggle. This section is visible to ALL users. Contains: (a) Current plan display — on mount, check `getActiveProducts()` and show product names or "Kostenlos" for free users. (b) Restore Purchases button — calls `restorePurchases()` from purchase-plugin, then `revalidatePurchases()` from premium.ts to reconcile state, then toast with result count. Show loading state during restore. (c) Manage Subscription button — visible only when `getActiveProducts()` returns at least one subscription product (`productType === 'subs'`). Calls `manageSubscriptions()` from purchase-plugin.
3. Ensure the new subscription section re-reads active products after restore completes (refresh the local state so the UI updates — plan status and manage button visibility).
4. Verify the settings page builds clean and the new section is properly separated from the dev-only block.

## Must-Haves

- [ ] "Abonnement" section visible to ALL users (outside `import.meta.env.DEV` block)
- [ ] Current plan status shows active product name or "Kostenlos"
- [ ] Restore Purchases button calls `restorePurchases()` → `revalidatePurchases()` → toast
- [ ] Restore button has loading state during operation
- [ ] Manage Subscription button visible only with active subscription, calls `manageSubscriptions()`
- [ ] State refreshes after restore (plan status + manage button visibility update)
- [ ] All new text uses i18n keys in both de.json and en.json
- [ ] Existing dev-only IAP test section unchanged

## Verification

- `pnpm --filter mobile build` — compiles with no type errors
- `rg 'restorePurchases' apps/mobile/src/routes/settings/+page.svelte` — appears outside dev block
- `rg 'manageSubscriptions' apps/mobile/src/routes/settings/+page.svelte` — manage subscription wired
- `rg 'getActiveProducts' apps/mobile/src/routes/settings/+page.svelte` — active product check for plan status
- i18n key parity: `jq 'keys | length' apps/mobile/messages/de.json` == `jq 'keys | length' apps/mobile/messages/en.json`
- `pnpm --filter mobile test -- --run` — no test regressions

## Observability Impact

- Signals added/changed: `[PurchasePlugin] restorePurchases` and `[Premium] revalidated` logs fire during restore flow; `[PurchasePlugin] manageSubscriptions` log when manage button tapped
- How a future agent inspects this: Filter by `[PurchasePlugin]` during restore; check `Preferences.get({ key: 'purchased_products' })` for post-restore state
- Failure state exposed: Toast shows error message on restore failure; restore button returns to non-loading state on error

## Inputs

- `apps/mobile/src/routes/settings/+page.svelte` — existing settings page with dev-only IAP section
- `apps/mobile/src/lib/services/purchase-plugin.ts` — `restorePurchases()`, `manageSubscriptions()`
- `apps/mobile/src/lib/services/premium.ts` — `revalidatePurchases()`, `getActiveProducts()`, `isPremiumUser()`
- `apps/mobile/messages/de.json` / `en.json` — current 331+ keys (T01 will have added paywall keys)

## Expected Output

- `apps/mobile/src/routes/settings/+page.svelte` — production subscription section with restore, manage, plan status
- `apps/mobile/messages/de.json` — ~8 new subscription management i18n keys added
- `apps/mobile/messages/en.json` — matching English translations added
