---
id: T01
parent: S02
milestone: M004
provides:
  - deterministic UUID v5 utility for sync-compatible IDs
  - soft-delete updated_at fix for all 5 repositories
  - schema v6 migration with FK cascade for seed exercise re-ID
  - code-based migration runner pattern in database.ts
key_files:
  - apps/mobile/src/lib/utils/uuid-v5.ts
  - apps/mobile/src/lib/db/migrations/v6-deterministic-exercise-ids.ts
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/db/seed/exercises.ts
key_decisions:
  - UUID v5 uses RFC 4122 URL namespace with SubtleCrypto SHA-1 (zero deps)
  - v6 migration lives in its own file under db/migrations/ for separation
  - Migration cascades via read-old-ID-then-update-references pattern (no FK constraints in schema)
patterns_established:
  - Code-based migrations run after SQL DDL in applySchema via versioned guards (if currentVersion < N)
  - Migration files export a single async function taking database name
observability_surfaces:
  - "[DB] Running v6 migration: deterministic exercise IDs" console log
  - "[DB] v6 migration complete — N exercise IDs updated" with count
  - "[DB] v6 migration failed, transaction rolled back: ..." on error
duration: 25min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Fix soft-delete updated_at + deterministic seed UUIDs + schema v6 migration

**All 5 soft-delete statements now update `updated_at`, seed exercises use deterministic UUID v5, and schema v6 migration re-IDs existing random UUIDs with FK cascade.**

## What Happened

Three changes shipped:

1. **Soft-delete `updated_at` fix** — All 5 UPDATE statements across `bodyweight.ts`, `exercise.ts`, and `program.ts` now set `updated_at = ?` alongside `deleted_at = ?`. This ensures sync's `updated_at > last_sync` query catches deletions.

2. **UUID v5 utility** — Created `uuid-v5.ts` using SubtleCrypto SHA-1 with the RFC 4122 URL namespace. ~40 lines, zero dependencies. `seedExercises()` now calls `await uuidv5(exercise.name)` instead of `crypto.randomUUID()`.

3. **Schema v6 migration** — New `migrations/v6-deterministic-exercise-ids.ts` runs inside a transaction. For each seed exercise: looks up old ID by name + `is_custom = 0`, computes deterministic ID, then cascades the change to `exercises.id`, `exercise_assignments.exercise_id`, and `workout_sets.exercise_id`. Skips exercises already correct or deleted. Custom exercises untouched. `database.ts` refactored with code-based migration guard: `if (currentVersion < 6) { await migrateV6(); }`.

## Verification

- `pnpm --filter mobile test run` — **465 tests pass**, zero failures
- `uuid-v5.test.ts` — 6 tests: determinism, uniqueness, format, pinned value, empty string, unicode
- `migration-v6.test.ts` — 5 tests: FK cascade, custom exercises untouched, idempotent skip, empty DB, rollback on error
- `pnpm --filter mobile build` — compiles cleanly
- `grep -c 'updated_at = ?' repositories/*.ts` — confirms all 5 soft-delete statements updated
- `grep 'randomUUID' seed/exercises.ts` — returns nothing
- `grep 'CURRENT_SCHEMA_VERSION' database.ts` — confirms value is 6

### Slice-level verification status (T01)

- [x] `pnpm --filter mobile test` — all tests pass (465)
- [ ] `pnpm --filter web test` — not yet applicable (no web changes in T01)
- [x] `pnpm --filter mobile build` — compiles cleanly
- [ ] `pnpm --filter web build` — not yet applicable
- [x] `uuid-v5.test.ts` — deterministic UUID generation verified
- [x] `migration-v6.test.ts` — seed exercise re-ID + FK cascade verified
- [ ] `push.test.ts` — not yet created (T02+)
- [ ] `pull.test.ts` — not yet created (T02+)
- [ ] `sync.test.ts` — not yet created (T02+)

## Diagnostics

- Migration logs `[DB] Running v6 migration...` and `[DB] v6 migration complete — N exercise IDs updated` to console
- On failure: `[DB] v6 migration failed, transaction rolled back: <error>` with rollback
- Schema version table records version 6 with timestamp after successful migration

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/utils/uuid-v5.ts` — new: UUID v5 generator using SubtleCrypto SHA-1
- `apps/mobile/src/lib/db/migrations/v6-deterministic-exercise-ids.ts` — new: v6 migration with FK cascade
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — new: 6 test cases for UUID v5
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — new: 5 test cases for v6 migration
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — soft-delete now sets `updated_at`
- `apps/mobile/src/lib/db/repositories/exercise.ts` — soft-delete now sets `updated_at`
- `apps/mobile/src/lib/db/repositories/program.ts` — 3 soft-delete methods now set `updated_at`
- `apps/mobile/src/lib/db/seed/exercises.ts` — uses `uuidv5()` instead of `crypto.randomUUID()`
- `apps/mobile/src/lib/db/database.ts` — version bumped to 6, code-based migration runner added
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — updated version expectations from 5 to 6
