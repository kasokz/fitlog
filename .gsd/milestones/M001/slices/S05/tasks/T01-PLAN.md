---
estimated_steps: 5
estimated_files: 8
---

# T01: Add getByName to ExerciseRepository, define program templates, and write template service tests

**Slice:** S05 — Onboarding & Program Templates
**Milestone:** M001

## Description

This task adds the `getByName()` exact-match method to ExerciseRepository, defines the three program template data structures (PPL, Upper/Lower, Full Body), and creates the test file that validates template data integrity and will later validate the template creation service. The template data files are pure data — no DB access — making them independently testable. Tests for the creation service are written here but expected to fail until T02 implements the service.

## Steps

1. **Add `getByName()` to ExerciseRepository** — Add a new method that does `SELECT * FROM exercises WHERE name = ? AND deleted_at IS NULL LIMIT 1`. Returns `Exercise | null`. This is an exact match (not LIKE) to avoid false positives like "Curl" matching "Barbell Curl".

2. **Define `ProgramTemplate` type** — Create `src/lib/data/templates/types.ts` with a `ProgramTemplate` interface: `{ id: string, name: string, description: string, days: TemplateDayDefinition[] }` where each day has `{ name: string, exercises: TemplateExerciseDefinition[] }` and each exercise has `{ name: string, targetSets: number, minReps: number, maxReps: number }`. Also define `MesocycleDefaults` with `weeksCount` and `deloadWeekNumber`.

3. **Create three template data files** — `ppl.ts` (Push, Pull, Legs x2 = 6 days, ~5-6 exercises each), `upper-lower.ts` (Upper A, Lower A, Upper B, Lower B = 4 days, ~5-6 exercises each), `full-body.ts` (Full Body A/B/C = 3 days, ~5-6 exercises each). All exercise names MUST exactly match names in `SEED_EXERCISES`. Export from `index.ts` as a `PROGRAM_TEMPLATES` array/map.

4. **Write template data integrity tests** — In `src/lib/db/__tests__/template-service.test.ts`, write tests that: (a) verify every exercise name referenced in every template exists in `SEED_EXERCISES`, (b) verify each template has the expected number of days, (c) verify no duplicate exercise names within a single day.

5. **Write getByName tests and template service tests (initially failing)** — In the same test file, add tests for `getByName()` (exact match returns correct exercise, partial match returns null). Add tests for `createProgramFromTemplate()` that assert: program is created with correct name/description, correct number of training days, correct exercise assignments per day with proper sets/reps, mesocycle created with template defaults. These service tests will fail until T02.

## Must-Haves

- [ ] `ExerciseRepository.getByName(name)` returns exact match only, not LIKE/partial
- [ ] `ProgramTemplate` type with nested day and exercise definitions including mesocycle defaults
- [ ] PPL template: 6 days, each with 4-6 exercises from SEED_EXERCISES
- [ ] Upper/Lower template: 4 days, each with 5-6 exercises from SEED_EXERCISES
- [ ] Full Body template: 3 days, each with 6-8 exercises from SEED_EXERCISES
- [ ] All template exercise names exactly match SEED_EXERCISES names
- [ ] Test file validates template data integrity (all names resolve, correct day counts, no duplicates per day)
- [ ] Test file includes getByName tests that pass
- [ ] Test file includes createProgramFromTemplate tests (expected to fail — service not yet written)

## Verification

- `pnpm --filter mobile test -- --grep "getByName"` — exact match test passes, partial match returns null
- `pnpm --filter mobile test -- --grep "template data integrity"` — all exercise names validated against SEED_EXERCISES
- `pnpm --filter mobile test -- --grep "createProgramFromTemplate"` — these tests exist but fail (expected; service is T02)

## Observability Impact

- None — this task is pure data definitions and a repository method. No runtime boundaries or async flows added.

## Inputs

- `apps/mobile/src/lib/db/repositories/exercise.ts` — existing ExerciseRepository to extend
- `apps/mobile/src/lib/db/seed/exercises.ts` — SEED_EXERCISES array for name validation
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — mock database setup pattern
- `apps/mobile/src/lib/types/program.ts` — existing program types for reference

## Expected Output

- `apps/mobile/src/lib/db/repositories/exercise.ts` — modified with getByName() method
- `apps/mobile/src/lib/data/templates/types.ts` — ProgramTemplate type definition
- `apps/mobile/src/lib/data/templates/ppl.ts` — PPL template data
- `apps/mobile/src/lib/data/templates/upper-lower.ts` — Upper/Lower template data
- `apps/mobile/src/lib/data/templates/full-body.ts` — Full Body template data
- `apps/mobile/src/lib/data/templates/index.ts` — template registry
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — test file with passing data integrity + getByName tests, failing service tests
