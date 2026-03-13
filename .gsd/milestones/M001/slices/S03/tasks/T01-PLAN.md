---
estimated_steps: 5
estimated_files: 5
---

# T01: Schema v3, workout types, and WorkoutRepository with tests

**Slice:** S03 — Workout Logging
**Milestone:** M001

## Description

Build the complete data layer for workout logging: schema v3 with `workout_sessions` and `workout_sets` tables, typed interfaces with Zod validation, and a full `WorkoutRepository` with all CRUD methods plus the pre-fill query and concurrent session prevention. Write comprehensive unit tests that serve as the slice's primary contract verification.

## Steps

1. **Add workout tables to schema.sql** — Add `workout_sessions` and `workout_sets` tables with all columns from the research data model. Add indexes on `training_day_id`, `started_at`, `status`, `session_id`, and `exercise_id`. Keep existing tables untouched (additive, `CREATE TABLE IF NOT EXISTS`).

2. **Bump schema version** — In `database.ts`, change `CURRENT_SCHEMA_VERSION` from 2 to 3. The existing `applySchema()` function re-runs all DDL on version bump, so new tables are created automatically.

3. **Create workout types** — In `src/lib/types/workout.ts`: Define `SessionStatus` enum (`in_progress`, `completed`, `cancelled`), `SetType` enum (`warmup`, `working`, `drop`, `failure`), `WorkoutSession` and `WorkoutSet` interfaces extending `SoftDeletable`, and Zod schemas for insert/update validation. Use `z.uuid()`, `z.enum()`, `z.optional()` (Zod v4 syntax per AGENTS.md). Follow the exact pattern from `types/program.ts`.

4. **Build WorkoutRepository** — In `src/lib/db/repositories/workout.ts`: Row types, `rowToEntity()` mappers, and methods:
   - `createSession(data)` — Creates session with status `in_progress`, checks for concurrent sessions first (throw if one exists)
   - `getSessionById(id)` — Returns session with all sets (joined), or null
   - `addSet(sessionId, data)` — Adds a set, auto-assigns `set_number` (max+1 for that exercise in session)
   - `updateSet(id, data)` — Partial update for weight/reps/rir/set_type/completed
   - `removeSet(id)` — Hard-delete (not soft-delete) for in-progress workout edits
   - `completeSession(id, durationSeconds)` — Sets status=completed, completed_at, duration_seconds
   - `getLastSessionForDay(trainingDayId)` — Returns last completed session with all its sets for pre-fill (single query for session + single query for sets, matched by session_id)
   - `getInProgressSession()` — Returns any in_progress session or null (for concurrent check and resume)
   - Use transaction pattern from `ProgramRepository.createProgram` for `createSession` when pre-populating sets

5. **Write unit tests** — In `src/lib/db/__tests__/workout-repository.test.ts`: Use `setupMockDatabase()`/`teardownMockDatabase()` pattern from existing tests. Test all repository methods:
   - createSession creates with correct fields, returns session
   - createSession throws when concurrent in_progress session exists
   - addSet adds set with auto-incremented set_number
   - updateSet updates specified fields only
   - removeSet hard-deletes the set
   - completeSession sets status, completed_at, duration
   - getLastSessionForDay returns null when no previous sessions
   - getLastSessionForDay returns sets from the most recent completed session (not in_progress ones)
   - Pre-fill query returns sets matched by exercise_id, ordered by set_number
   - getInProgressSession returns existing in-progress session

## Must-Haves

- [ ] `workout_sessions` table with all columns (id, program_id, training_day_id, mesocycle_id, mesocycle_week, status, started_at, completed_at, duration_seconds, notes, timestamps, deleted_at)
- [ ] `workout_sets` table with all columns (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, rest_seconds, timestamps, deleted_at)
- [ ] Indexes on training_day_id, started_at, status, session_id, exercise_id
- [ ] CURRENT_SCHEMA_VERSION = 3
- [ ] WorkoutSession and WorkoutSet types with Zod v4 validation schemas
- [ ] SetType enum: warmup, working, drop, failure
- [ ] SessionStatus enum: in_progress, completed, cancelled
- [ ] WorkoutRepository with all 8 methods
- [ ] Concurrent session prevention (only one in_progress at a time)
- [ ] Pre-fill query uses exercise_id matching, not array position
- [ ] All tests pass

## Verification

- `pnpm -F mobile test -- --run apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — all tests pass
- Types compile without errors: `pnpm -F mobile exec tsc --noEmit --pretty` (or confirmed by test runner)

## Observability Impact

- Signals added/changed: `[Workout]` prefixed console.log on createSession and completeSession for lifecycle tracking
- How a future agent inspects this: `WorkoutRepository.getSessionById(id)` returns full session status/duration; `getInProgressSession()` checks for active sessions; all methods throw with descriptive error messages including operation name and IDs
- Failure state exposed: Concurrent session conflict throws error with existing session ID; pre-fill returns empty array (never throws) when no prior sessions exist; schema migration failure logged with statement that failed

## Inputs

- `apps/mobile/src/lib/db/database.ts` — dbExecute, dbQuery, getDb functions
- `apps/mobile/src/lib/db/schema.sql` — existing v2 schema to extend
- `apps/mobile/src/lib/types/common.ts` — UUID, Timestamp, SoftDeletable types
- `apps/mobile/src/lib/types/program.ts` — type patterns to follow
- `apps/mobile/src/lib/db/repositories/program.ts` — repository pattern, transaction pattern, row mapping pattern
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — mock database setup
- `apps/mobile/src/lib/db/__tests__/program-repository.test.ts` — test pattern to follow

## Expected Output

- `apps/mobile/src/lib/db/schema.sql` — v3 with workout_sessions, workout_sets tables + indexes
- `apps/mobile/src/lib/db/database.ts` — CURRENT_SCHEMA_VERSION = 3
- `apps/mobile/src/lib/types/workout.ts` — all workout types + Zod schemas
- `apps/mobile/src/lib/db/repositories/workout.ts` — complete WorkoutRepository
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — comprehensive tests, all passing
