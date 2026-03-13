---
id: T04
parent: S03
milestone: M001
provides:
  - All workout UI strings localized to German (de.json) as base locale
  - No hardcoded user-facing strings remain in workout components or routes
key_files:
  - apps/mobile/messages/de.json
  - apps/mobile/src/lib/components/workout/Stepper.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
key_decisions:
  - Stepper sr-only labels use paraglide messages directly rather than accepting label props, since the component is only used within the workout context
patterns_established:
  - All workout_ prefixed keys in de.json follow the existing naming convention (workout_section_detail)
observability_surfaces:
  - none
duration: 10min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: i18n — German (de.json) keys for all workout UI

**Added 4 missing German i18n keys and wired all remaining hardcoded strings in workout components to paraglide messages.**

## What Happened

Audited all workout-related files (6 components + 1 route + TrainingDayCard) for hardcoded user-facing strings. Found that T02 and T03 had already done most of the i18n wiring — 37 workout_ keys already existed in de.json and were correctly referenced.

Identified and fixed 4 remaining gaps:
1. **Stepper.svelte** — "Decrease" and "Increase" sr-only labels were hardcoded English → added `workout_stepper_decrease`/`workout_stepper_increase` keys and wired them
2. **+page.svelte** — `'Program not found for this session'` error string → added `workout_program_not_found` key and wired it
3. **+page.svelte** — `'[Deleted exercise]'` fallback (2 occurrences) → added `workout_deleted_exercise` key and wired both

Final state: 41 workout_ keys in de.json, all referenced from components. No hardcoded user-facing strings remain.

## Verification

- `pnpm -F mobile build` — passes cleanly, confirming all paraglide keys exist and are wired correctly
- `grep -rn "\"[A-ZÄÖÜa-zäöü][^\"]*\"" ... | grep -v ...` — zero results, no suspicious hardcoded strings
- `pnpm -F mobile test -- --run workout-repository.test.ts` — all 154 tests pass (4 test files)
- Cross-checked: all `m.workout_*()` calls in code have matching keys in de.json; de.json has a few extra unused keys (workout_creating_session, workout_duration_timer, workout_error_description, workout_kg_unit) which are harmless

### Slice-level verification status
- ✅ `pnpm -F mobile test -- --run workout-repository.test.ts` — 154 tests pass
- ✅ `pnpm -F mobile build` — builds without errors
- ⬜ Manual UAT (start workout → log sets → finish → data persists) — requires running app

## Diagnostics

- Check de.json for `workout_` prefixed keys (41 total)
- Check components for `m.workout_` imports — all 6 workout components + route + TrainingDayCard use paraglide

## Deviations

None. The task plan anticipated more keys would need to be added, but T02/T03 had already created most of them during implementation. Only 4 keys were actually missing.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/de.json` — added 4 missing workout_ keys (stepper_decrease, stepper_increase, program_not_found, deleted_exercise)
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — added paraglide import, replaced hardcoded "Decrease"/"Increase" with m.workout_stepper_decrease()/m.workout_stepper_increase()
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — replaced hardcoded error string and deleted exercise fallback with paraglide messages
