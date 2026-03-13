---
estimated_steps: 4
estimated_files: 3
---

# T05: Implement deload calculator and run full integration verification

**Slice:** S01 — Analytics Computation Engine & Schema
**Milestone:** M002

## Description

Build `deloadCalculator.ts` (R017 — deload auto-adjustment calculation) and run the full test suite to prove all analytics modules work together with no regressions. The deload calculator is the simplest module in S01 — pure arithmetic on previous sets with a configurable reduction factor. This task also serves as the final integration gate: every test file from T01–T05 must pass in a single `pnpm test` run.

## Steps

1. Create `apps/mobile/src/lib/services/analytics/deloadCalculator.ts`:
   - `isDeloadWeek(mesocycle: Mesocycle): boolean` — returns `true` when `mesocycle.deload_week_number > 0 AND mesocycle.current_week === mesocycle.deload_week_number`. Returns `false` when `deload_week_number === 0` (deload disabled, D046). Returns `false` when `current_week !== deload_week_number`.
   - `calculateDeloadSets(previousSets: WorkoutSet[], deloadFactor: number = 0.6): DeloadSet[]` — transforms previous session's working sets into deloaded sets:
     - `weight` = `original_weight * deloadFactor`, rounded to nearest 2.5kg (standard plate increment)
     - `reps` preserved from original (user can override at logging time)
     - `original_weight` stored for reference (shows user what they're deloading from)
     - If `previousSets` has > 3 working sets, drop the last set (volume reduction)
     - Null weights pass through as null (can't reduce null)
     - Non-working sets in input are filtered out (defense-in-depth)
     - Empty input returns empty array
2. Write tests in `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts`:
   - `isDeloadWeek` tests:
     - Week 4 of mesocycle with `deload_week_number=4` → true
     - Week 3 of mesocycle with `deload_week_number=4` → false
     - `deload_week_number=0` (disabled) → false regardless of current_week
     - Week 1 of mesocycle with `deload_week_number=1` → true (edge: deload first week)
   - `calculateDeloadSets` tests:
     - 3 working sets at 100kg → 3 sets at 60kg (0.6 factor), original_weight=100
     - 5 working sets at 80kg → 4 sets at 48kg (dropped last set for volume reduction, 48 rounded to 47.5)
     - Custom factor 0.5 → weight halved
     - Null weight → null passed through, original_weight=null
     - Empty array → empty array
     - Mixed set types in input → only working sets processed
     - Weight rounding: 100kg × 0.6 = 60kg (exact, no rounding needed). 82.5kg × 0.6 = 49.5 → rounds to 50kg (nearest 2.5)
3. Run the deload calculator tests to verify they all pass.
4. Run the full test suite (`cd apps/mobile && pnpm test -- --run`) to verify:
   - All 6 new analytics test files pass
   - All existing M001 test files pass (no regressions from schema v5 or new imports)
   - Zero test failures total

## Must-Haves

- [ ] `isDeloadWeek` returns false when `deload_week_number === 0` (D046)
- [ ] `calculateDeloadSets` uses default factor of 0.6 (~60% weight reduction)
- [ ] Weight rounded to nearest 2.5kg (practical plate increment)
- [ ] Volume reduction: drop last set when > 3 working sets
- [ ] Null weights pass through without crashing
- [ ] Non-working sets in input are filtered out
- [ ] Full test suite passes with zero failures (analytics + M001 existing tests)

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/deloadCalculator.test.ts` all green
- `cd apps/mobile && pnpm test -- --run` full suite passes with zero failures

## Observability Impact

- Signals added/changed: None (pure computation)
- How a future agent inspects this: Run deload calculator tests; full suite run proves no regressions across all modules
- Failure state exposed: Any test failure in the full suite run indicates either a deload bug or a regression from schema/type changes

## Inputs

- `apps/mobile/src/lib/types/analytics.ts` — `DeloadSet` type from T01
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSet`, `SetType` types
- `apps/mobile/src/lib/types/program.ts` — `Mesocycle` type for `isDeloadWeek`
- All prior T01–T04 outputs must be in place

## Expected Output

- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — deload calculation with weight reduction, volume reduction, and mesocycle week check
- `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — comprehensive deload tests
- Full test suite green: all analytics modules + all existing M001 tests pass together
