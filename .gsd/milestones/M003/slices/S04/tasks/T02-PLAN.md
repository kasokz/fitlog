---
estimated_steps: 4
estimated_files: 1
---

# T02: Extend template tests for premium templates

**Slice:** S04 — Premium Program Templates
**Milestone:** M003

## Description

Add test coverage for the 5 premium templates using the same integrity validation patterns as the existing free template tests. Premium templates must pass exercise name resolution, rep range validation, uniqueness checks, and mesocycle default validation. Also test that `createProgramFromTemplate()` works for a premium template end-to-end.

## Steps

1. Import `PREMIUM_PROGRAM_TEMPLATES` and `ALL_TEMPLATES` from the template index in `template-service.test.ts`
2. Add a `premium template data integrity` describe block with tests mirroring the existing `template data integrity` group:
   - All premium template exercise names exist in SEED_EXERCISES
   - Each premium template has the expected day count (Periodized Strength 531: 4, Linear Progression LP: 4, Tiered Volume Method: 4, Periodized Hypertrophy: 5, Strength-Endurance Block: 3)
   - Each day has a reasonable exercise count (3-8 per day)
   - No duplicate exercise names within a single day
   - Valid mesocycle defaults (weeksCount > 0, deloadWeekNumber <= weeksCount)
   - Valid rep ranges (targetSets > 0, minReps > 0, maxReps >= minReps)
   - `PREMIUM_PROGRAM_TEMPLATES` contains exactly 5 templates
   - All templates in `ALL_TEMPLATES` have unique IDs (no collision between free + premium)
   - All premium templates have `premium: true`
   - `PROGRAM_TEMPLATES` still contains exactly 3 templates (free only, onboarding safe)
3. Add a `createProgramFromTemplate (premium)` test that creates a program from one premium template and verifies program name, day count, assignment count, and mesocycle defaults
4. Run `pnpm test` and verify all tests pass with count >= 420

## Must-Haves

- [ ] All 5 premium templates pass exercise name resolution against SEED_EXERCISES
- [ ] Day count assertions for each premium template
- [ ] Rep range validation across all premium template exercises
- [ ] No duplicate exercises within any day across all premium templates
- [ ] Unique IDs across `ALL_TEMPLATES` (free + premium combined)
- [ ] `PROGRAM_TEMPLATES` count assertion remains 3
- [ ] `PREMIUM_PROGRAM_TEMPLATES` count assertion is 5
- [ ] `ALL_TEMPLATES` count assertion is 8
- [ ] At least one `createProgramFromTemplate()` test for a premium template
- [ ] All premium templates have `premium: true`
- [ ] Test count >= 420

## Verification

- `cd apps/mobile && pnpm test` — all tests pass
- Test count reported >= 420
- No existing tests broken (the 409 baseline tests still pass)

## Observability Impact

- Signals added/changed: None — test-time only
- How a future agent inspects this: Run `pnpm test` and check output for premium template test group
- Failure state exposed: Test failures name the exact template, day, and exercise that failed validation

## Inputs

- `src/lib/data/templates/index.ts` — `PREMIUM_PROGRAM_TEMPLATES`, `ALL_TEMPLATES` exports from T01
- `src/lib/db/__tests__/template-service.test.ts` — existing test patterns to mirror
- `src/lib/db/seed/exercises.ts` — SEED_EXERCISES for name validation

## Expected Output

- `src/lib/db/__tests__/template-service.test.ts` — extended with premium template integrity tests and creation test, total test count >= 420
