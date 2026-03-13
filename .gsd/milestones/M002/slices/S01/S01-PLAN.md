# S01: Analytics Computation Engine & Schema

**Goal:** Build the pure analytics computation layer — 1RM estimation, PR detection, volume aggregation, RIR progression advisor, and deload calculator — plus the AnalyticsRepository and schema v5 index. All modules are independently unit-tested against realistic multi-session SQLite data via sql.js.
**Demo:** `pnpm test` passes with all analytics test suites covering: correct 1RM estimation (Epley, capped at 10 reps), PR detection across 3 categories, volume/tonnage aggregation per exercise and muscle group, RIR progression suggestions with configurable thresholds, and deload weight reduction — all computed from seeded realistic workout data.

## Must-Haves

- `src/lib/types/analytics.ts` — shared types forming the contract for S02–S05 (`PR`, `VolumeDataPoint`, `ProgressionSuggestion`, `DeloadSet`, `StrengthDataPoint`, `AnalyticsDateRange`)
- Schema v5 — composite index `idx_workout_sets_exercise_completed` on `(exercise_id, set_type, completed) WHERE deleted_at IS NULL`, version bumped from 4 to 5
- `src/lib/db/repositories/analytics.ts` — `AnalyticsRepository` with read-only queries that always filter `set_type='working' AND completed=1 AND deleted_at IS NULL`
- `src/lib/services/analytics/oneRepMax.ts` — `estimateOneRepMax(weight, reps)` returns null for reps > 10, returns weight directly for reps === 1; `bestEstimatedOneRM(sets)` finds the best e1RM across a set collection
- `src/lib/services/analytics/prDetector.ts` — `detectPRs(exerciseId, newSets, historicalSets)` returning `weight_pr`, `rep_pr`, `e1rm_pr`; `getPRHistory(exerciseId)` returning all PRs
- `src/lib/services/analytics/volumeAggregator.ts` — `getExerciseVolume(exerciseId, dateRange)`, `getMuscleGroupVolume(muscleGroup, dateRange)`, `getSessionTonnage(sessionId)`
- `src/lib/services/analytics/progressionAdvisor.ts` — `getProgressionSuggestion(exerciseId)` with configurable thresholds (min sessions ≥ 2, avg RIR ≥ 2, min working sets ≥ 3), equipment-based weight rounding, bodyweight exercises skipped
- `src/lib/services/analytics/deloadCalculator.ts` — `calculateDeloadSets(previousSets, deloadFactor?)` reducing weight to ~60% and optionally reducing volume; `isDeloadWeek(mesocycle)` returning boolean
- All 5 analytics services + repository tested against realistic multi-session sql.js data

## Proof Level

