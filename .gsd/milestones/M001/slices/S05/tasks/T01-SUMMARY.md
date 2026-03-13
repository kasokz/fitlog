---
id: T01
parent: S05
milestone: M001
provides:
  - ExerciseRepository.getByName() exact-match query method
  - ProgramTemplate type definition with nested day/exercise/mesocycle types
  - PPL template (6 days, 31 exercises)
  - Upper/Lower template (4 days, 23 exercises)
  - Full Body template (3 days, 20 exercises)
  - PROGRAM_TEMPLATES registry array
  - Template data integrity test suite (12 tests)
  - getByName test suite (6 tests)
  - createProgramFromTemplate test suite (7 tests, expected to fail until T02)
key_files:
  - apps/mobile/src/lib/db/repositories/exercise.ts
  - apps/mobile/src/lib/data/templates/types.ts
  - apps/mobile/src/lib/data/templates/ppl.ts
  - apps/mobile/src/lib/data/templates/upper-lower.ts
  - apps/mobile/src/lib/data/templates/full-body.ts
  - apps/mobile/src/lib/data/templates/index.ts
  - apps/mobile/src/lib/db/__tests__/template-service.test.ts
key_decisions:
  - Templates are pure data objects (no DB access) — exercise names are strings resolved at creation time via getByName()
  - PROGRAM_TEMPLATES array ordered by training frequency ascending (Full Body 3d → Upper/Lower 4d → PPL 6d)
  - MesocycleDefaults embedded in each template with weeksCount and deloadWeekNumber
  - createProgramFromTemplate tests use dynamic import to defer the module-not-found error to runtime (not top-level)
patterns_established:
  - Template data files export typed ProgramTemplate constants, validated against SEED_EXERCISES in tests
  - getByName uses exact SQL equality (=), not LIKE — case-sensitive, no partial matches
observability_surfaces:
  - none
duration: 25m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Add getByName to ExerciseRepository, define program templates, and write template service tests

**Added ExerciseRepository.getByName() exact-match method, defined 3 program templates (PPL/Upper-Lower/Full Body) with 74 total exercise references validated against SEED_EXERCISES, and wrote 25 tests (18 passing, 7 expected-fail for unimplemented service).**

## What Happened

1. Added `getByName(name: string)` to ExerciseRepository — uses `SELECT * FROM exercises WHERE name = ? AND deleted_at IS NULL LIMIT 1` for exact matching. No LIKE, no case folding.

2. Created `src/lib/data/templates/types.ts` with `ProgramTemplate`, `TemplateDayDefinition`, `TemplateExerciseDefinition`, and `MesocycleDefaults` interfaces.

3. Created three template data files:
   - `ppl.ts` — 6 days (Push A/B, Pull A/B, Legs A/B), 31 total exercise slots
   - `upper-lower.ts` — 4 days (Upper A/B, Lower A/B), 23 total exercise slots
   - `full-body.ts` — 3 days (Full Body A/B/C), 20 total exercise slots

4. Created `index.ts` registry exporting `PROGRAM_TEMPLATES` array and all individual templates.

5. Wrote comprehensive test file with 3 describe blocks:
   - **template data integrity** (12 tests) — validates all exercise names exist in SEED_EXERCISES, correct day counts, exercise-per-day ranges, no duplicates, valid rep ranges, valid mesocycle defaults
   - **ExerciseRepository.getByName** (6 tests) — exact match, partial returns null, nonexistent returns null, soft-deleted returns null, case-sensitive, resolves all seed names
   - **createProgramFromTemplate** (7 tests) — program name/description, day count, exercise assignments with sets/reps, mesocycle defaults, exercise ID resolution, sort orders. These correctly fail with "Cannot find module" since the service is T02's scope.

## Verification

- `pnpm --filter mobile test -- --grep "getByName"` — 6/6 pass ✓
- `pnpm --filter mobile test -- --grep "template data integrity"` — 12/12 pass ✓
- `pnpm --filter mobile test -- --grep "createProgramFromTemplate"` — 7/7 fail as expected (service module not yet created) ✓
- `pnpm --filter mobile test -- --grep "template"` — 18 pass, 7 expected-fail ✓

### Slice-level verification (partial — T01 is first task):
- `pnpm --filter mobile test -- --grep "template"` — ✓ template data integrity + getByName pass; service tests expected to fail
- `pnpm --filter mobile test -- --grep "onboarding"` — not yet applicable (T02)
- `pnpm --filter mobile build` — not yet run (no route changes in T01)

## Diagnostics

None — this task is pure data definitions and a repository method. No runtime boundaries or async flows added.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/db/repositories/exercise.ts` — added `getByName()` exact-match method
- `apps/mobile/src/lib/data/templates/types.ts` — new: ProgramTemplate type definitions
- `apps/mobile/src/lib/data/templates/ppl.ts` — new: Push/Pull/Legs 6-day template
- `apps/mobile/src/lib/data/templates/upper-lower.ts` — new: Upper/Lower 4-day template
- `apps/mobile/src/lib/data/templates/full-body.ts` — new: Full Body 3-day template
- `apps/mobile/src/lib/data/templates/index.ts` — new: template registry exporting PROGRAM_TEMPLATES
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — new: 25 tests (18 pass, 7 expected-fail)
