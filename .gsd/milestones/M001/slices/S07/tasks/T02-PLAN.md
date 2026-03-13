---
estimated_steps: 5
estimated_files: 8
---

# T02: Fix hardcoded strings and add language switcher to Settings

**Slice:** S07 — i18n & Launch Readiness
**Milestone:** M001

## Description

Three hardcoded user-facing strings remain in the codebase: one `aria-label="Drag to reorder"` in ExerciseAssignmentList and two Zod refinement messages in ExerciseAssignmentForm and MesocycleForm. These must be replaced with i18n message calls. Additionally, the Settings page needs a language switcher so users can manually override locale detection — matching the existing theme toggle pattern with a ToggleGroup.

## Steps

1. Add new i18n keys to both `de.json` and `en.json` for the three hardcoded strings: `aria_drag_to_reorder` (de: "Zum Sortieren ziehen", en: "Drag to reorder"), `validation_max_reps_gte_min` (de: "Max Wdh. muss ≥ Min Wdh. sein", en: "Max reps must be ≥ min reps"), `validation_deload_within_weeks` (de: "Deload-Woche muss innerhalb der Wochenanzahl liegen", en: "Deload week must be within weeks count"). Also add language switcher keys: `settings_language_label` (de: "Sprache", en: "Language"), `settings_language_de` (de: "Deutsch", en: "German"), `settings_language_en` (de: "Englisch", en: "English").
2. Edit `ExerciseAssignmentList.svelte`: replace `aria-label="Drag to reorder"` with `aria-label={m.aria_drag_to_reorder()}`. Add `m` import if not already present.
3. Edit `ExerciseAssignmentForm.svelte`: replace the hardcoded Zod refinement `message: 'Max reps must be >= min reps'` with `message: m.validation_max_reps_gte_min()`. The schema is defined inside the `<script>` block so `m.*()` is evaluated at validation time, not module load time.
4. Edit `MesocycleForm.svelte`: replace the hardcoded Zod refinement `message: 'Deload week must be within weeks count'` with `message: m.validation_deload_within_weeks()`. Same pattern as step 3.
5. Build the language switcher section in `apps/mobile/src/routes/settings/+page.svelte`: import `getLocale`, `setLocale` from `$lib/paraglide/runtime.js`. Add a new section below the theme toggle with a `ToggleGroup` (same pattern as theme). Items: Deutsch, English. Value bound to `getLocale()`, onChange calls `setLocale(value)`. Add `Globe` icon from lucide.

## Must-Haves

- [ ] `aria-label="Drag to reorder"` replaced with i18n call in ExerciseAssignmentList
- [ ] Zod refinement message in ExerciseAssignmentForm uses i18n
- [ ] Zod refinement message in MesocycleForm uses i18n
- [ ] All 6 new i18n keys added to both `de.json` and `en.json`
- [ ] Language switcher visible in Settings page
- [ ] Language switcher calls `setLocale()` on selection
- [ ] `pnpm build` succeeds

## Verification

- `grep -rn 'aria-label="Drag' apps/mobile/src/` returns no hardcoded strings (only `m.` calls)
- `grep -rn "'Max reps\|'Deload week" apps/mobile/src/` returns 0 results
- `grep -c "settings_language_label\|settings_language_de\|settings_language_en" apps/mobile/messages/de.json` returns 3
- `grep "setLocale" apps/mobile/src/routes/settings/+page.svelte` matches
- `pnpm build` succeeds from `apps/mobile/`

## Observability Impact

- Signals added/changed: `setLocale()` triggers a page reload which is the expected Paraglide behavior for locale switching; localStorage strategy persists the choice
- How a future agent inspects this: Check localStorage for the Paraglide locale key; inspect Settings page for the language toggle group; verify `getLocale()` returns expected value in browser console
- Failure state exposed: Missing i18n keys produce runtime errors in generated message functions; Zod validation messages appear in form field errors — visible in the UI

## Inputs

- `apps/mobile/messages/de.json` — synced keys from T01
- `apps/mobile/messages/en.json` — synced keys from T01
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — has hardcoded aria-label at line 80
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte` — has hardcoded Zod message at line 38
- `apps/mobile/src/lib/components/programs/MesocycleForm.svelte` — has hardcoded Zod message at line 34
- `apps/mobile/src/routes/settings/+page.svelte` — existing theme toggle to mirror for language switcher

## Expected Output

- `apps/mobile/messages/de.json` — 6 new keys added (242 total)
- `apps/mobile/messages/en.json` — 6 new keys added (242 total)
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — aria-label uses i18n
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte` — Zod message uses i18n
- `apps/mobile/src/lib/components/programs/MesocycleForm.svelte` — Zod message uses i18n
- `apps/mobile/src/routes/settings/+page.svelte` — language switcher section added below theme toggle
