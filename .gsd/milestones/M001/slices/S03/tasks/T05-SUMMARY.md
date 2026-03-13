---
id: T05
parent: S03
milestone: M001
provides:
  - All workout_ i18n keys translated to English in en.json with full key parity to de.json
key_files:
  - apps/mobile/messages/en.json
key_decisions: []
patterns_established: []
observability_surfaces:
  - none
duration: 5m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T05: i18n — English (en.json) translations for workout keys

**Added 4 missing English translations for workout keys to en.json, achieving full key parity (175/175) with de.json.**

## What Happened

en.json was missing 4 workout-related keys added in T04: `workout_deleted_exercise`, `workout_program_not_found`, `workout_stepper_decrease`, `workout_stepper_increase`. Added natural English translations for all 4. The remaining 37 workout_ keys already had English translations from prior work.

## Verification

- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no differences (175 keys each)
- Parameter name parity check via python3 script — zero mismatches across all 175 keys
- `pnpm -F mobile build` — builds successfully without errors

### Slice-level verification

- `pnpm -F mobile build` — ✅ passes
- `pnpm -F mobile test -- --run workout-repository.test.ts` — not re-run (no code changes, only locale file)
- Manual UAT — not applicable (translation-only task)

## Diagnostics

None — translation-only task with no runtime behavior changes.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/en.json` — added 4 missing workout_ keys: workout_deleted_exercise, workout_program_not_found, workout_stepper_decrease, workout_stepper_increase
