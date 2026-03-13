---
estimated_steps: 5
estimated_files: 3
---

# T02: Build AnalyticsRepository with read-only queries

**Slice:** S01 — Analytics Computation Engine & Schema
**Milestone:** M002

## Description

Implement the `AnalyticsRepository` — the dedicated SQL query layer for all analytics computations. Every query enforces the working-set filter (`set_type='working' AND completed=1 AND deleted_at IS NULL`) as the single source of truth. This repository is consumed by all 5 analytics services and must be proven correct with realistic multi-session seeded data before any computation logic is built.

## Steps

1. Create `apps/mobile/src/lib/db/repositories/analytics.ts` following the existing repository pattern (static class methods, `dbQuery<T>()` for reads). Implement 4 methods:
   - `getExerciseSetsHistory(exerciseId: UUID, dateRange?: AnalyticsDateRange)` — returns all completed working sets for an exercise, ordered by session date DESC then set_number ASC. JOINs `workout_sessions` for `started_at` timestamp. Filters: `ws.set_type='working' AND ws.completed=1 AND ws.deleted_at IS NULL AND s.status='completed' AND s.deleted_at IS NULL`. If dateRange provided, filter `s.started_at >= startDate + 'T00:00:00'` and `s.started_at <= endDate + 'T23:59:59'`.
   - `getCompletedWorkingSets(exerciseId: UUID, sessionIds: UUID[])` — returns working sets for specific sessions. Used by PR detector and progression advisor. Same working-set filters. Orders by session started_at, then set_number.
   - `getRecentSessionsForExercise(exerciseId: UUID, count: number)` — returns the N most recent completed session IDs that contain at least one completed working set for the given exercise. Uses `SELECT DISTINCT s.id, s.started_at FROM workout_sessions s JOIN workout_sets ws ON ...` with working-set filters, `ORDER BY s.started_at DESC, s.rowid DESC LIMIT ?` (D028 tiebreaker).
   - `getBodyWeightRange(dateRange: AnalyticsDateRange)` — returns body weight entries in ascending date order. Filters `deleted_at IS NULL`. Uses `date >= ?` and `date <= ?` (YYYY-MM-DD comparison).
2. Define internal row types (`ExerciseSetHistoryRow`, `SessionIdRow`, `BodyWeightRow`) for SQL result mapping. Map to the analytics types from T01.
3. Write comprehensive tests in `apps/mobile/src/lib/db/__tests__/analytics-repository.test.ts`:
   - Follow the workout-repository.test.ts pattern exactly: `setupMockDatabase()` at module scope, dynamic imports, `_resetForTesting()` + `getDb()` in `beforeEach`, `teardownMockDatabase()` in `afterEach`.
   - Seed helper functions that create programs, training days, exercises, sessions, and sets for realistic scenarios.
   - Test scenarios:
     - `getExerciseSetsHistory`: returns only working+completed sets, excludes warmup/drop/failure sets, excludes incomplete sets, respects date range filter, orders correctly
     - `getCompletedWorkingSets`: filters to specific sessions, excludes non-working sets
     - `getRecentSessionsForExercise`: returns correct count, most recent first, excludes sessions without working sets for the exercise, applies rowid tiebreaker
     - `getBodyWeightRange`: returns entries in ascending date order, respects date range, excludes soft-deleted entries
4. Ensure the test that seeds non-working sets (warmup, drop, failure) verifies they are NEVER returned — this is the critical working-set filter proof.
5. Run the test suite and verify all pass.

## Must-Haves

- [ ] All 4 repository methods filter `set_type='working' AND completed=1 AND deleted_at IS NULL`
- [ ] `getRecentSessionsForExercise` uses `rowid DESC` tiebreaker (D028)
- [ ] Date range queries use consistent timestamp handling (D050 research: `started_at >= startDate + 'T00:00:00'`)
- [ ] Test explicitly seeds warmup + incomplete sets and proves they are excluded
- [ ] Test seeds multiple sessions across dates and proves correct ordering
- [ ] Repository methods return typed data matching `analytics.ts` interfaces

## Verification

- `cd apps/mobile && pnpm test -- --run src/lib/db/__tests__/analytics-repository.test.ts` passes with all scenarios green
- Working-set filter proven: test with mixed set types shows only `working` + `completed` returned

## Observability Impact

- Signals added/changed: None (read-only queries, no state changes)
- How a future agent inspects this: Run the analytics-repository test suite to verify query correctness
- Failure state exposed: SQL errors surface as test failures with the exact query and parameters

## Inputs

- `apps/mobile/src/lib/types/analytics.ts` — `AnalyticsDateRange` type from T01
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSet`, `SetType` for seed data
- `apps/mobile/src/lib/db/database.ts` — `dbQuery`, `dbExecute`, `getDb`, `_resetForTesting`
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock setup
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — pattern to follow for test structure

## Expected Output

- `apps/mobile/src/lib/db/repositories/analytics.ts` — fully implemented AnalyticsRepository with 4 query methods
- `apps/mobile/src/lib/db/__tests__/analytics-repository.test.ts` — comprehensive test suite proving query correctness and working-set filter enforcement
