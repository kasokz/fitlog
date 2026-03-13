---
id: T02
parent: S03
milestone: M003
provides:
  - UpgradePrompt wired to open PaywallDrawer via onupgrade callback
  - Analytics page hosts PaywallDrawer and re-checks premium after purchase
  - PR history page hosts PaywallDrawer and re-checks premium after purchase
key_files:
  - apps/mobile/src/lib/components/premium/UpgradePrompt.svelte
  - apps/mobile/src/routes/history/analytics/+page.svelte
  - apps/mobile/src/routes/history/prs/+page.svelte
key_decisions:
  - None — straightforward callback wiring following patterns established in T01
patterns_established:
  - Consumer pages wire PaywallDrawer via paywallOpen state + onupgrade callback on UpgradePrompt + onpurchasecomplete that re-checks isPremiumUser()
observability_surfaces:
  - "[Dashboard] Purchase complete — re-checking premium status" log on analytics page post-purchase
  - "[PRHistory] Purchase complete — re-checking premium status" log on PR history page post-purchase
  - Chains with existing [Paywall] and [Premium] log prefixes from T01/S02
duration: 1 step
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Wire UpgradePrompt to open PaywallDrawer from consumer pages

**Added onupgrade callback to UpgradePrompt and wired both consumer pages (analytics, PR history) to host PaywallDrawer with post-purchase premium re-check.**

## What Happened

1. **UpgradePrompt.svelte** — Added optional `onupgrade?: () => void` callback prop. `handleUpgrade()` now calls `onupgrade?.()` after the debug log instead of only logging. Non-breaking: pages that don't pass `onupgrade` keep the same no-op behavior.

2. **Analytics page** — Imported PaywallDrawer, added `paywallOpen` state, passed `onupgrade={() => paywallOpen = true}` to UpgradePrompt. Added `<PaywallDrawer bind:open={paywallOpen} onpurchasecomplete={handlePurchaseComplete} />` at the bottom. `handlePurchaseComplete` re-runs `premium = await isPremiumUser()` so the page reactively updates (premium tabs appear, UpgradePrompt hides, time range unlocks).

3. **PR history page** — Same pattern: PaywallDrawer import, `paywallOpen` state, `onupgrade` callback, `handlePurchaseComplete` re-check. After purchase, `premium` flips to true so `groups` derived shows all exercises and `hasMoreGroups` becomes false, hiding the UpgradePrompt.

## Verification

- `pnpm --filter mobile build` — compiles with zero type errors
- `pnpm --filter mobile test -- --run` — 409 tests pass across 17 files, zero failures
- `rg 'onupgrade' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — callback prop exists (3 hits: type, destructure, call)
- `rg 'PaywallDrawer' apps/mobile/src/routes/history/analytics/+page.svelte` — drawer wired (import + instance)
- `rg 'PaywallDrawer' apps/mobile/src/routes/history/prs/+page.svelte` — drawer wired (import + instance)
- `rg 'isPremiumUser' apps/mobile/src/routes/history/analytics/+page.svelte` — 3 hits (import, init, post-purchase)
- `rg 'isPremiumUser' apps/mobile/src/routes/history/prs/+page.svelte` — 3 hits (import, init, post-purchase)
- Slice checks: i18n parity (de: 348, en: 348), paywall keys >=10 (17 found), grantPurchase in PaywallDrawer confirmed

## Diagnostics

- Console filter `[Dashboard] Purchase complete` — analytics page post-purchase re-check
- Console filter `[PRHistory] Purchase complete` — PR history page post-purchase re-check
- Console filter `[Premium] Upgrade tapped` — UpgradePrompt button tap with feature context
- Chain with `[Paywall]` to trace drawer lifecycle and `[Premium]` to trace state changes

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Added `onupgrade` optional callback prop, `handleUpgrade()` now calls it
- `apps/mobile/src/routes/history/analytics/+page.svelte` — Hosts PaywallDrawer, wires onupgrade callback, re-checks premium on purchase complete
- `apps/mobile/src/routes/history/prs/+page.svelte` — Hosts PaywallDrawer, wires onupgrade callback, re-checks premium on purchase complete
