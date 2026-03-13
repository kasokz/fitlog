---
id: T02
parent: S02
milestone: M003
provides:
  - Lifecycle revalidation wiring in root layout (mount + resume)
  - UpgradePrompt extended with 'premium_templates' feature support
  - i18n key premium_upgrade_description_premium_templates in de.json and en.json
key_files:
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/src/lib/components/premium/UpgradePrompt.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - App.addListener('resume') returns a Promise<PluginListenerHandle>; cleanup uses resumeHandle.then(h => h.remove()) in onDestroy since the listener registration is async
  - revalidatePurchases() called with .catch(() => {}) for fire-and-forget — errors logged internally by the service, no need to surface in layout
  - UpgradePrompt description derived refactored from ternary to $derived.by with switch for extensibility as feature count grows
patterns_established:
  - Capacitor App listener cleanup pattern — store the Promise from addListener, resolve in onDestroy to call remove()
observability_surfaces:
  - "[Premium] revalidatePurchases" console logs on every app mount and resume — filter by "[Premium] revalidat" to see lifecycle activity
  - Revalidation runs fire-and-forget; failures logged as warnings but never block app startup
duration: 12m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Wire lifecycle revalidation and extend UpgradePrompt

**Connected premium revalidation to app mount/resume lifecycle and extended UpgradePrompt to accept `'premium_templates'` feature with i18n support.**

## What Happened

Wired `revalidatePurchases()` into the root `+layout.svelte` at two lifecycle points: (1) fire-and-forget call after `ready = true` in the onboarding guard's `finally` clause, ensuring revalidation runs on every app launch after the layout is ready; (2) `App.addListener('resume', ...)` to revalidate when the app returns from background, with proper cleanup via `onDestroy`.

Extended `UpgradePrompt.svelte`'s `feature` prop type union to include `'premium_templates'` and refactored the description derived from a ternary to a `$derived.by` switch statement to cleanly handle the growing number of feature variants.

Added the `premium_upgrade_description_premium_templates` i18n key to both `de.json` and `en.json`, maintaining key count parity at 331 keys each.

## Verification

- `pnpm --filter mobile build` — succeeds, no type errors
- `pnpm --filter mobile test -- --run` — 17 test files, 409 tests pass, zero failures
- `rg 'revalidatePurchases' apps/mobile/src/routes/+layout.svelte` — 3 matches (import + mount call + resume listener)
- `rg 'premium_templates' apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — 3 matches (type union + switch case + message call)
- i18n key count: de.json=331, en.json=331 — parity confirmed

### Slice-level verification (partial — T02 is intermediate):
- ✅ `pnpm --filter mobile test -- --run src/lib/db/__tests__/premium.test.ts` — all premium tests pass
- ✅ `pnpm --filter mobile test -- --run` — all test suites pass (no regressions)
- ✅ `pnpm --filter mobile build` — TypeScript compiles, no type errors
- ⬜ Consumer call site grep — deferred to T03

## Diagnostics

- Filter console by `[Premium] revalidat` to see lifecycle revalidation on mount and resume
- On web, `getPurchases()` returns `[]` per D073 — revalidation logs "no transactions from store, keeping persisted state" (not an error)
- If `revalidatePurchases()` throws, the `.catch(() => {})` pattern ensures app startup is never blocked; the service's internal catch logs a warning

## Deviations

- Refactored UpgradePrompt description from ternary to `$derived.by` with switch — cleaner pattern as feature count grows beyond 2. Functionally equivalent.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/+layout.svelte` — added revalidatePurchases import, fire-and-forget call on mount, App resume listener with onDestroy cleanup
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — extended feature prop union with 'premium_templates', refactored description to switch
- `apps/mobile/messages/de.json` — added premium_upgrade_description_premium_templates key
- `apps/mobile/messages/en.json` — added premium_upgrade_description_premium_templates key
