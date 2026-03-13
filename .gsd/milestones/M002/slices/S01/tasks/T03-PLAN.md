---
estimated_steps: 5
estimated_files: 5
---

# T03: Implement 1RM estimation and PR detection services

**Slice:** S01 — Analytics Computation Engine & Schema
**Milestone:** M002

## Description

Build two pure computation services: `oneRepMax.ts` (Epley formula with guard rails) and `prDetector.ts` (3-category PR detection). These deliver R013 (strength curves / 1RM estimation) and R014 (PR tracking). `oneRepMax` is a pure math module with zero dependencies. `prDetector` uses `oneRepMax` for e1RM comparison and `AnalyticsRepository` for historical data access.

## Steps

1. Create `apps/mobile/src/lib/services/analytics/oneRepMax.ts`:
   - `estimateOneRepMax(weight: number | null, reps: number | null): number | null` — Epley formula `weight * (1 + reps / 30)`. Special cases: `reps === 1` returns `weight` directly (1RM IS the 1RM). `reps > 10` returns `null` (D043). `weight === null || reps === null || reps <= 0 || weight <= 0` returns `null`. Round to 1 decimal place.
   - `bestEstimatedOneRM(sets: Array<{ weight: number | null; reps: number | null; date: string }>): { e1rm: number; weight: number; reps: number; date: string } | null` — iterates sets, calls `estimateOneRepMax` on each, returns the one with highest e1RM. Returns null if no valid estimates.
2. Create `apps/mobile/src/lib/services/analytics/prDetector.ts`:
   - Define `PRType` as `'weight_pr' | 'rep_pr' | 'e1rm_pr'`.
   - `detectPRs(exerciseId: UUID, newSets: WorkoutSet[], historicalSets: WorkoutSet[]): PR[]` — compare new completed working sets against historical completed working sets. For each PR type:
     - `weight_pr`: new set has higher `weight` than any historical set (regardless of reps)
     - `rep_pr`: new set has higher `reps` at the same or higher weight than any historical set at that weight
     - `e1rm_pr`: new set produces higher `estimateOneRepMax` than any historical set (only sets with reps ≤ 10)
   - Filter both `newSets` and `historicalSets` to only `set_type === 'working' && completed === true` (defense in depth, even though repository should already filter).
   - Return array of `PR` objects with unique `id` (crypto.randomUUID()), exercise_id, type, value, weight, reps, date.
   - `getPRHistory(exerciseId: UUID): Promise<PR[]>` — use `AnalyticsRepository.getExerciseSetsHistory(exerciseId)` to get all historical sets, then compute running PRs by processing sets chronologically. For each set, check if it's a PR relative to all earlier sets.
3. Write tests in `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts`:
   - Epley formula: 100kg × 5 reps = 100 * (1 + 5/30) = 116.7
   - Reps = 1: returns weight directly (100kg → 100)
   - Reps = 10: 100 * (1 + 10/30) = 133.3 (boundary, should work)
   - Reps = 11: returns null (D043 cap)
   - Null weight: returns null
   - Null reps: returns null
   - Zero/negative weight or reps: returns null
   - `bestEstimatedOneRM`: finds highest from mixed set, handles empty array, handles all-invalid sets
4. Write tests in `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts`:
   - These tests need sql.js for `getPRHistory` (follows repository test pattern). Pure `detectPRs` tests can use in-memory data.
   - Weight PR: new set 102.5kg vs historical max 100kg → weight_pr detected
   - Rep PR: new set 100kg×8 vs historical 100kg×6 → rep_pr detected
   - e1RM PR: new set produces higher e1RM → e1rm_pr detected
   - No PR: new set is not better in any category → empty array
   - Multiple PRs: single set can trigger weight_pr AND e1rm_pr simultaneously
   - Warmup sets in input: ignored (defense-in-depth filter)
   - `getPRHistory`: returns chronological PR list across all sessions
5. Run both test suites and verify all pass.

## Must-Haves

- [ ] `estimateOneRepMax` returns null for reps > 10 (D043)
- [ ] `estimateOneRepMax` returns weight directly for reps === 1
- [ ] `estimateOneRepMax` handles null/zero/negative inputs gracefully
- [ ] `detectPRs` identifies all 3 PR types correctly
- [ ] `detectPRs` applies defense-in-depth working-set filter on inputs
- [ ] `getPRHistory` computes running PRs chronologically from historical data
- [ ] No false PRs from warmup, drop, or incomplete sets

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/oneRepMax.test.ts` all green
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/prDetector.test.ts` all green

## Observability Impact

- Signals added/changed: None (pure computation, no runtime signals)
- How a future agent inspects this: Run the test suites; each test name describes the exact edge case
- Failure state exposed: Test assertions pinpoint which formula or PR category is wrong

## Inputs

- `apps/mobile/src/lib/types/analytics.ts` — `PR`, `StrengthDataPoint` types from T01
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSet`, `SetType` types
- `apps/mobile/src/lib/db/repositories/analytics.ts` — `AnalyticsRepository.getExerciseSetsHistory()` from T02
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock for `getPRHistory` tests

## Expected Output

- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` — Epley formula with all guard rails
- `apps/mobile/src/lib/services/analytics/prDetector.ts` — 3-category PR detection + history
- `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts` — comprehensive formula tests
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` — comprehensive PR detection tests
