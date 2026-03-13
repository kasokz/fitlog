---
estimated_steps: 5
estimated_files: 0
---

# T04: Final integration verification and cleanup

**Slice:** S03 — Paywall UX & Upgrade Flows
**Milestone:** M003

## Description

Run all slice-level verification checks to confirm the full S03 deliverable is correct: no test regressions, clean build, i18n synchronized, all wiring verified, no hardcoded prices, Apple compliance checklist passed, and diagnostic logging present. This is a verification-only task — no source files created or modified.

## Steps

1. Run `pnpm --filter mobile test -- --run` — all test suites must pass with zero failures. Specifically verify `premium.test.ts` still has 51+ passing tests.
2. Run `pnpm --filter mobile build` — must succeed with no TypeScript errors.
3. Verify i18n key parity: `jq 'keys | length' apps/mobile/messages/de.json` must equal `jq 'keys | length' apps/mobile/messages/en.json`. Verify new paywall keys exist in both files.
4. Apple compliance checklist grep verification: (a) `rg 'priceString' PaywallDrawer.svelte` — dynamic pricing, no hardcoded €/$ amounts. (b) `rg 'paywall_subscription_terms\|paywall_cancellation' de.json` — subscription terms and cancellation text exist. (c) `rg 'PRIVACY_POLICY_URL\|TERMS_OF_SERVICE_URL' paywall-constants.ts` — legal links defined. (d) `rg 'restorePurchases' settings/+page.svelte` — restore button accessible outside dev block.
5. Wiring integrity verification: (a) `rg 'onupgrade' UpgradePrompt.svelte` — callback prop present. (b) `rg 'PaywallDrawer' analytics/+page.svelte prs/+page.svelte` — drawer in both consumer pages. (c) `rg 'grantPurchase' PaywallDrawer.svelte` — purchase→persist chain. (d) `rg 'manageSubscriptions' settings/+page.svelte` — manage subscription wired. (e) `rg '\[Paywall\]' PaywallDrawer.svelte` — diagnostic logging.

## Must-Haves

- [ ] Full test suite passes (zero failures)
- [ ] Build succeeds (zero TypeScript errors)
- [ ] i18n key count parity between de.json and en.json
- [ ] No hardcoded prices in PaywallDrawer
- [ ] Apple subscription terms text present
- [ ] Privacy Policy + Terms of Service links defined
- [ ] Restore Purchases accessible outside dev block
- [ ] All consumer pages (analytics, PRs) wire PaywallDrawer via UpgradePrompt
- [ ] `[Paywall]` diagnostic logging present

## Verification

- `pnpm --filter mobile test -- --run` — all tests pass
- `pnpm --filter mobile build` — clean build
- All grep checks from Steps 4-5 produce expected matches
- i18n key count parity confirmed

## Observability Impact

- Signals added/changed: None — verification-only task
- How a future agent inspects this: Run the same verification commands from Steps 1-5
- Failure state exposed: None

## Inputs

- All T01-T03 outputs: PaywallDrawer.svelte, paywall-constants.ts, UpgradePrompt.svelte (evolved), analytics page (evolved), PR history page (evolved), settings page (evolved), de.json (evolved), en.json (evolved)

## Expected Output

- No files created or modified — verification-only
- Confirmation that all slice-level acceptance criteria are met
