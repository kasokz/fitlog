---
estimated_steps: 5
estimated_files: 5
---

# T04: Implement volume aggregation and progression advisor services

**Slice:** S01 — Analytics Computation Engine & Schema
**Milestone:** M002

## Description

Build `volumeAggregator.ts` (R015 — tonnage trends) and `progressionAdvisor.ts` (R016 — RIR-driven progression suggestions). The progression advisor is the highest-risk computation in S01 — the heuristic of "≥2 consecutive sessions with avg RIR ≥2 across ≥3 working sets" must be rigorously tested at threshold boundaries. The volume aggregator provides the tonnage math used by the dashboard charts.

## Steps

1. Create `apps/mobile/src/lib/services/analytics/volumeAggregator.ts`:
   - `getExerciseVolume(exerciseId: UUID, dateRange?: AnalyticsDateRange): Promise<VolumeDataPoint[]>` — uses `AnalyticsRepository.getExerciseSetsHistory()` to get completed working sets, groups by session date, calculates `totalVolume = sum(weight * reps)` per date, returns `VolumeDataPoint[]` sorted by date ascending. Sets with null weight or null reps contribute 0 to volume (skip, don't crash).
   - `getMuscleGroupVolume(muscleGroup: MuscleGroup, dateRange?: AnalyticsDateRange): Promise<VolumeDataPoint[]>` — queries all exercises matching the muscle group (primary only, not secondary per research recommendation), aggregates volume across all exercises in that group per date.
   - `getSessionTonnage(sessionId: UUID): Promise<number>` — queries all completed working sets for a session, sums `weight * reps`. Returns 0 for sessions with no valid sets.
2. Create `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts`:
   - Define `DEFAULT_THRESHOLDS: ProgressionThresholds` as `{ minSessions: 2, minAvgRir: 2, minWorkingSetsPerSession: 3 }`.
   - Define `WEIGHT_INCREMENTS: Record<Equipment, number>` mapping: `barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 2.5, bodyweight: 0, kettlebell: 2.5, band: 2.5, other: 2.5`. Bodyweight = 0 signals "skip this exercise."
   - `getProgressionSuggestion(exerciseId: UUID, thresholds?: Partial<ProgressionThresholds>): Promise<ProgressionSuggestion | null>`:
     1. Get exercise metadata via `ExerciseRepository.getById()` to access `equipment`.
     2. If `equipment === 'bodyweight'`, return null immediately (D045 — skip bodyweight exercises).
     3. Get recent sessions via `AnalyticsRepository.getRecentSessionsForExercise(exerciseId, mergedThresholds.minSessions)`.
     4. If session count < `minSessions`, return null.
     5. For each session, get completed working sets via `AnalyticsRepository.getCompletedWorkingSets()`.
     6. For each session, verify it has ≥ `minWorkingSetsPerSession` working sets. If any session doesn't qualify, return null.
     7. Calculate average RIR across all qualifying sets from all qualifying sessions. Sets with null RIR are excluded from the average (not counted as 0).
     8. If avg RIR < `minAvgRir`, return null.
     9. Calculate `current_weight` as the mode (most common) weight across the most recent session's working sets.
     10. Calculate `increment_kg` from `WEIGHT_INCREMENTS[equipment]`.
     11. Calculate `suggested_weight` as `current_weight + increment_kg`, rounded to the equipment's increment.
     12. Return `ProgressionSuggestion` with all fields populated.
3. Write tests in `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts`:
   - These need sql.js mock with seeded workout data.
   - `getExerciseVolume`: correct tonnage (e.g., 3 sets of 100kg×8 = 2400 volume), grouped by date, null weight/reps handled gracefully
   - `getMuscleGroupVolume`: aggregates across multiple exercises in same muscle group
   - `getSessionTonnage`: sums all working sets in a session, returns 0 for empty session
4. Write tests in `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts`:
   - These need sql.js mock with multi-session seeded data.
   - **Triggers suggestion:** 2 sessions, each with 3+ working sets, all RIR ≥ 2 → returns ProgressionSuggestion with correct weight
   - **Insufficient sessions:** only 1 session → null
   - **Low RIR:** 2 sessions but avg RIR = 1 → null
   - **Insufficient sets per session:** 2 sessions but one has only 2 working sets → null
   - **Bodyweight exercise:** equipment='bodyweight' → null immediately
   - **Equipment rounding:** barbell exercise suggests +2.5kg, dumbbell suggests +2kg
   - **Null RIR handling:** sets with null RIR excluded from average, doesn't break calculation
   - **Custom thresholds:** override minSessions=3, verify 2 sessions returns null
   - **Mixed RIR within qualifying range:** some sets RIR=2, some RIR=3, avg still ≥2 → triggers
5. Run both test suites and verify all pass.

## Must-Haves

- [ ] Volume aggregation uses only completed working sets (via AnalyticsRepository)
- [ ] Volume handles null weight/reps without crashing (contributes 0)
- [ ] Progression advisor returns null for bodyweight exercises (D045)
- [ ] Progression advisor respects all 3 thresholds: minSessions, minAvgRir, minWorkingSetsPerSession
- [ ] Thresholds are configurable via parameter (D045 — easy to tune)
- [ ] Weight increment correctly maps to equipment type
- [ ] Null RIR excluded from average (not counted as 0)
- [ ] Tests cover all threshold boundary conditions

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/volumeAggregator.test.ts` all green
- `cd apps/mobile && pnpm test -- --run src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` all green

## Observability Impact

- Signals added/changed: None (pure computation, all state flows through function arguments and returns)
- How a future agent inspects this: Run the test suites; progression advisor tests specifically name each threshold condition
- Failure state exposed: Test assertions pinpoint which threshold check or volume calculation is wrong

## Inputs

- `apps/mobile/src/lib/types/analytics.ts` — `VolumeDataPoint`, `ProgressionSuggestion`, `ProgressionThresholds`, `WeightIncrement` types from T01
- `apps/mobile/src/lib/types/exercise.ts` — `Equipment`, `MuscleGroup` enums
- `apps/mobile/src/lib/db/repositories/analytics.ts` — `AnalyticsRepository` methods from T02
- `apps/mobile/src/lib/db/repositories/exercise.ts` — `ExerciseRepository.getById()` for equipment lookup
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock

## Expected Output

- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` — volume/tonnage computation with exercise and muscle group aggregation
- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` — RIR-driven progression suggestion engine with configurable thresholds and equipment-based rounding
- `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — volume math tests
- `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — comprehensive threshold boundary tests proving the progression algorithm
