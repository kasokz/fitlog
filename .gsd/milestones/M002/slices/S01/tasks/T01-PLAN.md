---
estimated_steps: 5
estimated_files: 5
---

# T01: Define analytics types and schema v5 index

**Slice:** S01 — Analytics Computation Engine & Schema
**Milestone:** M002

## Description

Create the shared analytics types that form the contract for S02–S05, add the schema v5 composite index for analytics query performance, and scaffold skeleton test files for all analytics modules. This is the zero-dependency foundation — everything else in S01 builds on these types and the indexed schema.

## Steps

1. Create `apps/mobile/src/lib/types/analytics.ts` with all shared types:
   - `AnalyticsDateRange` — `{ start: string; end: string }` (YYYY-MM-DD strings)
   - `StrengthDataPoint` — `{ date: string; estimatedOneRM: number; weight: number; reps: number }` (for strength curve charts)
   - `VolumeDataPoint` — `{ date: string; totalVolume: number; setCount: number }` (for volume trend charts)
   - `PR` — `{ id: UUID; exercise_id: UUID; type: 'weight_pr' | 'rep_pr' | 'e1rm_pr'; value: number; weight: number; reps: number; date: string; session_id: UUID }` (PR record)
   - `ProgressionSuggestion` — `{ exercise_id: UUID; suggested_weight: number; increment_kg: number; current_weight: number; reason: string; sessions_analyzed: number; avg_rir: number }` (suggestion output)
   - `DeloadSet` — `{ exercise_id: UUID; set_number: number; set_type: SetType; weight: number | null; reps: number | null; original_weight: number | null }` (deloaded set)
   - `ProgressionThresholds` — `{ minSessions: number; minAvgRir: number; minWorkingSetsPerSession: number }` (configurable constants)
   - `WeightIncrement` — record mapping `Equipment` to kg increment values
2. Add the composite analytics index to `apps/mobile/src/lib/db/schema.sql`:
   - `CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_completed ON workout_sets(exercise_id, set_type, completed) WHERE deleted_at IS NULL;`
   - Update the comment at top from "schema v4" to "schema v5"
3. Bump `CURRENT_SCHEMA_VERSION` from 4 to 5 in `apps/mobile/src/lib/db/database.ts`
4. Create empty skeleton test files (with a single placeholder `describe` + `it.todo`) for:
   - `apps/mobile/src/lib/db/__tests__/analytics-repository.test.ts`
   - `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts`
   - `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts`
   - `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts`
   - `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts`
   - `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts`
5. Verify the build succeeds and types are importable with `pnpm run build`

## Must-Haves

- [ ] All 8 type definitions in `analytics.ts` are complete with correct field types
- [ ] `PR.type` uses literal union `'weight_pr' | 'rep_pr' | 'e1rm_pr'` (not a generic string)
- [ ] `DeloadSet` references `SetType` from existing workout types (import, not duplicate)
- [ ] Schema v5 index uses partial index syntax (`WHERE deleted_at IS NULL`)
- [ ] `CURRENT_SCHEMA_VERSION` is 5
- [ ] All 6 skeleton test files exist and are parseable by Vitest

## Verification

- `cd apps/mobile && pnpm run build` succeeds with no TypeScript errors
- `cd apps/mobile && pnpm test -- --run` passes (skeleton tests with `it.todo` don't fail)
- Types can be imported: `import type { PR, VolumeDataPoint, ProgressionSuggestion } from '$lib/types/analytics.js'` compiles

## Observability Impact

- Signals added/changed: None — types and schema are static definitions
- How a future agent inspects this: Check `analytics.ts` exports for type contract; check schema.sql for index presence; check database.ts for version number
- Failure state exposed: Build failure on type mismatch; migration failure if index DDL is malformed

## Inputs

- `apps/mobile/src/lib/types/workout.ts` — `SetType` enum to import for `DeloadSet`
- `apps/mobile/src/lib/types/exercise.ts` — `Equipment` enum for `WeightIncrement` mapping
- `apps/mobile/src/lib/types/common.ts` — `UUID` type alias
- `apps/mobile/src/lib/db/schema.sql` — existing schema v4 to extend
- `apps/mobile/src/lib/db/database.ts` — `CURRENT_SCHEMA_VERSION` constant to bump
- S01-RESEARCH.md — type definitions, index design, constraints

## Expected Output

- `apps/mobile/src/lib/types/analytics.ts` — all shared analytics types, importable by S02–S05
- `apps/mobile/src/lib/db/schema.sql` — schema v5 with analytics composite index
- `apps/mobile/src/lib/db/database.ts` — version bumped to 5
- 6 skeleton test files in place, ready for T02–T05 to populate with real tests