- This slice proves: contract
- Real runtime required: no (sql.js provides full SQLite compatibility in tests)
- Human/UAT required: no

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/db/__tests__/analytics-repository.test.ts` — all AnalyticsRepository queries return correct typed data from seeded sessions
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/oneRepMax.test.ts` — Epley formula correct for reps 1–10, null for >10, null for null inputs
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/prDetector.test.ts` — detects weight/rep/e1RM PRs, no false positives on warmup sets
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — tonnage math correct, per-exercise and per-muscle-group aggregation
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — suggests progression when RIR criteria met, returns null when insufficient data, rounds weight per equipment type, skips bodyweight exercises
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — reduces weight to ~60%, handles deload_week_number=0 (disabled), preserves set structure
- `cd apps/mobile && pnpm test -- --run` — all existing + new tests pass (no regressions)

## Observability / Diagnostics

- Runtime signals: None (pure computation layer — no runtime logging needed)
- Inspection surfaces: Unit test suites serve as the inspection surface; test failure messages pinpoint which computation is wrong
- Failure visibility: Each test covers boundary conditions (null inputs, insufficient data, edge thresholds) — test names describe the exact scenario
- Redaction constraints: None (no secrets or PII in analytics data)

## Integration Closure

- Upstream surfaces consumed: `WorkoutRepository` (for seeding test data), `ProgramRepository` (mesocycle access), `ExerciseRepository` (exercise metadata), `dbQuery`/`dbExecute` from `database.ts`, `WorkoutSet`/`SetType`/`Exercise`/`Mesocycle` types, `test-helpers.ts` sql.js mock
- New wiring introduced in this slice: `AnalyticsRepository` (new SQL query layer), 5 analytics service modules (new pure function layer), schema v5 migration (new index), `src/lib/types/analytics.ts` (new shared types)
- What remains before the milestone is truly usable end-to-end: S02 (dashboard UI with charts), S03 (PR celebration + history UI), S04 (progression suggestion banners in workout), S05 (deload pre-fill integration), S06 (freemium gate), S07 (i18n)

## Tasks

- [x] **T01: Define analytics types and schema v5 index** `est:30m`
  - Why: Types form the contract between S01 and all downstream slices (S02–S05). Schema v5 index is needed before AnalyticsRepository queries can be performant. Both are zero-dependency foundations.
  - Files: `src/lib/types/analytics.ts`, `src/lib/db/schema.sql`, `src/lib/db/database.ts`
  - Do: Create `analytics.ts` with `PR`, `VolumeDataPoint`, `ProgressionSuggestion`, `DeloadSet`, `StrengthDataPoint`, `AnalyticsDateRange` types. Add composite index to `schema.sql`. Bump `CURRENT_SCHEMA_VERSION` from 4 to 5. Create skeleton test files for all modules (initially failing/empty stubs).
  - Verify: `pnpm run build` succeeds, types importable with no TS errors, schema.sql parseable
  - Done when: All analytics types exist, schema v5 index added, version bumped, skeleton test files created

- [x] **T02: Build AnalyticsRepository with read-only queries** `est:45m`
  - Why: All analytics services depend on the repository for SQL access. Building and testing it first ensures the data layer is solid before computation logic.
  - Files: `src/lib/db/repositories/analytics.ts`, `src/lib/db/__tests__/analytics-repository.test.ts`
  - Do: Implement `AnalyticsRepository` with: `getExerciseSetsHistory(exerciseId, dateRange)`, `getCompletedWorkingSets(exerciseId, sessionIds)`, `getRecentSessionsForExercise(exerciseId, count)`, `getBodyWeightRange(dateRange)`. All queries MUST filter `set_type='working' AND completed=1 AND deleted_at IS NULL`. Write comprehensive tests seeding realistic multi-session data via sql.js mock.
  - Verify: `pnpm test -- --run src/lib/db/__tests__/analytics-repository.test.ts` passes
  - Done when: All 4 repository methods return correctly typed data from seeded SQLite, working-set filter is proven via test that seeds non-working sets and verifies they're excluded

- [x] **T03: Implement 1RM estimation and PR detection services** `est:45m`
  - Why: 1RM estimation is the foundation for strength curves (R013) and e1RM PRs (R014). PR detection delivers the core of R014. These are pure functions with no DB dependency — they operate on typed arrays.
  - Files: `src/lib/services/analytics/oneRepMax.ts`, `src/lib/services/analytics/prDetector.ts`, `src/lib/services/analytics/__tests__/oneRepMax.test.ts`, `src/lib/services/analytics/__tests__/prDetector.test.ts`
  - Do: Implement Epley formula `w*(1+r/30)` with reps=1 special case (return weight), reps>10 returns null, null weight/reps returns null. Implement `detectPRs` comparing new completed working sets against historical sets for 3 PR categories. Implement `getPRHistory` using AnalyticsRepository. Write tests covering edge cases: 1 rep, 10 reps, 11 reps, null inputs, no historical data, ties.
  - Verify: `pnpm test -- --run src/lib/services/analytics/__tests__/oneRepMax.test.ts src/lib/services/analytics/__tests__/prDetector.test.ts` passes
  - Done when: 1RM formula proven correct for reps 1–10 with null for >10, PR detection proven for all 3 categories with no false positives from warmup/incomplete sets

- [x] **T04: Implement volume aggregation and progression advisor services** `est:1h`
  - Why: Volume aggregation delivers R015 (tonnage trends). Progression advisor delivers R016 (RIR-driven suggestions) — the highest-risk computation in the slice. Grouping them enables testing the advisor's dependency on volume/set data in context.
  - Files: `src/lib/services/analytics/volumeAggregator.ts`, `src/lib/services/analytics/progressionAdvisor.ts`, `src/lib/services/analytics/__tests__/volumeAggregator.test.ts`, `src/lib/services/analytics/__tests__/progressionAdvisor.test.ts`
  - Do: Implement `getExerciseVolume` (tonnage per date), `getMuscleGroupVolume` (aggregate by primary muscle group), `getSessionTonnage` (sum of weight×reps for a session). Implement `getProgressionSuggestion` with configurable thresholds object (`MIN_SESSIONS: 2`, `MIN_AVG_RIR: 2`, `MIN_WORKING_SETS_PER_SESSION: 3`), equipment-based rounding (`barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 2.5, bodyweight: skip, kettlebell: 2.5, band: 2.5, other: 2.5`), and logic to skip bodyweight exercises. Write tests with multi-session seeded data covering: sufficient data triggers suggestion, insufficient sessions returns null, low RIR returns null, bodyweight exercise skipped, correct rounding per equipment.
  - Verify: `pnpm test -- --run src/lib/services/analytics/__tests__/volumeAggregator.test.ts src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` passes
  - Done when: Volume math proven correct, progression advisor triggers/skips correctly at threshold boundaries, weight increment rounds per equipment type

- [x] **T05: Implement deload calculator and run full integration verification** `est:30m`
  - Why: Deload calculator delivers R017 (auto-adjustment). Final task runs the full suite to prove all modules work together with no regressions and the slice contract is complete.
  - Files: `src/lib/services/analytics/deloadCalculator.ts`, `src/lib/services/analytics/__tests__/deloadCalculator.test.ts`
  - Do: Implement `calculateDeloadSets(previousSets, deloadFactor=0.6)` that reduces weight and optionally reduces volume (drop last set if >3 sets). Implement `isDeloadWeek(mesocycle)` returning true when `deload_week_number > 0 AND current_week === deload_week_number`. Handle edge cases: `deload_week_number=0` (disabled), null weights (pass through), empty sets array. Write tests covering: 60% weight reduction, custom factor, disabled deload, null weights preserved, volume reduction. Run full test suite to verify no regressions.
  - Verify: `pnpm test -- --run src/lib/services/analytics/__tests__/deloadCalculator.test.ts` passes, then `cd apps/mobile && pnpm test -- --run` (full suite) passes
  - Done when: Deload calculator proven correct, `isDeloadWeek` handles all mesocycle states, full test suite green

## Files Likely Touched

- `apps/mobile/src/lib/types/analytics.ts` (new)
- `apps/mobile/src/lib/db/schema.sql` (modified — add index)
- `apps/mobile/src/lib/db/database.ts` (modified — bump version)
- `apps/mobile/src/lib/db/repositories/analytics.ts` (new)
- `apps/mobile/src/lib/db/__tests__/analytics-repository.test.ts` (new)
- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` (new)
- `apps/mobile/src/lib/services/analytics/prDetector.ts` (new)
- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` (new)
- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` (new)
- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts` (new)
