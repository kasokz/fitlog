---
id: T01
parent: S01
milestone: M002
provides:
  - shared analytics types contract (8 types in analytics.ts)
  - schema v5 composite index for analytics query performance
  - 6 skeleton test files for analytics modules
key_files:
  - apps/mobile/src/lib/types/analytics.ts
  - apps/mobile/src/lib/db/schema.sql
  - apps/mobile/src/lib/db/database.ts
key_decisions:
  - WeightIncrement defined as Record<Equipment, number> for exhaustive mapping
  - DeloadSet imports SetType from workout.ts rather than duplicating
  - Analytics types are output-only (no Zod schemas) since they're computed, not user-input
patterns_established:
  - Analytics types live in src/lib/types/analytics.ts as the single contract for S02–S05
  - Skeleton test files use describe + it.todo pattern for Vitest compatibility
observability_surfaces:
  - none (static type and schema definitions)
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Define analytics types and schema v5 index

**Created 8 shared analytics types, added schema v5 composite index, bumped version to 5, and scaffolded 6 skeleton test files.**

## What Happened

Created `apps/mobile/src/lib/types/analytics.ts` with all 8 type definitions: `AnalyticsDateRange`, `StrengthDataPoint`, `VolumeDataPoint`, `PR` (with literal union type), `ProgressionSuggestion`, `ProgressionThresholds`, `DeloadSet` (importing `SetType` from workout.ts), and `WeightIncrement` (as `Record<Equipment, number>`).

Added the composite analytics index `idx_workout_sets_exercise_completed` on `workout_sets(exercise_id, set_type, completed) WHERE deleted_at IS NULL` to schema.sql, updated the schema version comment from v4 to v5, and bumped `CURRENT_SCHEMA_VERSION` from 4 to 5 in database.ts.

Created 6 skeleton test files with `describe` + `it.todo` stubs covering the expected test scenarios for each analytics module.

Updated existing database.test.ts assertions from version 4 to 5 to match the version bump.

## Verification

- `cd apps/mobile && pnpm run build` — succeeded with no TypeScript errors
- `cd apps/mobile && pnpm test -- --run` — 211 passed, 32 todo, 0 failed
- Schema v5 index confirmed present in schema.sql with correct partial index syntax
- `CURRENT_SCHEMA_VERSION` confirmed as 5 in database.ts
- All 6 skeleton test files parse and run as todos without failure

### Slice-level verification (T01 scope):
- `analytics-repository.test.ts` — ✅ runs (5 todos, skeleton only)
- `oneRepMax.test.ts` — ✅ runs (5 todos, skeleton only)
- `prDetector.test.ts` — ✅ runs (6 todos, skeleton only)
- `volumeAggregator.test.ts` — ✅ runs (5 todos, skeleton only)
- `progressionAdvisor.test.ts` — ✅ runs (6 todos, skeleton only)
- `deloadCalculator.test.ts` — ✅ runs (5 todos, skeleton only)
- Full test suite — ✅ no regressions

## Diagnostics

Check `analytics.ts` exports for type contract. Check schema.sql for `idx_workout_sets_exercise_completed` index presence. Check database.ts for `CURRENT_SCHEMA_VERSION = 5`.

## Deviations

Updated `database.test.ts` assertions from version 4 to 5 — required by the version bump but not explicitly listed in the task plan.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/types/analytics.ts` — new: 8 shared analytics type definitions
- `apps/mobile/src/lib/db/schema.sql` — modified: added composite analytics index, updated version comment to v5
- `apps/mobile/src/lib/db/database.ts` — modified: bumped CURRENT_SCHEMA_VERSION from 4 to 5
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — modified: updated version assertions from 4 to 5
- `apps/mobile/src/lib/db/__tests__/analytics-repository.test.ts` — new: skeleton test file
- `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts` — new: skeleton test file
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` — new: skeleton test file
- `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — new: skeleton test file
- `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — new: skeleton test file
- `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — new: skeleton test file
