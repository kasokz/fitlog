---
estimated_steps: 5
estimated_files: 5
---

# T01: Program types, schema v2, and repository with tests

**Slice:** S02 — Programs & Mesocycles
**Milestone:** M001

## Description

Build the entire data layer for programs, training days, exercise assignments, and mesocycles. This includes TypeScript interfaces, Zod v4 validation schemas, 4 new SQLite tables, schema v2 migration, and a comprehensive ProgramRepository with full test coverage. This is the foundation that all UI tasks and downstream slices (S03, S05) depend on.

## Steps

1. **Create `src/lib/types/program.ts`** — Define interfaces and Zod schemas:
   - `Program` interface extending `SoftDeletable` (id, name, description, created_at, updated_at, deleted_at)
   - `TrainingDay` interface (id, program_id, name, sort_order, created_at, updated_at, deleted_at)
   - `ExerciseAssignment` interface (id, training_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, created_at, updated_at, deleted_at)
   - `Mesocycle` interface (id, program_id, weeks_count, deload_week_number, start_date nullable, current_week default 1, created_at, updated_at, deleted_at)
   - Zod insert/update schemas for each: `programInsertSchema`, `programUpdateSchema`, `trainingDayInsertSchema`, `exerciseAssignmentInsertSchema`, `mesocycleInsertSchema`, `mesocycleUpdateSchema`
   - Use `z.uuid()`, `z.optional()`, `z.nullable()` — Zod v4 syntax per AGENTS.md
   - Composite type `ProgramWithDays` (Program + trainingDays: TrainingDayWithAssignments[]) and `TrainingDayWithAssignments` (TrainingDay + assignments: ExerciseAssignment[])

2. **Add tables to `src/lib/db/schema.sql`** — Append 4 new `CREATE TABLE IF NOT EXISTS` blocks after exercises table:
   - `programs` (id TEXT PK, name TEXT NOT NULL, description TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT)
   - `training_days` (id TEXT PK, program_id TEXT NOT NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at, updated_at, deleted_at) + index on program_id
   - `exercise_assignments` (id TEXT PK, training_day_id TEXT NOT NULL, exercise_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, target_sets INTEGER NOT NULL DEFAULT 3, min_reps INTEGER NOT NULL DEFAULT 8, max_reps INTEGER NOT NULL DEFAULT 12, created_at, updated_at, deleted_at) + indexes on training_day_id and exercise_id
   - `mesocycles` (id TEXT PK, program_id TEXT NOT NULL, weeks_count INTEGER NOT NULL DEFAULT 4, deload_week_number INTEGER NOT NULL DEFAULT 0, start_date TEXT, current_week INTEGER NOT NULL DEFAULT 1, created_at, updated_at, deleted_at) + index on program_id

3. **Bump schema version in `src/lib/db/database.ts`** — Change `CURRENT_SCHEMA_VERSION` from 1 to 2. The existing `applySchema()` logic re-applies all DDL statements from schema.sql using `CREATE TABLE IF NOT EXISTS`, so adding new tables is safe and idempotent. Existing v1 databases get new tables on next connect.

4. **Build `src/lib/db/repositories/program.ts`** — Plain object repository following ExerciseRepository pattern:
   - Row mapping functions: `rowToProgram`, `rowToTrainingDay`, `rowToExerciseAssignment`, `rowToMesocycle`
   - `createProgram(data, trainingDays?)` — transaction: INSERT program, INSERT training days with sort_order, return created program. Uses `beginTransaction`/`commitTransaction`/`rollbackTransaction` from the plugin mock.
   - `getAll()` — all active programs ordered by name
   - `getById(id)` — single program with nested training days + assignments (ProgramWithDays)
   - `updateProgram(id, data)` — partial update of program fields
   - `softDeleteProgram(id)` — soft-delete program only (not cascade)
   - `addTrainingDay(programId, data)` — insert with auto sort_order (max+1)
   - `updateTrainingDay(id, data)` — partial update
   - `removeTrainingDay(id)` — soft-delete
   - `reorderTrainingDays(programId, orderedIds)` — update sort_order for all given IDs
   - `addExerciseAssignment(trainingDayId, data)` — insert with auto sort_order
   - `updateExerciseAssignment(id, data)` — partial update
   - `removeExerciseAssignment(id)` — soft-delete
   - `reorderExerciseAssignments(trainingDayId, orderedIds)` — update sort_order
   - `createMesocycle(programId, data)` — insert mesocycle for program
   - `getMesocycleByProgramId(programId)` — get active mesocycle
   - `updateMesocycle(id, data)` — partial update

