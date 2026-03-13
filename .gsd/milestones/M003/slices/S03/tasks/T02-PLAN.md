---
estimated_steps: 4
estimated_files: 3
---

# T02: Wire UpgradePrompt to open PaywallDrawer from consumer pages

**Slice:** S03 — Paywall UX & Upgrade Flows
**Milestone:** M003

## Description

Connect the existing UpgradePrompt component's "Premium freischalten" button to actually open the PaywallDrawer built in T01. Currently `handleUpgrade()` only logs to console. This task adds an `onupgrade` callback prop, then wires both consumer pages (analytics, PR history) to host a PaywallDrawer instance and open it when the user taps the upgrade button. After a successful purchase, the page re-checks premium status so the UpgradePrompt disappears and premium content shows.

## Steps

1. Evolve `UpgradePrompt.svelte`: Add optional `onupgrade?: () => void` callback prop to the Props interface. Replace the `console.log` body of `handleUpgrade()` with `onupgrade?.()` call (keep a debug log but call the callback). This is a non-breaking change — pages that don't pass onupgrade get the same no-op behavior.
2. Evolve `apps/mobile/src/routes/history/analytics/+page.svelte`: Import PaywallDrawer. Add `let paywallOpen = $state(false)`. Pass `onupgrade={() => paywallOpen = true}` to UpgradePrompt. Add `<PaywallDrawer bind:open={paywallOpen} onpurchasecomplete={handlePurchaseComplete} />` at the bottom. In `handlePurchaseComplete`, re-run the premium check (`premium = await isPremiumUser()`) so the page immediately updates to show premium content and hide the UpgradePrompt.
3. Evolve `apps/mobile/src/routes/history/prs/+page.svelte`: Same pattern as analytics page — import PaywallDrawer, add paywallOpen state, pass onupgrade callback, add PaywallDrawer instance, re-check premium status on purchase complete to show full PR history.
4. Verify that both pages correctly import PaywallDrawer, wire the callback, and handle post-purchase reactivity.

## Must-Haves

- [ ] UpgradePrompt has `onupgrade` optional callback prop
- [ ] UpgradePrompt button calls `onupgrade?.()` instead of only logging
- [ ] Analytics page hosts PaywallDrawer and opens it via UpgradePrompt
- [ ] PR history page hosts PaywallDrawer and opens it via UpgradePrompt
- [ ] After successful purchase, both pages re-check premium status and update UI

## Verification

- `pnpm --filter mobile build` — compiles with no type errors
- `rg 'onupgrade' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — callback prop exists
- `rg 'PaywallDrawer' apps/mobile/src/routes/history/analytics/+page.svelte` — drawer wired
- `rg 'PaywallDrawer' apps/mobile/src/routes/history/prs/+page.svelte` — drawer wired
- `rg 'isPremiumUser' apps/mobile/src/routes/history/analytics/+page.svelte` — premium re-check on purchase complete
- `pnpm --filter mobile test -- --run` — no test regressions

## Observability Impact

- Signals added/changed: None — uses existing `[Paywall]` and `[Premium]` logging from T01 and S02
- How a future agent inspects this: Console filter `[Paywall]` shows drawer open/close; `[Premium]` shows premium re-check after purchase
- Failure state exposed: None new — PaywallDrawer handles its own error states

## Inputs

- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — T01 output, the Drawer to embed
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — existing component to evolve
- `apps/mobile/src/routes/history/analytics/+page.svelte` — consumer page using UpgradePrompt with `feature="full_charts"`
- `apps/mobile/src/routes/history/prs/+page.svelte` — consumer page using UpgradePrompt with `feature="extended_history"`
- `apps/mobile/src/lib/services/premium.ts` — `isPremiumUser()` for post-purchase re-check

## Expected Output

- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — evolved with `onupgrade` callback prop
- `apps/mobile/src/routes/history/analytics/+page.svelte` — PaywallDrawer wired, post-purchase premium re-check
- `apps/mobile/src/routes/history/prs/+page.svelte` — PaywallDrawer wired, post-purchase premium re-check
