---
id: T01
parent: S03
milestone: M001
provides:
  - workout_sessions and workout_sets tables (schema v3)
  - WorkoutSession and WorkoutSet types with Zod v4 validation
  - WorkoutRepository with 8 methods (createSession, getSessionById, addSet, updateSet, removeSet, completeSession, getLastSessionForDay, getInProgressSession)
  - Concurrent session prevention
  - Pre-fill query by exercise_id
  - Comprehensive unit tests (32 tests)
key_files:
  - apps/mobile/src/lib/db/schema.sql
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/types/workout.ts
  - apps/mobile/src/lib/db/repositories/workout.ts
  - apps/mobile/src/lib/db/__tests__/workout-repository.test.ts
key_decisions:
  - Hard-delete for workout sets (not soft-delete) since sets in in-progress sessions haven't been committed
  - rowid DESC tiebreaker on ORDER BY queries to prevent same-millisecond ordering issues in SQLite
  - SessionStatus and SetType as const objects (not TypeScript enums) matching the pattern used elsewhere
  - Sets ordered by exercise_id then set_number for consistent grouping in getSessionById and getLastSessionForDay
patterns_established:
  - WorkoutRepository follows same pattern as ProgramRepository (row types, rowToEntity mappers, Zod validation on input)
  - [Workout] prefixed console.log for session lifecycle events
  - Auto-incrementing set_number per exercise per session (max+1 query)
observability_surfaces:
  - "[Workout] Session created" log with sessionId and trainingDayId
  - "[Workout] Session completed" log with sessionId and durationSeconds
  - WorkoutRepository.getSessionById returns full session with status/duration/sets
  - WorkoutRepository.getInProgressSession returns active session or null
  - Concurrent session error includes existing session ID
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Schema v3, workout types, and WorkoutRepository with tests

**Built complete workout data layer: schema v3 with workout_sessions/workout_sets tables, typed interfaces with Zod v4 validation, and WorkoutRepository with all CRUD methods, concurrent session prevention, and pre-fill query — all verified by 32 unit tests.**

## What Happened

1. Added `workout_sessions` and `workout_sets` tables to schema.sql with all required columns, indexes on training_day_id, started_at, status, session_id, and exercise_id.

2. Bumped `CURRENT_SCHEMA_VERSION` from 2 to 3 in database.ts. Updated existing database tests to expect version 3.

3. Created `types/workout.ts` with SessionStatus and SetType const-object enums, WorkoutSession and WorkoutSet interfaces extending SoftDeletable, WorkoutSessionWithSets composite type, and Zod v4 insert/update schemas for both sessions and sets.

4. Built `repositories/workout.ts` with 8 methods:
   - `createSession` — validates input, checks for concurrent in_progress session (throws with existing session ID if found), creates with status in_progress
   - `getSessionById` — returns session with all sets joined, ordered by exercise_id + set_number
   - `addSet` — auto-assigns set_number (max+1 per exercise per session)
   - `updateSet` — partial update for weight/reps/rir/set_type/completed/rest_seconds
   - `removeSet` — hard-delete (not soft-delete) for in-progress workout edits
   - `completeSession` — sets status=completed, completed_at, duration_seconds
   - `getLastSessionForDay` — returns last completed session with sets, ordered by completed_at DESC with rowid DESC tiebreaker
   - `getInProgressSession` — returns any in_progress session with sets, or null

5. Wrote 32 comprehensive unit tests covering all repository methods, concurrent session prevention, auto-incrementing set_number per exercise, pre-fill query behavior, and edge cases.

6. Fixed a pre-existing flaky test in ProgramRepository.getMesocycleByProgramId — same-millisecond `created_at` ordering issue fixed with `rowid DESC` tiebreaker.

## Verification

- `pnpm -F mobile test -- --run` — all 154 tests pass (32 new workout tests + 122 existing)
- `pnpm -F mobile build` — builds without errors, confirming types and imports are wired correctly
- Tests run stable across multiple executions (no flakiness)

## Diagnostics

- `WorkoutRepository.getSessionById(id)` — inspect full session state including status, duration, all sets
- `WorkoutRepository.getInProgressSession()` — check for active sessions, returns null if none
- Console logs: `[Workout] Session created` and `[Workout] Session completed` with structured data
- Concurrent session conflict throws: `[WorkoutRepository] Cannot create session: concurrent in_progress session exists (<sessionId>)`
- Pre-fill returns empty array (never throws) when no prior completed sessions exist

## Deviations

- Fixed pre-existing flaky test in `ProgramRepository` (mesocycle ordering) — same root cause as the ordering issue in `getLastSessionForDay` (same-millisecond timestamps). Added `rowid DESC` tiebreaker to both queries.
- Updated `database.test.ts` to expect schema version 3 instead of 2 (required by version bump).

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/db/schema.sql` — Added workout_sessions and workout_sets tables with indexes (v2 → v3)
- `apps/mobile/src/lib/db/database.ts` — Bumped CURRENT_SCHEMA_VERSION from 2 to 3
- `apps/mobile/src/lib/types/workout.ts` — New: SessionStatus, SetType enums, WorkoutSession/WorkoutSet interfaces, Zod schemas
- `apps/mobile/src/lib/db/repositories/workout.ts` — New: WorkoutRepository with 8 methods
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — New: 32 comprehensive unit tests
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — Updated version expectations from 2 to 3
- `apps/mobile/src/lib/db/repositories/program.ts` — Fixed flaky mesocycle ordering with rowid tiebreaker
