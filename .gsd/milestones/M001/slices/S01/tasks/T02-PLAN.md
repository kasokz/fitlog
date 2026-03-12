---
estimated_steps: 4
estimated_files: 2
---

# T02: Build ExerciseRepository with full CRUD and tests

**Slice:** S01 — Data Layer & Exercise Library
**Milestone:** M001

## Description

Implement the ExerciseRepository class that encapsulates all exercise-related database operations behind a typed interface. This is the primary data access pattern for exercises — consumed by the UI in T04/T05, and by future slices S02 (exercise picker for programs) and S03 (exercise lookup during workout logging). The repository validates inputs with Zod, generates UUIDs, handles soft delete filtering, and returns typed Exercise objects.

## Steps

1. **Implement ExerciseRepository** in `src/lib/db/repositories/exercise.ts`:
   - `getAll(options?: { limit?: number; offset?: number })` — returns exercises ordered by name, excludes soft-deleted, supports pagination
   - `getById(id: string)` — returns single exercise or null, excludes soft-deleted
   - `search(query: string)` — LIKE search on name (case-insensitive), excludes soft-deleted
   - `filterByMuscleGroup(muscleGroup: MuscleGroup)` — filter by primary muscle group
   - `filterByEquipment(equipment: Equipment)` — filter by equipment type
   - `combinedFilter(options: { search?: string; muscleGroup?: MuscleGroup; equipment?: Equipment })` — combined filtering with all optional params, builds WHERE clause dynamically
   - `create(data: ExerciseInsert)` — validates with Zod exerciseInsertSchema, generates UUID via `crypto.randomUUID()`, sets created_at/updated_at to `new Date().toISOString()`, sets is_custom = 1
   - `update(id: string, data: ExerciseUpdate)` — validates with Zod exerciseUpdateSchema, sets updated_at, only updates provided fields
   - `softDelete(id: string)` — sets deleted_at to current timestamp
   - `getCount(options?: { muscleGroup?: MuscleGroup; equipment?: Equipment })` — returns count for filter badge display
   - All methods call `getDb()` internally to ensure DB is initialized
   - Secondary muscle groups stored as JSON string, parsed on read

2. **Handle the secondary_muscle_groups JSON serialization**: On insert/update, `JSON.stringify()` the array. On read, `JSON.parse()` it back. Handle null/empty cases gracefully.

3. **Write comprehensive tests** in `src/lib/db/__tests__/exercise-repository.test.ts`:
   - CRUD lifecycle: create → getById → update → verify changes → softDelete → verify hidden from getAll
   - Search: exact match, partial match, case-insensitive, no results
   - Filter by muscle group: returns only matching, empty result for unused group
   - Filter by equipment: returns only matching
   - Combined filter: muscle group + equipment, search + muscle group, all three
   - Pagination: getAll with limit/offset
   - Validation: create rejects missing required fields, rejects invalid muscle group, rejects invalid equipment
   - Soft delete: softDeleted exercise not returned by getAll/search/filter, still exists in DB
   - getCount: returns correct count with and without filters

4. **Verify all tests pass** and repository handles edge cases (empty database, no matches, duplicate names allowed).

## Must-Haves

- [ ] ExerciseRepository with all listed methods
- [ ] Zod validation on create and update
- [ ] UUID generation via crypto.randomUUID()
- [ ] Soft delete filtering on all read methods
- [ ] Secondary muscle groups as JSON serialization
- [ ] Comprehensive test coverage for CRUD, search, filter, validation, soft delete

## Verification

- `pnpm --filter mobile test -- --run` — all exercise repository tests pass
- Tests cover: create, read, update, soft-delete, search, filter, combined filter, pagination, validation, count

## Observability Impact

- Signals added/changed: Repository methods throw typed errors for validation failures (Zod errors) and database errors; no additional logging beyond what database.ts provides
- How a future agent inspects this: Call `ExerciseRepository.getAll()` to see all exercises; call `getCount()` for quick counts; query exercises table directly via `dbQuery()` for raw inspection
- Failure state exposed: Zod validation errors include field-level details; database errors propagate with the SQL context from database.ts

## Inputs

- `src/lib/db/database.ts` — `getDb()`, `dbExecute()`, `dbQuery()` from T01
- `src/lib/types/exercise.ts` — Exercise type, MuscleGroup/Equipment enums, Zod schemas from T01
- `src/lib/db/__tests__/test-helpers.ts` — test DB mock from T01

## Expected Output

- `apps/mobile/src/lib/db/repositories/exercise.ts` — complete ExerciseRepository class
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — comprehensive passing tests
