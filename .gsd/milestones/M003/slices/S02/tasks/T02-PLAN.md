---
estimated_steps: 4
estimated_files: 5
---

# T02: Wire lifecycle revalidation and extend UpgradePrompt

**Slice:** S02 — Purchase State Management & Premium Gate Wiring
**Milestone:** M003

## Description

Connect the evolved premium service to the app lifecycle so purchase state is revalidated on every app launch and resume from background. Extend the `UpgradePrompt` component's feature prop to accept `'premium_templates'` for S04 template UI consumption. Add the corresponding i18n key for the new feature description.

## Steps

1. **Wire revalidation into root `+layout.svelte`**: Import `revalidatePurchases` from `$lib/services/premium.js` and `App` from `@capacitor/app`. Inside the existing `$effect` block, after `ready = true` is set in the `finally` clause, add a fire-and-forget call: `revalidatePurchases()`. This runs once on mount after onboarding check completes. Outside the `$effect`, add a top-level `App.addListener('resume', () => revalidatePurchases())` call stored in a variable for cleanup. Use Svelte 5's `onDestroy` (or `$effect` return cleanup) to call `handle.remove()` on destroy.

2. **Extend `UpgradePrompt.svelte` feature prop**: Update the `Props.feature` type union from `'full_charts' | 'extended_history'` to `'full_charts' | 'extended_history' | 'premium_templates'`. Update the `description` derived to handle the new case with `m.premium_upgrade_description_premium_templates()`.

3. **Add i18n keys**: Add `premium_upgrade_description_premium_templates` to `de.json` (German: "Schalte professionelle Trainingsvorlagen frei, die auf bewaehrten Methoden basieren.") and `en.json` (English: "Unlock professional training templates based on proven methodologies."). Verify key count parity.

4. **Run verification**: `pnpm --filter mobile build` succeeds. `pnpm --filter mobile test -- --run` all tests pass. Confirm i18n key parity.

## Must-Haves

- [ ] `revalidatePurchases()` called fire-and-forget after `ready = true` in root layout
- [ ] `App.addListener('resume', ...)` registered in root layout with cleanup
- [ ] `UpgradePrompt` feature prop accepts `'premium_templates'`
- [ ] `premium_upgrade_description_premium_templates` key in both `de.json` and `en.json`
- [ ] Build passes with no type errors
- [ ] No regressions in existing tests

## Verification

- `pnpm --filter mobile build` — succeeds
- `pnpm --filter mobile test -- --run` — all test suites pass
- `rg 'revalidatePurchases' apps/mobile/src/routes/+layout.svelte` — confirms wiring
- `rg 'premium_templates' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — confirms prop extension
- i18n key count: `jq 'keys | length' apps/mobile/messages/de.json` equals `jq 'keys | length' apps/mobile/messages/en.json`

## Observability Impact

- Signals added/changed: `[Premium] revalidated: N active products` log on every app launch and resume. On web, `getPurchases` returns `[]` (per D073), so revalidation logs `[Premium] revalidatePurchases: skipped (web, no native purchases)` or similar — not an error.
- How a future agent inspects this: Filter console by `[Premium] revalidat` to see lifecycle revalidation activity. Check `+layout.svelte` for the wiring code.
- Failure state exposed: If `revalidatePurchases()` throws (it shouldn't — it's catch-guarded), the fire-and-forget pattern means the app still loads normally. Console error is the only signal.

## Inputs

- `apps/mobile/src/lib/services/premium.ts` — T01's evolved service with `revalidatePurchases()` export
- `apps/mobile/src/routes/+layout.svelte` — current root layout with `$effect` for onboarding check
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — current component with `feature` prop
- `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json` — existing i18n files

## Expected Output

- `apps/mobile/src/routes/+layout.svelte` — modified with revalidation call on mount + resume listener with cleanup
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — modified with `'premium_templates'` in feature union + description handling
- `apps/mobile/messages/de.json` — +1 key (`premium_upgrade_description_premium_templates`)
- `apps/mobile/messages/en.json` — +1 key (`premium_upgrade_description_premium_templates`)
