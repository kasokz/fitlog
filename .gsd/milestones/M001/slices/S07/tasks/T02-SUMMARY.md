---
id: T02
parent: S07
milestone: M001
provides:
  - All hardcoded user-facing strings replaced with i18n message calls
  - Language switcher in Settings page with localStorage-persisted locale
key_files:
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
  - apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte
  - apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte
  - apps/mobile/src/lib/components/programs/MesocycleForm.svelte
  - apps/mobile/src/routes/settings/+page.svelte
key_decisions:
  - Zod refinement messages use m.*() calls evaluated at validation time since schemas are defined in component script blocks
  - Language switcher uses ToggleGroup matching the theme toggle pattern for visual consistency
patterns_established:
  - Zod refinement messages should use m.*() i18n calls instead of hardcoded strings
  - Language switcher section follows same ToggleGroup pattern as theme section in Settings
observability_surfaces:
  - getLocale() returns current locale in browser console
  - localStorage stores persisted locale via Paraglide strategy
  - Missing i18n keys produce runtime errors in generated message functions
  - Zod validation messages appear in form field errors visible in UI
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Fix hardcoded strings and add language switcher to Settings

**Replaced 3 hardcoded user-facing strings with i18n calls and added a language switcher (Deutsch/English) to the Settings page.**

## What Happened

1. Added 6 new i18n keys to both `de.json` and `en.json` (242 keys total each): `aria_drag_to_reorder`, `validation_max_reps_gte_min`, `validation_deload_within_weeks`, `settings_language_label`, `settings_language_de`, `settings_language_en`.
2. Replaced `aria-label="Drag to reorder"` with `aria-label={m.aria_drag_to_reorder()}` in ExerciseAssignmentList.svelte (import already present).
3. Replaced hardcoded Zod refinement message `'Max reps must be >= min reps'` with `m.validation_max_reps_gte_min()` in ExerciseAssignmentForm.svelte.
4. Replaced hardcoded Zod refinement message `'Deload week must be within weeks count'` with `m.validation_deload_within_weeks()` in MesocycleForm.svelte.
5. Added language switcher section to Settings page below the theme toggle: imports `getLocale`/`setLocale` from Paraglide runtime, uses `ToggleGroup` with Globe icons for Deutsch and English options. `handleLocaleChange` validates the value before calling `setLocale()`.

## Verification

- `grep -rn 'aria-label="Drag' src/` → no hardcoded strings (PASS)
- `grep -rn "'Max reps\|'Deload week" src/` → 0 results (PASS)
- `grep -c "settings_language_label\|settings_language_de\|settings_language_en" messages/de.json` → 3 (PASS)
- `grep "setLocale" src/routes/settings/+page.svelte` → matches import and handler (PASS)
- `jq 'keys | length'` → 242 for both de.json and en.json (PASS)
- `diff` of sorted keys → no output (PASS)
- `pnpm build` → succeeds (PASS)
- All slice-level verification checks pass (paraglide compile, key sync, no German errors, no placeholder titles, baseLocale, strategy)
- iOS/Android native localization files not yet created (T03 scope)

## Diagnostics

- Inspect `getLocale()` in browser console to see current locale
- Check `localStorage` for Paraglide locale key to verify persistence
- Zod validation messages appear as form field errors when validation fails — test by setting max_reps < min_reps in ExerciseAssignmentForm
- Run `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` to verify key sync

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/de.json` — Added 6 new i18n keys (236 → 242)
- `apps/mobile/messages/en.json` — Added 6 new i18n keys (236 → 242)
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — Replaced hardcoded aria-label with m.aria_drag_to_reorder()
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte` — Replaced hardcoded Zod message with m.validation_max_reps_gte_min()
- `apps/mobile/src/lib/components/programs/MesocycleForm.svelte` — Replaced hardcoded Zod message with m.validation_deload_within_weeks()
- `apps/mobile/src/routes/settings/+page.svelte` — Added language switcher section with ToggleGroup and Globe icons
