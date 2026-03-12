---
id: T02
parent: S01
milestone: M001
provides:
  - ExerciseRepository with full CRUD, search, filter, pagination, soft delete, and count methods
  - Typed Exercise objects with JSON-serialized secondary muscle groups
key_files:
  - apps/mobile/src/lib/db/repositories/exercise.ts
  - apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts
key_decisions:
  - Repository as plain object (not class) — matches functional patterns in the codebase, avoids `this` binding issues
  - is_custom defaults to true on create (user-created exercises), false only when explicitly set (for seeded exercises)
  - Update validates id as UUID via Zod — callers must pass valid UUIDs, non-existent but valid UUIDs return null
patterns_established:
  - Repository pattern — object with async methods, each calling getDb() internally, Zod validation on mutations, row-to-domain mapping function for type conversion
  - JSON serialization for array fields — stringify on write, parse on read with null/empty fallback
  - Dynamic WHERE clause building — conditions array + params array, joined with AND
observability_surfaces:
  - ExerciseRepository.getAll() returns full exercise list for state inspection
  - ExerciseRepository.getCount() for quick counts with optional filters
  - Zod validation errors include field-level details on create/update rejection
  - Database errors propagate with SQL context from database.ts
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Build ExerciseRepository with full CRUD and tests

**Built ExerciseRepository with 10 typed methods (getAll, getById, search, filterByMuscleGroup, filterByEquipment, combinedFilter, create, update, softDelete, getCount) and 49 comprehensive tests.**

## What Happened

Implemented `ExerciseRepository` in `apps/mobile/src/lib/db/repositories/exercise.ts` as a plain object with all methods specified in the task plan. Each method calls `getDb()` internally ensuring the database is initialized before any query. Key implementation details:

- **Row mapping**: SQLite stores booleans as 0/1 and secondary muscle groups as JSON strings. A `rowToExercise()` function converts raw rows to typed `Exercise` objects with proper boolean conversion and JSON parsing.
- **Create**: Validates input with `exerciseInsertSchema.parse()`, generates UUID via `crypto.randomUUID()`, sets timestamps, serializes secondary muscle groups as JSON, defaults `is_custom` to 1 (true).
- **Update**: Builds SET clause dynamically from only the provided fields, always updates `updated_at`. Validates with `exerciseUpdateSchema` which requires `id` to be a valid UUID.
- **Soft delete filtering**: All read methods include `WHERE deleted_at IS NULL`.
- **Combined filter**: Builds WHERE clause dynamically from optional search, muscleGroup, and equipment params.

Tests cover: full CRUD lifecycle, JSON serialization round-trip, search (exact/partial/case-insensitive/no-match), filter by muscle group, filter by equipment, combined filters (2-way and 3-way), pagination (limit/offset), validation rejection (empty name, invalid enums, max length), soft delete hiding from all read methods, getCount with/without filters, empty database edge cases, duplicate name handling.

## Verification

- `pnpm --filter mobile test -- --run` — **62 tests pass** (13 database + 49 repository)
- Slice-level checks:
  - ✅ `apps/mobile/src/lib/db/__tests__/database.test.ts` — 13 tests pass
  - ✅ `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — 49 tests pass (CRUD, search, filter, soft delete — seed data tests will come in T03)
  - ⬜ Dev server exercise UI — not yet built (T04)

## Diagnostics

- Call `ExerciseRepository.getAll()` to see all exercises
- Call `ExerciseRepository.getCount()` for quick counts (with optional muscleGroup/equipment filters)
- Zod validation errors on `create()`/`update()` include field-level details (path, code, message)
- Database errors propagate with SQL context from `database.ts`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/db/repositories/exercise.ts` — ExerciseRepository with 10 methods: getAll, getById, search, filterByMuscleGroup, filterByEquipment, combinedFilter, create, update, softDelete, getCount
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — 49 tests covering CRUD, search, filter, combined filter, pagination, validation, soft delete, count, edge cases
