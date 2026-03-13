---
id: T02
parent: S04
milestone: M001
provides:
  - CompletedSessionSummary type for history list views
  - SessionDetailWithNames type for history detail views
  - getCompletedSessions(limit, offset) method on WorkoutRepository with JOIN for training day name and subqueries for counts
  - getSessionDetail(id) method on WorkoutRepository with batch exercise name resolution
key_files:
  - apps/mobile/src/lib/types/workout.ts
  - apps/mobile/src/lib/db/repositories/workout.ts
  - apps/mobile/src/lib/db/__tests__/workout-repository.test.ts
key_decisions:
  - getSessionDetail reuses existing getSessionById then batch-loads exercise names in a single IN query (avoids N+1, reuses existing code)
  - Unknown/deleted exercise IDs mapped to 'Unknown Exercise' string rather than omitting them (graceful degradation)
patterns_established:
  - Correlated subqueries in SELECT for count aggregations (exercise_count, total_sets) alongside JOINs for denormalized names
  - Batch name resolution pattern: collect unique IDs from sets, single SELECT WHERE id IN (...), fill gaps with fallback string
observability_surfaces:
  - none — read-only queries matching existing pattern where getSessionById has no logging
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Extend WorkoutRepository with history queries and tests

**Added getCompletedSessions and getSessionDetail methods to WorkoutRepository with 9 new passing tests**

## What Happened

Added two new types (`CompletedSessionSummary`, `SessionDetailWithNames`) to `workout.ts` and two corresponding query methods to `WorkoutRepository`:

1. **`getCompletedSessions(limit, offset)`** — Single SQL query using JOIN to `training_days` for the day name, plus two correlated subqueries against `workout_sets` for `exercise_count` (COUNT DISTINCT exercise_id) and `total_sets` (COUNT *). Filters to `status='completed' AND deleted_at IS NULL`, ordered by `completed_at DESC, rowid DESC` (D028 tiebreaker).

2. **`getSessionDetail(id)`** — Reuses existing `getSessionById` to load session+sets, then collects unique exercise IDs from sets and batch-loads names via `SELECT id, name FROM exercises WHERE id IN (...)`. Unknown exercise IDs are mapped to `'Unknown Exercise'` for graceful degradation.

Added 9 new tests across two describe blocks (`getCompletedSessions` and `getSessionDetail`), covering: only-completed filtering, training day name resolution, count correctness, pagination, empty state, ordering, exercise name resolution, null for missing session, and unknown exercise graceful handling.

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/workout-repository.test.ts` — 34 tests pass (25 existing + 9 new), 0 failures
- `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` — 180 total tests pass across all 5 test files (confirming no regressions)

### Slice-level checks (intermediate — T02 of T05):
- [x] bodyweight-repository tests pass
- [x] workout-repository tests pass (existing + new)
- [ ] `pnpm --filter mobile build` — not yet run (T03+ adds routes/i18n keys needed for build)
- [ ] history i18n keys in de.json — T03 scope
- [ ] bodyweight i18n keys in de.json — T04 scope

## Diagnostics

Call `WorkoutRepository.getCompletedSessions()` or `WorkoutRepository.getSessionDetail(id)` from console/debugger to inspect returned data shape. No structured logging added (read-only queries, matching existing pattern).

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/types/workout.ts` — Added `CompletedSessionSummary` and `SessionDetailWithNames` interfaces
- `apps/mobile/src/lib/db/repositories/workout.ts` — Added `getCompletedSessions` and `getSessionDetail` methods, imported new types
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — Added 9 tests in `getCompletedSessions` and `getSessionDetail` describe blocks, imported ExerciseRepository, added exercises table cleanup
