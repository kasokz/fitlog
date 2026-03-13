---
estimated_steps: 5
estimated_files: 3
---

# T01: Build export service with CSV/JSON generation and tests

**Slice:** S03 — Data Export (CSV/JSON)
**Milestone:** M004

## Description

Implement the core export service as pure async functions that query SQLite and produce formatted strings. The workout CSV denormalizes sessions/sets/exercises into a single spreadsheet-ready format. Body weight CSV is a simple two-column file. JSON export produces a nested, self-contained structure with all user data including exercise metadata. All functions filter soft-deleted rows. CSV escaping follows RFC 4180. Tests use the existing sql.js mock infrastructure with realistic multi-table seed data.

## Steps

1. Create `apps/mobile/src/lib/services/export.ts` with:
   - `escapeCSV(value)` helper — handles commas, double quotes, newlines per RFC 4180
   - `formatCSVRow(values)` — joins escaped values with commas + newline
   - `generateWorkoutCSV()` — denormalized SQL query joining `workout_sessions`, `workout_sets`, `exercises` (LEFT JOIN for deleted exercises → "Unknown Exercise"), `programs`, `training_days`. Filters: `deleted_at IS NULL` on all tables, `status = 'completed'` on sessions. Orders by date DESC, then set number. Returns CSV string with header row.
   - `generateBodyWeightCSV()` — simple query on `body_weight_entries WHERE deleted_at IS NULL`, ordered by date DESC. Returns CSV string with header row.
   - `generateFullJSON()` — queries each table (exercises, programs, training_days, exercise_assignments, mesocycles, workout_sessions, workout_sets, body_weight_entries), assembles nested structure with `exported_at` timestamp and `version: 1`. Programs nest their training_days which nest their assignments. Sessions nest their sets. Returns JSON string via `JSON.stringify(data, null, 2)`.

2. Create `apps/mobile/src/lib/db/__tests__/export.test.ts` with test setup:
   - Use `setupMockDatabase()` + dynamic imports pattern from existing tests
   - Seed helper that creates realistic data: 2 exercises, 1 program with 1 training day + 2 assignments, 1 mesocycle, 2 completed sessions with 3 sets each, 2 body weight entries
   - Also seed soft-deleted variants of each entity type to verify exclusion

3. Write test cases for `generateWorkoutCSV()`:
   - Correct header row
   - Correct number of data rows (only from completed sessions, only non-deleted sets)
   - Soft-deleted sessions/sets excluded
   - Date, program name, training day name, exercise name all correctly denormalized
   - Empty database returns header-only CSV

4. Write test cases for `generateBodyWeightCSV()`:
   - Correct header and data rows
   - Soft-deleted entries excluded
   - Empty database returns header-only CSV

5. Write test cases for `generateFullJSON()`:
   - Parses as valid JSON
   - Contains `exported_at` and `version` fields
   - Contains all expected top-level keys (exercises, programs, workout_sessions, body_weight_entries, etc.)
   - Soft-deleted rows excluded from all arrays
   - Programs contain nested training_days with nested assignments
   - Sessions contain nested sets
   - Empty database returns valid JSON with empty arrays
   - Exercise with special characters (commas, quotes) in name is correctly represented

## Must-Haves

- [ ] `escapeCSV` correctly handles: plain text, text with commas, text with double quotes (doubled), text with newlines, null/undefined → empty string
- [ ] Workout CSV uses LEFT JOIN on exercises so deleted exercises show as fallback name
- [ ] All queries filter `WHERE deleted_at IS NULL`
- [ ] Workout CSV only includes completed sessions (`status = 'completed'`)
- [ ] JSON export is self-contained (includes exercise names, not just IDs)
- [ ] Empty database produces valid output (header-only CSV, empty-arrays JSON)

## Verification

- `pnpm -F @repo/mobile test -- --grep "export"` — all tests pass
- Manually inspect CSV output format matches the spec from research (Date, Program, Training Day, Exercise, Set #, Set Type, Weight (kg), Reps, RIR, Completed)

## Inputs

- `apps/mobile/src/lib/db/database.ts` — `dbQuery<T>()` for all SQL reads
- `apps/mobile/src/lib/db/schema.sql` — table structure for query design
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock setup pattern
- `apps/mobile/src/lib/db/__tests__/bodyweight-repository.test.ts` — reference for test structure

## Expected Output

- `apps/mobile/src/lib/services/export.ts` — complete export service with 3 generator functions + CSV escape helper
- `apps/mobile/src/lib/db/__tests__/export.test.ts` — comprehensive test suite covering happy path, edge cases, and soft-delete exclusion
