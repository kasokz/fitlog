---
estimated_steps: 4
estimated_files: 2
---

# T01: Create premium service with unit tests

**Slice:** S06 — Freemium Analytics Gate
**Milestone:** M002

## Description

Create the `premium.ts` service following the exact pattern of `onboarding.ts`: async read/write of premium status via `@capacitor/preferences`. Define the `PremiumFeature` enum and `canAccessFeature()` function that gates on `isPremiumUser()`. Write comprehensive unit tests using the same mock pattern as `onboarding.test.ts` (in-memory `Map<string, string>` mock of `@capacitor/preferences`).

## Steps

1. Create `src/lib/services/premium.ts` with:
   - `PREMIUM_KEY = 'premium_status'` constant
   - `PremiumFeature` enum: `full_charts`, `extended_history`, `progression_suggestions`, `volume_trends`
   - `isPremiumUser(): Promise<boolean>` — reads from Preferences, returns `value !== null`, logs `[Premium]` status
   - `setPremiumStatus(active: boolean): Promise<void>` — sets or removes the key based on `active`
   - `canAccessFeature(feature: PremiumFeature): Promise<boolean>` — delegates to `isPremiumUser()`, logs feature + result
2. Create `src/lib/db/__tests__/premium.test.ts` with Map-based `@capacitor/preferences` mock (copy from onboarding test pattern), using `await import()` after mock setup
3. Write tests: default-to-free, setPremiumStatus(true) → isPremiumUser returns true, setPremiumStatus(false) → returns false, round-trip, canAccessFeature returns false for each PremiumFeature when free, canAccessFeature returns true for each when premium, multiple set calls idempotent
4. Run `pnpm test -- --grep "premium"` and fix any failures

## Must-Haves

- [ ] `isPremiumUser()` returns false by default (no Preferences entry = free user)
- [ ] `setPremiumStatus(true)` makes `isPremiumUser()` return true
- [ ] `setPremiumStatus(false)` removes the key, making `isPremiumUser()` return false
- [ ] `canAccessFeature()` returns false for all PremiumFeature values when user is free
- [ ] `canAccessFeature()` returns true for all PremiumFeature values when user is premium
- [ ] `PremiumFeature` enum exports `full_charts`, `extended_history`, `progression_suggestions`, `volume_trends`
- [ ] All tests pass via `pnpm test -- --grep "premium"`

## Verification

- `pnpm test -- --grep "premium"` — all tests pass
- Service exports match the API surface defined in M002 roadmap boundary map

## Observability Impact

- Signals added/changed: `[Premium]` console.log on `isPremiumUser()` read and `setPremiumStatus()` write, matching `[Onboarding]` pattern. `canAccessFeature()` logs feature name + access result.
- How a future agent inspects this: check `@capacitor/preferences` key `premium_status` directly, or call `isPremiumUser()` from console
- Failure state exposed: Preferences read failure falls back to `false` (free) — safe degradation. Error logged to console.

## Inputs

- `src/lib/services/onboarding.ts` — pattern to follow for Preferences usage
- `src/lib/db/__tests__/onboarding.test.ts` — pattern to follow for mock and test structure
- M002 Roadmap boundary map — defines the API surface (`isPremiumFeature`, `getPremiumStatus`, `PremiumFeature` enum)

## Expected Output

- `src/lib/services/premium.ts` — premium service with all exported functions
- `src/lib/db/__tests__/premium.test.ts` — passing test suite
