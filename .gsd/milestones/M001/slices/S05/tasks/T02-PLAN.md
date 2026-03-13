---
estimated_steps: 4
estimated_files: 3
---

# T02: Implement template creation service and onboarding preferences

**Slice:** S05 — Onboarding & Program Templates
**Milestone:** M001

## Description

Implements the core business logic for S05: the `createProgramFromTemplate()` service function that resolves exercise names to IDs and atomically creates program + training days + exercise assignments + mesocycle from a template definition. Also implements the `@capacitor/preferences`-backed onboarding state helpers. After this task, all template service tests from T01 should pass.

## Steps

1. **Implement `createProgramFromTemplate()`** in `src/lib/services/template-service.ts`:
   - Accept a template ID string, look up the template from the registry.
   - Phase 1 (resolve): Loop through all days and exercises, call `ExerciseRepository.getByName()` for each unique exercise name. Collect all failed resolutions. If ANY name fails to resolve, throw with a descriptive error listing all missing names — do NOT partially create.
   - Phase 2 (create): Call `ProgramRepository.createProgram()` with template name/description. For each day, call `ProgramRepository.addTrainingDay()` with day name and sort_order. For each exercise in the day, call `ProgramRepository.addExerciseAssignment()` with resolved exercise_id, target_sets, min_reps, max_reps. Finally call `ProgramRepository.createMesocycle()` with template's mesocycle defaults.
   - Add `[TemplateService]` prefixed console.log for key lifecycle points: start, resolution complete, program created, assignments added, mesocycle created, done.
   - Return the created program ID on success.

2. **Implement onboarding preference helpers** in `src/lib/services/onboarding.ts`:
   - `isOnboardingCompleted(): Promise<boolean>` — calls `Preferences.get({ key: 'onboarding_completed' })`, returns `true` if value is non-null.
   - `completeOnboarding(): Promise<void>` — calls `Preferences.set({ key: 'onboarding_completed', value: 'true' })`.
   - `resetOnboarding(): Promise<void>` — calls `Preferences.remove({ key: 'onboarding_completed' })`.
   - Add `[Onboarding]` prefixed console.log for state changes.

3. **Add onboarding preference tests** — In the template service test file or a separate `onboarding.test.ts`, test that the preference helpers work correctly. Mock `@capacitor/preferences` for these tests.

4. **Verify all T01 template service tests now pass** — The `createProgramFromTemplate` tests written in T01 should now pass. Fix any issues. Run the full test suite to ensure no regressions.

## Must-Haves

- [ ] `createProgramFromTemplate(templateId)` resolves all exercise names before creating anything (fail-fast)
- [ ] On resolution failure, error message lists all missing exercise names
- [ ] Creates program with correct name and description from template
- [ ] Creates correct number of training days with correct names and sort_order
- [ ] Creates correct exercise assignments per day with proper exercise_id, target_sets, min_reps, max_reps
- [ ] Creates mesocycle with template's weeks_count and deload_week_number
- [ ] `isOnboardingCompleted()` returns false when no flag set, true after `completeOnboarding()`
- [ ] `resetOnboarding()` clears the flag so `isOnboardingCompleted()` returns false again
- [ ] All template service tests from T01 now pass

## Verification

- `pnpm --filter mobile test -- --grep "createProgramFromTemplate"` — all service creation tests pass
- `pnpm --filter mobile test -- --grep "onboarding"` — preference helper tests pass
- `pnpm --filter mobile test -- --grep "template"` — full template test suite passes (data integrity + service)

## Observability Impact

- Signals added/changed: `[TemplateService]` console logs at each creation phase — start, resolution, program created, each day + assignments, mesocycle, completion. `[Onboarding]` console logs on preference state changes.
- How a future agent inspects this: Check console logs for `[TemplateService]` prefix to see where creation failed. Check `Preferences.get({ key: 'onboarding_completed' })` for current onboarding state.
- Failure state exposed: Resolution failures throw with descriptive error listing all missing exercise names. Creation failures propagate the underlying ProgramRepository errors.

## Inputs

- `apps/mobile/src/lib/data/templates/index.ts` — template registry from T01
- `apps/mobile/src/lib/data/templates/types.ts` — ProgramTemplate type from T01
- `apps/mobile/src/lib/db/repositories/exercise.ts` — ExerciseRepository.getByName() from T01
- `apps/mobile/src/lib/db/repositories/program.ts` — ProgramRepository methods
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — failing service tests from T01

## Expected Output

- `apps/mobile/src/lib/services/template-service.ts` — complete createProgramFromTemplate() function
- `apps/mobile/src/lib/services/onboarding.ts` — Preferences-backed onboarding helpers
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — all tests now passing
