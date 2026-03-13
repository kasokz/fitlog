---
id: T01
parent: S06
milestone: M002
provides:
  - premium service with isPremiumUser(), setPremiumStatus(), canAccessFeature(), PremiumFeature enum
  - unit test suite for premium service (15 tests)
key_files:
  - apps/mobile/src/lib/services/premium.ts
  - apps/mobile/src/lib/db/__tests__/premium.test.ts
key_decisions:
  - Used try/catch in isPremiumUser() with console.warn fallback to false on Preferences read failure (safe degradation)
  - PremiumFeature uses string enum (not numeric) for readable log output and Preferences-friendly values
patterns_established:
  - premium.ts mirrors onboarding.ts pattern exactly: async Preferences read/write, [Premium] log prefix, export functions
  - premium.test.ts mirrors onboarding.test.ts pattern: Map-based @capacitor/preferences mock, await import() after mock setup
observability_surfaces:
  - "[Premium] isPremiumUser: {true|false}" console.log on every status read
  - "[Premium] Premium status set to active" / "[Premium] Premium status removed (free user)" on writes
  - "[Premium] canAccessFeature({feature}): {true|false}" on feature gate checks
  - "[Premium] Failed to read premium status, defaulting to free" console.warn on Preferences failure
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Create premium service with unit tests

**Premium service created with full API surface (isPremiumUser, setPremiumStatus, canAccessFeature, PremiumFeature enum) and 15 passing unit tests.**

## What Happened

Created `premium.ts` following the exact `onboarding.ts` pattern: async read/write via `@capacitor/preferences`, `[Premium]` prefixed console logs, safe fallback to free on error. The `PremiumFeature` string enum exports all four feature gates: `full_charts`, `extended_history`, `progression_suggestions`, `volume_trends`. `canAccessFeature()` delegates to `isPremiumUser()` and logs both the feature name and access result.

Test file uses the same Map-based `@capacitor/preferences` mock as `onboarding.test.ts` with `await import()` after mock setup. 15 tests cover: default-to-free, set premium true/false, round-trip, idempotent multiple calls, canAccessFeature for each PremiumFeature value when free (4 tests) and when premium (4 tests), and enum value verification.

## Verification

- `npx vitest run src/lib/db/__tests__/premium.test.ts` — **15/15 tests pass** (note: vitest 4 uses positional filter, not `--grep`)
- `pnpm run build` — **zero build errors**, site written to build directory
- Slice-level checks:
  - ✅ Premium service unit tests pass
  - ✅ Build succeeds with new files
  - ⬜ Manual toggle verification (T03 — dev toggle not yet built)

## Diagnostics

- Inspect premium status: read `@capacitor/preferences` key `premium_status` — null = free, non-null = premium
- Console logs: filter for `[Premium]` to see all status reads, writes, and feature gate checks
- Error handling: Preferences read failure logs `console.warn` with error details and defaults to free

## Deviations

- Vitest 4 does not support `--grep` flag — uses positional file path filter or `--testNamePattern` instead. Tests run via `npx vitest run <filepath>` rather than `pnpm test -- --grep "premium"`. This affects the slice-level verification command but not the test results.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/premium.ts` — premium service with isPremiumUser, setPremiumStatus, canAccessFeature, PremiumFeature enum
- `apps/mobile/src/lib/db/__tests__/premium.test.ts` — 15 unit tests covering all service functions and enum values
