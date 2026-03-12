---
id: T01
parent: S02
milestone: M001
provides:
  - Program, TrainingDay, ExerciseAssignment, Mesocycle types and Zod schemas
  - Schema v2 with 4 new SQLite tables
  - ProgramRepository with 15+ methods
  - 55 tests covering all repository methods
key_files:
  - apps/mobile/src/lib/types/program.ts
  - apps/mobile/src/lib/db/schema.sql
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/db/repositories/program.ts
  - apps/mobile/src/lib/db/__tests__/program-repository.test.ts
key_decisions:
  - Row types use `type` alias instead of `interface` to satisfy Record<string, SQLValue> constraint in dbQuery generic
  - createProgram uses BEGIN/COMMIT/ROLLBACK via CapgoCapacitorFastSql directly (not dbExecute wrapper) for transaction control
  - getMesocycleByProgramId returns most recent active mesocycle (ORDER BY created_at DESC LIMIT 1)
  - softDeleteProgram does not cascade — training days and mesocycles remain untouched
patterns_established:
  - ProgramRepository follows same plain-object pattern as ExerciseRepository
  - Auto sort_order via MAX(sort_order)+1 for training days and exercise assignments
  - Transaction pattern for multi-table inserts with rollback on validation failure
observability_surfaces:
  - Schema migration logs `[DB] Applying schema migration { from: N, to: 2 }` on upgrade
  - Zod validation errors include field-level detail (path, constraint)
  - Transaction rollback on multi-table insert failure
duration: 10min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Program types, schema v2, and repository with tests

**Built complete data layer for programs, training days, exercise assignments, and mesocycles with 55 passing tests.**

## What Happened

Created all type definitions and Zod v4 validation schemas for the program domain (Program, TrainingDay, ExerciseAssignment, Mesocycle) plus composite types (ProgramWithDays, TrainingDayWithAssignments). Added 4 new SQLite tables with indexes to schema.sql and bumped CURRENT_SCHEMA_VERSION to 2. Built ProgramRepository as a plain object with 15+ methods covering full CRUD, nested loading, reordering, and mesocycle management. Wrote comprehensive test suite with 55 tests.

Also fixed a pre-existing issue where Row type interfaces didn't satisfy `Record<string, SQLValue>` — converted to type aliases in both ExerciseRepository and ProgramRepository.

## Verification

- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — **55 tests pass**
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — **17 tests pass** (updated version assertions from 1→2, added 4 new table structure tests)
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/exercise-repository.test.ts` — **57 tests pass** (no regression)
- `pnpm -r check` — No new TypeScript errors (10 pre-existing errors in ExerciseForm.svelte and exercise-repository.test.ts remain)

### Slice-level verification status (intermediate task):
- [x] program-repository.test.ts — all pass
- [x] database.test.ts — all pass (v2 migration)
- [x] TypeScript — no new errors from this task
- [ ] i18n key count — not applicable to this task (no UI)

## Diagnostics

- Run `SELECT version FROM schema_version ORDER BY version DESC LIMIT 1` to confirm v2 applied
- Zod parse errors include `.issues[].path` for field identification
- Transaction rollback verified: if a training day fails validation during createProgram, no program row is left behind

## Deviations

- Updated database.test.ts to reflect version 2 (version assertions and added 4 new table structure tests) — not explicitly in task plan but required for non-regression
- Fixed pre-existing ExerciseRow `interface` → `type` to resolve Record<string, SQLValue> constraint errors that surfaced during check

## Known Issues

- 10 pre-existing TypeScript errors in ExerciseForm.svelte (string→enum assignment) and exercise-repository.test.ts (ExerciseUpdate requires `id` but test calls `update(id, data)` separately) — unrelated to this task

## Files Created/Modified

- `apps/mobile/src/lib/types/program.ts` — New: Program, TrainingDay, ExerciseAssignment, Mesocycle interfaces + Zod insert/update schemas + composite types
- `apps/mobile/src/lib/db/schema.sql` — Modified: Added programs, training_days, exercise_assignments, mesocycles tables with indexes (v1→v2)
- `apps/mobile/src/lib/db/database.ts` — Modified: CURRENT_SCHEMA_VERSION 1→2
- `apps/mobile/src/lib/db/repositories/program.ts` — New: ProgramRepository with 15+ methods (CRUD, nested loading, reordering, mesocycles)
- `apps/mobile/src/lib/db/__tests__/program-repository.test.ts` — New: 55 tests covering all repository methods
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — Modified: Updated version assertions, added 4 new table structure tests
- `apps/mobile/src/lib/db/repositories/exercise.ts` — Modified: ExerciseRow interface→type alias (Record<string, SQLValue> fix)
