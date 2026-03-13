---
id: T01
parent: S04
milestone: M001
provides:
  - BodyWeightEntry type with Zod v4 insert schema
  - body_weight_entries SQLite table (schema v4)
  - BodyWeightRepository with log (upsert), getAll, getRange, deleteEntry
  - Comprehensive Vitest test suite (16 tests)
key_files:
  - apps/mobile/src/lib/types/bodyweight.ts
  - apps/mobile/src/lib/db/schema.sql
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/db/repositories/bodyweight.ts
  - apps/mobile/src/lib/db/__tests__/bodyweight-repository.test.ts
key_decisions:
  - Used partial unique index (WHERE deleted_at IS NULL) instead of table-level UNIQUE(date) to allow soft-deleted entries to coexist with new entries for the same date
  - Repository uses SELECT + conditional INSERT/UPDATE instead of INSERT OR REPLACE to properly handle soft-delete semantics
patterns_established:
  - Body weight repository follows ExerciseRepository pattern (row mapping, structured logging, soft-delete)
  - Partial unique index pattern for soft-deletable tables with uniqueness constraints
observability_surfaces:
  - "[BodyWeight]" prefixed console.log for log and delete operations
  - "[BodyWeightRepository]" prefixed errors for constraint violations
duration: 20m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Body weight data layer — types, schema v4, repository, and tests

**Created complete body weight data layer: types, Zod schema, SQLite table with partial unique index, repository with upsert/pagination/range queries, and 16 passing tests.**

## What Happened

Implemented the full body weight data layer in 5 files:

1. **Types** (`bodyweight.ts`): `BodyWeightEntry` interface extending `SoftDeletable` with id, date (YYYY-MM-DD), weight_kg. `bodyWeightInsertSchema` using Zod v4 with min(20)/max(500) validation.

2. **Schema v4** (`schema.sql`): Added `body_weight_entries` table with a **partial unique index** (`WHERE deleted_at IS NULL`) instead of a table-level UNIQUE constraint. This allows soft-deleted entries to coexist with new entries for the same date — critical for the "log after soft-delete creates new entry" behavior.

3. **Version bump** (`database.ts`): `CURRENT_SCHEMA_VERSION` 3 → 4. Updated existing `database.test.ts` assertions to expect version 4.

4. **Repository** (`bodyweight.ts`): `BodyWeightRepository` with:
   - `log(date, weightKg)` — SELECT-then-INSERT/UPDATE pattern for soft-delete-aware upsert
   - `getAll(limit, offset)` — paginated, ORDER BY date DESC
   - `getRange(startDate, endDate)` — inclusive BETWEEN, ORDER BY date ASC
   - `deleteEntry(id)` — soft-delete

5. **Tests** (`bodyweight-repository.test.ts`): 16 tests covering all CRUD operations, upsert behavior, pagination, range queries, soft-delete filtering, and the critical "log after soft-delete creates new entry" scenario.

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` — **171 tests pass** across all 5 test files (16 new bodyweight tests + all existing tests)
- `pnpm --filter mobile build` — **build succeeds** with no type errors

### Slice-level verification (partial — T01 is first task):
- ✅ `bodyweight-repository.test.ts` — all tests pass
- ⬜ `workout-repository.test.ts` — not yet extended (T02 scope)
- ✅ `pnpm --filter mobile build` — passes
- ⬜ `history_*` i18n keys — not yet added (T03 scope)
- ⬜ `bodyweight_*` i18n keys — not yet added (T04 scope)

## Diagnostics

- **Structured logs**: `[BodyWeight] Logged 82.5kg for 2025-06-15`, `[BodyWeight] Updated entry for ...`, `[BodyWeight] Soft-deleted entry ...`
- **Error prefix**: `[BodyWeightRepository]` on unexpected states
- **Direct inspection**: Query `body_weight_entries` table or call `BodyWeightRepository.getAll()` from console/debugger

## Deviations

- **Partial unique index instead of UNIQUE(date)**: The plan specified `UNIQUE(date)` table constraint, but this conflicts with soft-delete behavior — a soft-deleted row holds the date value, preventing INSERT of a new row for the same date. Used `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL` instead, which enforces uniqueness only among active rows.
- **SELECT + conditional INSERT/UPDATE instead of INSERT OR REPLACE**: The plan specified INSERT OR REPLACE, but this would hard-delete soft-deleted rows (SQLite replaces the entire row). The SELECT-first approach correctly leaves soft-deleted rows untouched.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/types/bodyweight.ts` — new: BodyWeightEntry interface + bodyWeightInsertSchema
- `apps/mobile/src/lib/db/schema.sql` — modified: v3→v4, added body_weight_entries table with partial unique index
- `apps/mobile/src/lib/db/database.ts` — modified: CURRENT_SCHEMA_VERSION 3→4
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — new: BodyWeightRepository with log/getAll/getRange/deleteEntry
- `apps/mobile/src/lib/db/__tests__/bodyweight-repository.test.ts` — new: 16 tests for BodyWeightRepository
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — modified: updated version assertions from 3 to 4
