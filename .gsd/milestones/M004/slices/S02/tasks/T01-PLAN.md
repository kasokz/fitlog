---
estimated_steps: 8
estimated_files: 10
---

# T01: Fix soft-delete updated_at + deterministic seed UUIDs + schema v6 migration

**Slice:** S02 — Sync Protocol + Two-Way Sync
**Milestone:** M004

## Description

Three prerequisite fixes before sync can work:

1. **Soft-delete must update `updated_at`** — Currently all 5 soft-delete UPDATE statements only set `deleted_at`, leaving `updated_at` stale. Sync uses `updated_at > last_sync` to find changed rows, so without this fix deletions never propagate. One-line change per statement.

2. **Deterministic UUID v5 for seed exercises** — Currently `seedExercises()` uses `crypto.randomUUID()`, producing different IDs per device. Sync requires identical IDs. Implement a zero-dependency UUID v5 generator using SubtleCrypto SHA-1, then change `seedExercises()` to use it.

3. **Schema v6 migration** — Existing databases have random UUIDs for seed exercises. Migration must: compute deterministic UUID for each seed exercise by name, update `exercises.id` where `is_custom = 0`, cascade the ID change to `exercise_assignments.exercise_id` and `workout_sets.exercise_id` FK references. Must run in a transaction. Requires refactoring `applySchema()` to support code-based migrations after SQL.

## Steps

1. Create `apps/mobile/src/lib/utils/uuid-v5.ts` — UUID v5 implementation using SubtleCrypto SHA-1 with the URL namespace UUID from RFC 4122. ~15 lines. Export `uuidv5(name: string): Promise<string>`. Test determinism: same name always produces same UUID.

2. Write `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — verify determinism (same input → same output), uniqueness (different inputs → different outputs), format (valid UUID v5 format), and that "Bench Press" produces a consistent known value.

3. Fix all 5 soft-delete statements to also set `updated_at`:
   - `bodyweight.ts`: `SET deleted_at = ?, updated_at = ?` (add `now` to params)
   - `exercise.ts`: same pattern
   - `program.ts`: 3 methods (deleteProgram, deleteTrainingDay, deleteExerciseAssignment) — same pattern each

4. Update `apps/mobile/src/lib/db/seed/exercises.ts` — change `crypto.randomUUID()` to `await uuidv5(exercise.name)`. Import from `uuid-v5.ts`. The `seedExercises()` function is already async.

5. Refactor `apps/mobile/src/lib/db/database.ts` migration system:
   - Keep `schema.sql` for the idempotent DDL (v1–v5 baseline)
   - After SQL execution, add a versioned migration runner: `if (currentVersion < 6) { await migrateV6(); }`
   - Bump `CURRENT_SCHEMA_VERSION` to 6
   - The v6 migration function: inside a transaction, for each seed exercise name from `SEED_EXERCISES`, compute `uuidv5(name)`, then `UPDATE exercises SET id = ? WHERE name = ? AND is_custom = 0`, then `UPDATE exercise_assignments SET exercise_id = ? WHERE exercise_id = (SELECT id...)` — actually simpler: read old ID first, then update references.

6. Implement `migrateV6()` in database.ts (or a separate `migrations/v6.ts` file):
   - Begin transaction
   - For each exercise in `SEED_EXERCISES`: compute `newId = await uuidv5(exercise.name)`
   - SELECT existing exercise: `SELECT id FROM exercises WHERE name = ? AND is_custom = 0 AND deleted_at IS NULL`
   - If exists and `oldId !== newId`: UPDATE `exercises SET id = ? WHERE id = ?`, UPDATE `exercise_assignments SET exercise_id = ? WHERE exercise_id = ?`, UPDATE `workout_sets SET exercise_id = ? WHERE exercise_id = ?`
   - Commit transaction
   - Handle case where exercise doesn't exist (user deleted it or fresh install)

7. Write `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — using the existing sql.js test helper:
   - Seed a few exercises with random UUIDs and `is_custom = 0`
   - Create exercise_assignments and workout_sets referencing those UUIDs
   - Run v6 migration
   - Verify exercises now have deterministic UUIDs
   - Verify FK references in assignments and sets are updated
   - Verify custom exercises (`is_custom = 1`) are NOT re-IDed

8. Run full test suite: `pnpm --filter mobile test` — all 454+ existing tests must pass. The soft-delete change adds `updated_at` to the UPDATE but doesn't change behavior. The seed UUID change affects new seeds only (tests create fresh DBs). The migration test validates the v6 path.

## Must-Haves

- [ ] All 5 soft-delete UPDATE statements set `updated_at` alongside `deleted_at`
- [ ] UUID v5 utility produces deterministic UUIDs from string names
- [ ] `seedExercises()` uses deterministic UUIDs instead of `crypto.randomUUID()`
- [ ] Schema v6 migration re-IDs seed exercises with deterministic UUIDs
- [ ] Schema v6 migration cascades ID changes to `exercise_assignments.exercise_id` and `workout_sets.exercise_id`
- [ ] Migration runs in a transaction — partial failure rolls back
- [ ] Custom exercises (`is_custom = 1`) are not touched by migration
- [ ] `CURRENT_SCHEMA_VERSION` bumped to 6
- [ ] All existing 454+ tests still pass

## Verification

- `pnpm --filter mobile test` — all tests pass (zero regressions)
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — determinism and format tests pass
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — FK cascade verified
- Manual: `grep -c 'updated_at = ?' apps/mobile/src/lib/db/repositories/*.ts` confirms all soft-delete statements updated
- Manual: `grep 'randomUUID' apps/mobile/src/lib/db/seed/exercises.ts` returns nothing

## Inputs

- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — soft-delete at line 127
- `apps/mobile/src/lib/db/repositories/exercise.ts` — soft-delete at line 272
- `apps/mobile/src/lib/db/repositories/program.ts` — soft-delete at lines 348, 441, 571
- `apps/mobile/src/lib/db/seed/exercises.ts` — `SEED_EXERCISES` array + `seedExercises()` function
- `apps/mobile/src/lib/db/database.ts` — `applySchema()`, `CURRENT_SCHEMA_VERSION = 5`
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock pattern for tests
- S02 research: UUID v5 using SubtleCrypto, namespace `6ba7b810-9dad-11d1-80b4-00c04fd430c8`

## Expected Output

- `apps/mobile/src/lib/utils/uuid-v5.ts` — UUID v5 utility (~15-20 lines)
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — 4-6 test cases
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — 3-5 test cases
- Modified: 3 repository files with `updated_at` fix (5 statements total)
- Modified: `seed/exercises.ts` using `uuidv5()` instead of `randomUUID()`
- Modified: `database.ts` with v6 migration support and version bump
