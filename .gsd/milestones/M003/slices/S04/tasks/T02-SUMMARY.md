---
id: T02
parent: S04
milestone: M003
provides:
  - Full data integrity test coverage for all 5 premium program templates
  - createProgramFromTemplate end-to-end test for a premium template
  - Registry count assertions for PROGRAM_TEMPLATES (3), PREMIUM_PROGRAM_TEMPLATES (5), ALL_TEMPLATES (8)
key_files:
  - src/lib/db/__tests__/template-service.test.ts
key_decisions: []
patterns_established:
  - Premium template tests mirror free template integrity patterns in a parallel describe block
observability_surfaces:
  - Test failures name the exact template, day, and exercise that failed validation
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Extend template tests for premium templates

**Added 19 tests covering all 5 premium template data integrity and createProgramFromTemplate for premium templates, bringing total test count to 428.**

## What Happened

Extended `template-service.test.ts` with two new describe blocks:

1. **`premium template data integrity`** (15 tests) — mirrors the existing free template integrity group:
   - All premium exercise names resolve against SEED_EXERCISES
   - Day count assertions per template (531: 4, LP: 4, TVM: 4, Hypertrophy: 5, SE Block: 3)
   - Exercise count per day within 3-8 range
   - No duplicate exercises within any day
   - Valid mesocycle defaults (weeksCount > 0, deloadWeekNumber <= weeksCount)
   - Valid rep ranges (targetSets > 0, minReps > 0, maxReps >= minReps)
   - PREMIUM_PROGRAM_TEMPLATES count = 5
   - All premium templates have `premium: true`
   - PROGRAM_TEMPLATES still exactly 3 (onboarding safety)
   - ALL_TEMPLATES count = 8
   - Unique IDs across ALL_TEMPLATES (no collision between free + premium)

2. **`createProgramFromTemplate (premium)`** (4 tests) — end-to-end creation using periodized-strength-531:
   - Program name and description match template
   - Correct day count (4)
   - Correct exercise assignment counts per day
   - Mesocycle defaults match template
   - All exercise names resolve to valid exercise IDs

## Verification

- `cd apps/mobile && pnpm test` — **428 tests passed** (409 baseline + 19 new), 17 test files, 0 failures
- `pnpm run build` — zero errors
- Template-service test file specifically: 44 tests (was 25)

### Slice-level verification status (T02 of 4):
- ✅ `pnpm test` — all tests pass, count 428 >= 420
- ✅ `pnpm run build` — zero errors
- ✅ Premium template integrity: all 5 templates in test suite with full validation
- ✅ Premium template creation: periodized-strength-531 tested via createProgramFromTemplate
- ⬜ i18n key count: de.json/en.json parity — not yet (T04)
- ✅ Onboarding: PROGRAM_TEMPLATES assertion confirms exactly 3 free templates

## Diagnostics

Run `pnpm test` and check output for the `premium template data integrity` and `createProgramFromTemplate (premium)` test groups. Test failures name the exact template ID, day name, and exercise name that failed.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/lib/db/__tests__/template-service.test.ts` — Added PREMIUM_PROGRAM_TEMPLATES and ALL_TEMPLATES imports; added `premium template data integrity` describe block (15 tests) and `createProgramFromTemplate (premium)` describe block (4 tests)