5. **Write `src/lib/db/__tests__/program-repository.test.ts`** — Comprehensive tests using same setup pattern as exercise-repository.test.ts:
   - Setup: `setupMockDatabase()`, `_resetForTesting()`, `getDb()`, `clearAllPrograms()` in beforeEach
   - CRUD lifecycle: create → getById → update → softDelete full cycle
   - Training day management: add, reorder, remove, sort_order correctness
   - Exercise assignment management: add with exercise_id FK, reorder, remove, target_sets/reps validation
   - Nested loading: getById returns ProgramWithDays with populated trainingDays and assignments
   - Transaction atomicity: verify rollback on failure leaves no orphaned rows
   - Mesocycle: create, read, update, deload_week validation (0 ≤ deload_week ≤ weeks_count)
   - Validation: Zod rejects invalid input (empty name, negative sets/reps, invalid UUIDs)
   - Soft-delete filtering: deleted programs/days/assignments hidden from reads
   - Empty database: getAll returns [], getById returns null
   - Edge cases: duplicate program names allowed, removing last training day works

## Must-Haves

- [ ] All 4 interfaces + Zod schemas in program.ts follow exercise.ts patterns exactly (SoftDeletable, z.uuid(), z.optional())
- [ ] Schema v2 tables use UUID PK, created_at, updated_at, deleted_at (D002)
- [ ] CURRENT_SCHEMA_VERSION bumped to 2
- [ ] ProgramRepository is a plain object, not a class (D017)
- [ ] createProgram uses transaction for multi-table inserts
- [ ] getById returns nested structure (ProgramWithDays with TrainingDayWithAssignments)
- [ ] 30+ tests passing covering all repository methods

## Verification

- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — all tests pass
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — existing tests still pass (no regression)
- `pnpm -r check` — TypeScript compiles cleanly

## Observability Impact

- Signals added/changed: Schema migration logs `[DB] Applying schema migration { from: 1, to: 2 }` on first connect after upgrade. ProgramRepository throws Zod validation errors with field-level detail for invalid input.
- How a future agent inspects this: Run `SELECT version FROM schema_version ORDER BY version DESC LIMIT 1` to confirm v2 applied. Run test suite for contract verification.
- Failure state exposed: Transaction rollback on multi-table insert failure. Zod parse errors include exact field and constraint that failed.

## Inputs

- `src/lib/types/common.ts` — UUID, Timestamp, SoftDeletable types
- `src/lib/types/exercise.ts` — pattern for interfaces, enums-as-const, Zod schemas
- `src/lib/db/repositories/exercise.ts` — pattern for plain-object repository, row mapping, dbExecute/dbQuery usage
- `src/lib/db/__tests__/test-helpers.ts` — sql.js mock with transaction support
- `src/lib/db/__tests__/exercise-repository.test.ts` — test setup pattern, clearAll helper

## Expected Output

- `src/lib/types/program.ts` — complete type definitions and Zod schemas for Program, TrainingDay, ExerciseAssignment, Mesocycle
- `src/lib/db/schema.sql` — 4 new tables + indexes appended
- `src/lib/db/database.ts` — CURRENT_SCHEMA_VERSION = 2
- `src/lib/db/repositories/program.ts` — full ProgramRepository with 15+ methods
- `src/lib/db/__tests__/program-repository.test.ts` — 30+ passing tests
