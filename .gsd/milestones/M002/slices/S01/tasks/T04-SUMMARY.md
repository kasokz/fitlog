---
id: T04
parent: S01
milestone: M002
provides:
  - getExerciseVolume — per-exercise tonnage trend over time as VolumeDataPoint[]
  - getMuscleGroupVolume — aggregated volume across all exercises in a primary muscle group
  - getSessionTonnage — total tonnage for a single session
  - getProgressionSuggestion — RIR-driven weight increase suggestion with configurable thresholds
  - DEFAULT_THRESHOLDS — minSessions:2, minAvgRir:2, minWorkingSetsPerSession:3
  - WEIGHT_INCREMENTS — equipment-to-kg mapping (barbell:2.5, dumbbell:2, etc.)
key_files:
  - apps/mobile/src/lib/services/analytics/volumeAggregator.ts
  - apps/mobile/src/lib/services/analytics/progressionAdvisor.ts
  - apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts
  - apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts
key_decisions:
  - getSessionTonnage uses a direct dbQuery instead of AnalyticsRepository because no existing repository method queries all exercises in a session; the working-set filter is replicated inline
  - Progression advisor calculates avg RIR across ALL qualifying sets from ALL qualifying sessions (not per-session average) — simplest correct interpretation of the heuristic
  - Mode weight from most recent session used as current_weight base for progression suggestion
  - Null RIR sets are excluded from average count entirely (not counted as 0) — returns null if zero RIR data available
patterns_established:
  - Volume aggregation groups by YYYY-MM-DD date key extracted from session timestamps via toDateKey()
  - Progression advisor merges user-provided partial thresholds over DEFAULT_THRESHOLDS via spread
  - seedSessionsWithSets test helper batches N sessions × M sets with controlled timestamps for progression tests
observability_surfaces:
  - none (pure computation — test suites serve as inspection surface)
duration: 20min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Implement volume aggregation and progression advisor services

**Built volumeAggregator (3 functions for tonnage trends) and progressionAdvisor (RIR-driven progression engine with configurable thresholds), verified by 29 tests covering all boundary conditions.**

## What Happened

Created two analytics service modules:

1. **volumeAggregator.ts** — Three functions: `getExerciseVolume` groups completed working sets by date and sums weight×reps; `getMuscleGroupVolume` aggregates across all exercises matching a primary muscle group; `getSessionTonnage` sums all working sets in a session. All handle null weight/reps gracefully (contribute 0 to volume).

2. **progressionAdvisor.ts** — Implements the RIR-driven progression heuristic: checks that N recent sessions each have sufficient working sets, calculates average RIR across all qualifying sets (null RIR excluded), and if the average meets the threshold, suggests weight + increment rounded to the equipment's standard step. Bodyweight exercises return null immediately (D045). Exports `DEFAULT_THRESHOLDS` and `WEIGHT_INCREMENTS` constants.

Test suites replaced the skeleton todo files with 29 real tests (13 volume + 16 progression) using seeded multi-session SQLite data via sql.js mock.

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — 13 tests pass
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — 16 tests pass
- `cd apps/mobile && pnpm test -- --run` — all 300 tests pass, 0 failures, no regressions

### Slice-level verification status (T04 checkpoint):
- AnalyticsRepository tests: PASS (26 tests)
- oneRepMax tests: PASS (19 tests)
- prDetector tests: PASS (15 tests)
- volumeAggregator tests: PASS (13 tests)
- progressionAdvisor tests: PASS (16 tests)
- deloadCalculator tests: 5 todo (T05 scope)
- Full suite: PASS (300 passed, 5 todo)

## Diagnostics

Run the test suites — each test name describes the exact edge case. Progression advisor tests specifically name each threshold condition (insufficient sessions, low RIR, insufficient sets, bodyweight skip, null RIR handling, custom thresholds, mixed RIR).

## Deviations

- `getSessionTonnage` uses a direct `dbQuery` call instead of going through `AnalyticsRepository`, because no existing repository method supports querying all exercises within a session. The working-set filter (`set_type='working' AND completed=1 AND deleted_at IS NULL AND s.status='completed'`) is replicated inline. This is a pragmatic choice to avoid adding a session-scoped query to the repository just for this one use case.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` — Volume aggregation service (exercise, muscle group, session tonnage)
- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` — RIR-driven progression advisor with configurable thresholds and equipment rounding
- `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — 13 tests covering tonnage math, null handling, date filtering, muscle group aggregation
- `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — 16 tests covering all threshold boundaries, bodyweight skip, equipment rounding, null RIR, custom thresholds
