---
id: T05
parent: S01
milestone: M002
provides:
  - isDeloadWeek — mesocycle deload week detection with D046 disabled-deload support
  - calculateDeloadSets — weight reduction (default 60%), volume reduction (cap at 3 sets), plate rounding (2.5kg)
  - Full integration gate — 13 test files, 317 tests, zero failures across all analytics + M001 modules
key_files:
  - apps/mobile/src/lib/services/analytics/deloadCalculator.ts
  - apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts
key_decisions:
  - Volume reduction drops sets beyond 3 by slicing (keeps first 3, not last 3) — preserves primary working set ordering
  - Set numbers are re-indexed sequentially (1, 2, 3) rather than preserving original set_number values
patterns_established:
  - Pure computation analytics modules (no DB) use direct imports and plain Vitest — no mock DB setup needed
observability_surfaces:
  - none — pure computation, test suites are the inspection surface
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T05: Implement deload calculator and run full integration verification

**Built deload calculator (R017) with 60% weight reduction, 2.5kg plate rounding, and volume capping, then passed full 317-test integration gate with zero failures.**

## What Happened

Implemented `deloadCalculator.ts` with two exported functions:
- `isDeloadWeek(mesocycle)` — returns true only when `deload_week_number > 0 AND current_week === deload_week_number`; returns false for disabled deload (D046: `deload_week_number === 0`)
- `calculateDeloadSets(previousSets, deloadFactor=0.6)` — filters non-working sets, applies weight reduction with 2.5kg plate rounding, caps volume at 3 sets (drops excess), passes null weights through unchanged

Wrote 17 tests covering: deload week detection (enabled, disabled, edge cases), weight reduction at default and custom factors, null weight passthrough, empty input, non-working set filtering, plate rounding (49.5→50, 60→60), volume reduction (5→3, 4→3, 3→3), set re-numbering, and property preservation (reps, exercise_id).

Ran full integration suite: all 13 test files pass with 317 tests total — confirming zero regressions across the entire analytics computation engine and all M001 modules.

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — **17 tests passed** (8ms)
- `cd apps/mobile && pnpm test -- --run` — **13 files, 317 tests passed, 0 failures** (2.27s)

Slice-level verification (all 7 checks pass):
- ✅ `analytics-repository.test.ts` — 26 tests passed
- ✅ `oneRepMax.test.ts` — 19 tests passed
- ✅ `prDetector.test.ts` — 15 tests passed
- ✅ `volumeAggregator.test.ts` — 13 tests passed
- ✅ `progressionAdvisor.test.ts` — 16 tests passed
- ✅ `deloadCalculator.test.ts` — 17 tests passed
- ✅ Full suite — 317 tests, 0 failures

## Diagnostics

Run deload calculator tests for targeted inspection. Full suite run proves no regressions across all modules. Test names describe exact edge cases — failure messages pinpoint the broken computation.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — deload calculator with isDeloadWeek and calculateDeloadSets
- `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — 17 tests covering all edge cases
