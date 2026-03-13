---
estimated_steps: 4
estimated_files: 3
---

# T02: Extend WorkoutRepository with history queries and tests

**Slice:** S04 — Workout History & Body Weight
**Milestone:** M001

## Description

Add two new query methods to WorkoutRepository for the history feature: `getCompletedSessions` returns a paginated list of completed sessions with training day name, exercise count, and total set count resolved via SQL JOINs (avoids N+1). `getSessionDetail` returns a session with sets plus a map of exercise names. Both methods are tested with Vitest.

## Steps

1. Add `CompletedSessionSummary` type to `src/lib/types/workout.ts`:
   - `id`, `started_at`, `completed_at`, `duration_seconds`, `training_day_name` (string), `exercise_count` (number), `total_sets` (number)
   - Add `SessionDetailWithNames` type: extends `WorkoutSessionWithSets` with `exerciseNames: Record<string, string>` (exercise_id → name map)

2. Add `getCompletedSessions(limit = 20, offset = 0)` to WorkoutRepository:
   - SQL: SELECT session fields + training_days.name as training_day_name + subquery for COUNT(DISTINCT exercise_id) as exercise_count + subquery for COUNT(*) as total_sets from workout_sets
   - WHERE status = 'completed' AND sessions.deleted_at IS NULL
   - ORDER BY completed_at DESC, rowid DESC (D028 tiebreaker pattern)
   - LIMIT/OFFSET for pagination
   - Returns `CompletedSessionSummary[]`

3. Add `getSessionDetail(id)` to WorkoutRepository:
   - Loads session + sets via existing `getSessionById` (reuse, don't duplicate)
   - Then collects unique exercise_ids from sets
   - Batch-loads exercise names via single query: `SELECT id, name FROM exercises WHERE id IN (...)`
   - Returns `SessionDetailWithNames | null`

4. Add tests to `src/lib/db/__tests__/workout-repository.test.ts`:
   - `getCompletedSessions`: returns only completed sessions (not in_progress/cancelled), returns correct training_day_name, returns correct exercise_count and total_sets, respects pagination (limit/offset), returns empty array when no completed sessions, orders by completed_at DESC
   - `getSessionDetail`: returns session with exercise names resolved, returns null for non-existent session, handles sets with unknown exercise_id gracefully (name = unknown/deleted)

## Must-Haves

- [ ] CompletedSessionSummary and SessionDetailWithNames types in workout.ts
- [ ] getCompletedSessions with JOIN for training day name and subqueries for counts
- [ ] getSessionDetail with batch exercise name resolution
- [ ] All existing WorkoutRepository tests still pass
- [ ] New history query tests pass

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/workout-repository.test.ts` — all tests pass (existing + new)

## Observability Impact

- Signals added/changed: None — read-only queries don't need logging (matching existing pattern where getSessionById has no logging)
- How a future agent inspects this: Call getCompletedSessions() or getSessionDetail(id) from console to inspect returned data shape
- Failure state exposed: Returns empty array / null for missing data, throws on SQL errors with standard DB error propagation

## Inputs

- `src/lib/db/repositories/workout.ts` — existing WorkoutRepository to extend
- `src/lib/types/workout.ts` — existing session/set types
- `src/lib/db/__tests__/workout-repository.test.ts` — existing test file to extend
- `src/lib/db/__tests__/test-helpers.ts` — test infrastructure

## Expected Output

- `src/lib/types/workout.ts` — CompletedSessionSummary + SessionDetailWithNames types added
- `src/lib/db/repositories/workout.ts` — getCompletedSessions + getSessionDetail methods added
- `src/lib/db/__tests__/workout-repository.test.ts` — new test describe blocks for history queries
