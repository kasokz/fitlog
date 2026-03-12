---
id: T03
parent: S01
milestone: M001
provides:
  - 55 curated exercises covering all 12 muscle groups and all 8 equipment types
  - seedExercises() function with transactional bulk insert
  - Auto-seeding wired into database initialization (seeds only on first launch)
key_files:
  - apps/mobile/src/lib/db/seed/exercises.ts
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts
key_decisions:
  - Transaction via beginTransaction/commitTransaction loop instead of executeBatch — the Capacitor plugin does not expose a batch API
  - 55 exercises instead of ~60 — covers all enum values with good variety; added kettlebell and band exercises for full equipment coverage
  - CRUD tests clear seeded data in beforeEach to maintain isolation from auto-seeding
patterns_established:
  - Seed-on-first-open — check COUNT(*) after schema migration, seed if empty, skip silently if table has data
  - Seed data as typed array + seeding function co-located in src/lib/db/seed/
observability_surfaces:
  - "Console log `[DB] Seeding 55 exercises` and `[DB] Seeding complete — 55 exercises inserted` when seed runs"
  - Seed failures throw with `[DB] Seed failed, transaction rolled back: <detail>` and rollback the transaction
  - ExerciseRepository.getAll() / getCount() for runtime inspection of seeded state
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Create curated exercise seed data and seeding mechanism

**Built 55 curated exercises with transactional seeding wired into database init — all 12 muscle groups and 8 equipment types covered, 70 tests passing.**

## What Happened

Created `apps/mobile/src/lib/db/seed/exercises.ts` with 55 curated exercises organized by muscle group: Chest (6), Back (8), Shoulders (8 including 2 band exercises), Biceps (4), Triceps (4), Quadriceps (7 including kettlebell goblet squat), Hamstrings (4), Glutes (4), Calves (2), Abs (4), Forearms (2), Full Body (3 including kettlebell swing). All exercises have English names, 1-2 sentence movement cue descriptions, primary and secondary muscle groups, equipment type, and compound/isolation flag.

The `seedExercises()` function uses `beginTransaction` / individual `execute` calls / `commitTransaction` for atomicity. The Capacitor plugin does not expose a batch execute API, so individual inserts within a transaction is the correct approach. On failure, the transaction is rolled back.

Wired seeding into `database.ts` via a `seedIfEmpty()` function called after schema migration in `initializeConnection()`. It checks `SELECT COUNT(*) FROM exercises` and only seeds when the table is empty, so it runs on first launch but never re-seeds over user data.

Updated the test file to import `SEED_EXERCISES` and added 8 seed verification tests. Existing CRUD tests were updated with a `clearAllExercises()` helper in `beforeEach` to maintain test isolation — without this, seeded data would interfere with hardcoded count assertions.

## Verification

- `pnpm --filter mobile test -- --run` — 70 tests pass (2 test files)
- Seed test confirms: exercise count = 55 (≥ 55 threshold met)
- All 12 MuscleGroup values have at least one exercise
- All 8 Equipment values have at least one exercise (including kettlebell, band, other)
- All exercises have descriptions, is_custom = false, secondary_muscle_groups parsed as arrays
- Mix verified: ≥15 compound and ≥15 isolation exercises
- No re-seeding on subsequent init confirmed by test

## Diagnostics

- `ExerciseRepository.getAll()` returns all 55 seeded exercises
- `ExerciseRepository.getCount()` returns 55
- Console: `[DB] Seeding 55 exercises` on first init, silent skip on subsequent inits
- Seed failures: thrown error with `[DB] Seed failed, transaction rolled back: <msg>`, partial inserts rolled back

## Deviations

- Used `beginTransaction` + loop of `execute` calls instead of `executeBatch()` — the plan specified `executeBatch()` but the Capacitor plugin only exposes `execute()`, `beginTransaction()`, `commitTransaction()`, and `rollbackTransaction()`. Same performance characteristic (single transaction).
- 55 exercises instead of ~60 — still exceeds the ≥55 threshold and covers all enum values.
- Added `clearAllExercises()` helper to existing test `beforeEach` — necessary to prevent seed data from breaking existing hardcoded assertions.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/db/seed/exercises.ts` — 55 curated exercises and `seedExercises()` transactional insert function
- `apps/mobile/src/lib/db/database.ts` — added `seedIfEmpty()` call after schema migration, imports seed module
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — added 8 seed verification tests, `clearAllExercises()` helper, imports for SEED_EXERCISES/MUSCLE_GROUPS/EQUIPMENT_LIST
