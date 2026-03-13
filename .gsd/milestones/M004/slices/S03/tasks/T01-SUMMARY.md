---
id: T01
parent: S03
milestone: M004
provides:
  - Export service with generateWorkoutCSV, generateBodyWeightCSV, generateFullJSON
  - RFC 4180 CSV escaping helpers (escapeCSV, formatCSVRow)
  - Comprehensive test suite (33 tests) for export functionality
key_files:
  - apps/mobile/src/lib/services/export.ts
  - apps/mobile/src/lib/db/__tests__/export.test.ts
key_decisions:
  - Workout CSV uses LEFT JOIN on exercises, programs, training_days with deleted_at IS NULL checks on joined tables — deleted exercises show as "Unknown Exercise" rather than omitting the set row
  - JSON export queries all 8 tables in parallel via Promise.all for performance, then assembles nested structure in-memory
  - JSON export includes exercise_name directly in sets and assignments for self-containment (no need to cross-reference exercise IDs)
patterns_established:
  - Export service pattern — pure async functions that query via dbQuery and return formatted strings, no side effects
  - Test seeding pattern for multi-table data — explicit INSERT statements with fixed IDs for deterministic assertions
observability_surfaces:
  - none
duration: 25m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Build export service with CSV/JSON generation and tests

**Implemented complete export service producing denormalized workout CSV, body weight CSV, and nested JSON — all with soft-delete filtering, RFC 4180 escaping, and 33 passing tests.**

## What Happened

Created `export.ts` with four exported functions:
- `escapeCSV(value)` — RFC 4180 compliant: handles commas, double quotes (doubled), newlines, null/undefined
- `formatCSVRow(values)` — joins escaped values with comma delimiter + trailing newline
- `generateWorkoutCSV()` — denormalized SQL joining sessions → sets → exercises/programs/training_days with LEFT JOINs. Filters completed sessions only, excludes soft-deleted rows. Orders by date DESC, set number ASC.
- `generateBodyWeightCSV()` — simple two-column CSV from body_weight_entries, date DESC
- `generateFullJSON()` — parallel queries on all 8 entity tables, assembles nested structure (programs → training_days → assignments, sessions → sets) with `exported_at` timestamp and `version: 1`

Test suite seeds realistic multi-table data (2 exercises, 1 program, 1 training day, 2 assignments, 1 mesocycle, 2 sessions with 3 sets each, 2 body weight entries) plus soft-deleted variants of each entity type and an in-progress session.

## Verification

- `pnpm -F mobile test -- apps/mobile/src/lib/db/__tests__/export.test.ts --run` — **33 tests pass**
- Full suite: **516 tests pass** (no regressions)
- CSV header format verified: `Date,Program,Training Day,Exercise,Set #,Set Type,Weight (kg),Reps,RIR,Completed`
- Soft-delete exclusion verified across all three generators
- Empty database edge case verified (header-only CSV, empty-arrays JSON)
- Special characters in exercise names (commas, quotes) verified in both CSV and JSON output

### Slice-level verification
- `pnpm -F mobile test -- --grep "export"` — **passes** (export service tests included in full run)
- Manual Settings page verification — not applicable yet (T02 adds UI)

## Diagnostics

None — pure functions with no runtime state. Test failures would surface via assertion messages showing expected vs actual CSV/JSON content.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/export.ts` — Export service with 3 generator functions + CSV escape helpers
- `apps/mobile/src/lib/db/__tests__/export.test.ts` — 33-test suite covering escapeCSV, formatCSVRow, workout CSV, body weight CSV, and full JSON export with edge cases
