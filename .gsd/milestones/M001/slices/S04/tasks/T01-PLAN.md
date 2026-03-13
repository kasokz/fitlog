---
estimated_steps: 5
estimated_files: 5
---

# T01: Body weight data layer — types, schema v4, repository, and tests

**Slice:** S04 — Workout History & Body Weight
**Milestone:** M001

## Description

Create the complete body weight data layer: TypeScript types with Zod v4 schemas, SQLite schema migration to v4 with a new `body_weight_entries` table, a BodyWeightRepository following the established repository pattern, and comprehensive Vitest tests. The table enforces one entry per date via UNIQUE constraint, and the repository uses INSERT OR REPLACE for upsert behavior.

## Steps

1. Create `src/lib/types/bodyweight.ts` with:
   - `BodyWeightEntry` interface extending `SoftDeletable` (id: UUID, date: string YYYY-MM-DD, weight_kg: number, plus SoftDeletable fields)
   - `bodyWeightInsertSchema` using zod4 syntax: `z.object({ date: z.string(), weight_kg: z.number().min(20).max(500) })`
   - Export types and schemas

2. Update `src/lib/db/schema.sql` — add `body_weight_entries` table at the end:
   - `id TEXT PRIMARY KEY`, `date TEXT NOT NULL UNIQUE`, `weight_kg REAL NOT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`, `deleted_at TEXT`
   - Add index on `date`
   - Update header comment to say "v4"

3. Update `src/lib/db/database.ts` — bump `CURRENT_SCHEMA_VERSION` from 3 to 4.

4. Create `src/lib/db/repositories/bodyweight.ts` following ExerciseRepository pattern:
   - Row type → model mapping function
   - `log(date, weightKg)` — INSERT OR REPLACE (upsert) using the date UNIQUE constraint. On conflict, update weight_kg and updated_at. Uses soft-delete aware approach: only replaces non-deleted entries.
   - `getAll(limit=50, offset=0)` — SELECT with pagination, ORDER BY date DESC, WHERE deleted_at IS NULL
   - `getRange(startDate, endDate)` — SELECT WHERE date BETWEEN, deleted_at IS NULL, ORDER BY date ASC
   - `deleteEntry(id)` — soft-delete (SET deleted_at = now)
   - Structured logging with `[BodyWeight]` prefix

5. Create `src/lib/db/__tests__/bodyweight-repository.test.ts` with tests:
   - log creates a new entry with correct fields
   - log on same date updates existing entry (upsert)
   - getAll returns entries in descending date order
   - getAll respects limit/offset pagination
   - getRange returns entries within date range only
   - getRange returns entries in ascending date order
   - deleteEntry soft-deletes the entry
   - soft-deleted entries excluded from getAll and getRange
   - log after soft-delete creates a new entry (does not resurrect deleted)

## Must-Haves

- [ ] BodyWeightEntry type with SoftDeletable fields and Zod v4 insert schema
- [ ] body_weight_entries table in schema.sql with UNIQUE(date) constraint
- [ ] CURRENT_SCHEMA_VERSION bumped to 4
- [ ] BodyWeightRepository with log (upsert), getAll (paginated), getRange, deleteEntry (soft-delete)
- [ ] All Vitest tests pass

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` — all tests pass
- `pnpm --filter mobile build` — no type errors from new files

## Observability Impact

- Signals added/changed: `[BodyWeight]` prefixed console.log entries for log, delete operations (matches existing `[Workout]` and `[Exercise]` patterns)
- How a future agent inspects this: Query `body_weight_entries` table directly, or call `BodyWeightRepository.getAll()` from console
- Failure state exposed: Repository methods throw with `[BodyWeightRepository]` prefix on constraint violations or unexpected states

## Inputs

- `src/lib/types/common.ts` — UUID, SoftDeletable types
- `src/lib/db/database.ts` — dbQuery, dbExecute, migration system
- `src/lib/db/__tests__/test-helpers.ts` — sql.js mock setup for Vitest
- `src/lib/db/repositories/exercise.ts` — pattern reference for repository structure
- `src/lib/db/__tests__/exercise-repository.test.ts` — pattern reference for test structure

## Expected Output

- `src/lib/types/bodyweight.ts` — BodyWeightEntry interface + Zod schemas
- `src/lib/db/schema.sql` — v4 schema with body_weight_entries table
- `src/lib/db/database.ts` — CURRENT_SCHEMA_VERSION = 4
- `src/lib/db/repositories/bodyweight.ts` — complete BodyWeightRepository
- `src/lib/db/__tests__/bodyweight-repository.test.ts` — passing test suite
