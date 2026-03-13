---
id: T03
parent: S01
milestone: M002
provides:
  - estimateOneRepMax — Epley formula with null/zero/negative/reps>10 guard rails
  - bestEstimatedOneRM — finds highest e1RM from a set collection
  - detectPRs — 3-category PR detection (weight_pr, rep_pr, e1rm_pr) with defense-in-depth working-set filter
  - getPRHistory — chronological running PR computation from AnalyticsRepository data
key_files:
  - apps/mobile/src/lib/services/analytics/oneRepMax.ts
  - apps/mobile/src/lib/services/analytics/prDetector.ts
  - apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts
  - apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts
key_decisions:
  - rep_pr at a given weight is detected when reps exceed the historical max at the exact same weight; a new weight with any reps is implicitly a rep PR at that weight level (first occurrence)
  - getPRHistory processes sets in chronological order by reversing the DESC-ordered repository results, maintaining running bests for all three categories
patterns_established:
  - Pure computation services live in src/lib/services/analytics/ with zero side effects in the core functions
  - detectPRs takes pre-fetched data (no DB calls) for testability; getPRHistory wraps AnalyticsRepository for convenience
  - PR detector tests use top-level dynamic imports (after setupMockDatabase) for DB-dependent tests, matching the repository test pattern
observability_surfaces:
  - none (pure computation — test suites serve as inspection surface)
duration: ~15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Implement 1RM estimation and PR detection services

**Built Epley-formula 1RM estimator (with D043 10-rep cap) and 3-category PR detector, verified by 34 tests covering all edge cases including defense-in-depth filtering.**

## What Happened

Created two pure computation services:

1. **oneRepMax.ts** — `estimateOneRepMax()` implements Epley formula `weight * (1 + reps/30)` with guard rails: returns null for reps>10 (D043), returns weight directly for reps=1, returns null for null/zero/negative inputs, rounds to 1 decimal. `bestEstimatedOneRM()` finds the highest e1RM from a set collection.

2. **prDetector.ts** — `detectPRs()` compares new working sets against historical sets across 3 categories: weight_pr (new max weight), rep_pr (new max reps at same weight), e1rm_pr (new max estimated 1RM). Both input arrays are filtered to working+completed sets as defense in depth. `getPRHistory()` uses AnalyticsRepository to compute the full chronological PR history by processing all sets in date order, tracking running bests.

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/oneRepMax.test.ts` — 19 tests, all green
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/prDetector.test.ts` — 15 tests (11 pure detectPRs + 4 DB-backed getPRHistory), all green
- `cd apps/mobile && pnpm test -- --run` — 271 tests pass, 0 failures, no regressions

### Slice verification status (T03 scope):
- [x] `oneRepMax.test.ts` — Epley formula correct for reps 1-10, null for >10, null for null inputs
- [x] `prDetector.test.ts` — detects weight/rep/e1RM PRs, no false positives on warmup sets
- [x] `analytics-repository.test.ts` — still passing (26 tests)
- [ ] `volumeAggregator.test.ts` — skeleton (T04 scope)
- [ ] `progressionAdvisor.test.ts` — skeleton (T05 scope)
- [ ] `deloadCalculator.test.ts` — skeleton (T06 scope)

## Diagnostics

Run the test suites — each test name describes the exact edge case. Test failure messages pinpoint which formula or PR category is wrong.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` — Epley formula with all guard rails, bestEstimatedOneRM selector
- `apps/mobile/src/lib/services/analytics/prDetector.ts` — 3-category PR detection (detectPRs) and chronological PR history (getPRHistory)
- `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts` — 19 tests covering formula correctness, boundary conditions, null handling
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` — 15 tests covering all 3 PR types, defense-in-depth filtering, DB-backed history
