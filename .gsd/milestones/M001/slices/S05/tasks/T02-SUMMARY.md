---
id: T02
parent: S05
milestone: M001
provides:
  - createProgramFromTemplate() service that resolves exercise names → IDs and atomically creates program + days + assignments + mesocycle
  - TemplateCreationResult return type with program, trainingDays (with assignments), and mesocycle
  - isOnboardingCompleted(), completeOnboarding(), resetOnboarding() Preferences-backed helpers
key_files:
  - apps/mobile/src/lib/db/services/template-service.ts
  - apps/mobile/src/lib/services/onboarding.ts
  - apps/mobile/src/lib/db/__tests__/onboarding.test.ts
key_decisions:
  - createProgramFromTemplate() accepts ProgramTemplate object directly (not template ID string) — matches T01 test contract
  - Service lives at src/lib/db/services/ (co-located with repositories it depends on) vs src/lib/services/ (for onboarding which depends on Capacitor Preferences)
patterns_established:
  - Service functions use two-phase pattern: resolve all external references first (fail-fast), then create all DB records sequentially
  - Capacitor Preferences mocked via vi.mock with in-memory Map storage for unit tests
  - Console logs use bracketed prefixes ([TemplateService], [Onboarding]) for grep-friendly runtime diagnostics
observability_surfaces:
  - "[TemplateService]" prefixed console.log at each creation phase: start, resolution complete, program created, per-day assignments, mesocycle created, done
  - "[Onboarding]" prefixed console.log on isOnboardingCompleted, completeOnboarding, resetOnboarding
  - Resolution failures throw Error with descriptive message listing all missing exercise names
duration: 12m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Implement template creation service and onboarding preferences

**Implemented createProgramFromTemplate() two-phase service (resolve names → create program structure) and Preferences-backed onboarding state helpers, making all 25 T01 template service tests pass plus 6 new onboarding tests.**

## What Happened

Implemented the core template creation service at `src/lib/db/services/template-service.ts`:
- Phase 1 collects all unique exercise names across template days, resolves each via `ExerciseRepository.getByName()`, and throws with all missing names if any fail
- Phase 2 creates program (via `ProgramRepository.createProgram`), then iterates days creating training days with sort_order, then exercise assignments per day with resolved exercise_id/target_sets/min_reps/max_reps, and finally creates mesocycle with template defaults
- Returns `TemplateCreationResult` with program, trainingDays (including assignments), and mesocycle

Implemented onboarding preference helpers at `src/lib/services/onboarding.ts`:
- `isOnboardingCompleted()` checks `Preferences.get()` for non-null value
- `completeOnboarding()` sets the flag via `Preferences.set()`
- `resetOnboarding()` removes the flag via `Preferences.remove()`

Created onboarding test file with 6 tests using a vi.mock of `@capacitor/preferences` backed by an in-memory Map.

## Verification

- `pnpm --filter mobile test -- --grep "createProgramFromTemplate"` — all 7 service creation tests pass (name/description, day count, sets/reps, mesocycle defaults, exercise ID resolution, day sort_order, assignment sort_order)
- `pnpm --filter mobile test -- --grep "onboarding"` — all 6 preference helper tests pass (initial false, complete → true, reset → false, idempotent complete, reset when not set, full round-trip)
- `pnpm --filter mobile test -- --grep "template"` — full 25-test template suite passes (12 data integrity + 6 getByName + 7 service)
- `pnpm --filter mobile test` — all 211 tests pass across 7 test files, no regressions
- `pnpm --filter mobile build` — build succeeds with no type errors

## Diagnostics

- Check console for `[TemplateService]` prefix to see creation phase progress and any resolution failures
- Check console for `[Onboarding]` prefix to see preference state changes
- Resolution failures throw Error with message format: `[TemplateService] Failed to resolve exercise names: Name1, Name2`
- Onboarding state inspectable via `Preferences.get({ key: 'onboarding_completed' })`

## Deviations

- Task plan said "Accept a template ID string" but T01 tests pass the ProgramTemplate object directly. Matched the test contract (source of truth) — function accepts `ProgramTemplate` object, not a template ID string.
- Service file placed at `src/lib/db/services/template-service.ts` (matching the test's import path `../services/template-service.js` relative to `__tests__/`) rather than `src/lib/services/template-service.ts` as the plan suggested.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/db/services/template-service.ts` — new: createProgramFromTemplate() with two-phase resolve+create logic
- `apps/mobile/src/lib/services/onboarding.ts` — new: Preferences-backed isOnboardingCompleted/completeOnboarding/resetOnboarding
- `apps/mobile/src/lib/db/__tests__/onboarding.test.ts` — new: 6 tests for onboarding preference helpers with mocked Preferences
