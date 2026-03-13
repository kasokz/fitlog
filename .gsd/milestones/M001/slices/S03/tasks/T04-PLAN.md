---
estimated_steps: 3
estimated_files: 4
---

# T04: i18n — German (de.json) keys for all workout UI

**Slice:** S03 — Workout Logging
**Milestone:** M001

## Description

Add all German i18n keys for the workout logging UI and wire all hardcoded strings to use paraglide messages. German is the base locale (per AGENTS.md). This covers the active workout screen, set row labels, stepper labels, timer labels, start/finish workout flows, and the start workout button on the program detail page.

## Steps

1. **Identify all user-facing strings** — Audit all files created/modified in T02 and T03 for hardcoded German or English strings. This includes: page titles, button labels, stepper labels, RIR labels, set type labels, timer labels, confirmation dialogs, error messages, toast messages, empty states. Create a complete list of keys needed.

2. **Add keys to de.json** — Add all workout-related keys to `apps/mobile/messages/de.json` under the `workout_` namespace prefix. Include:
   - `workout_title` — page title
   - `workout_finish_button`, `workout_finish_confirm_title`, `workout_finish_confirm_description`, `workout_finish_confirm_action`, `workout_finish_success`
   - `workout_start_button`, `workout_start_error`, `workout_start_in_progress`, `workout_start_resume`
   - `workout_set_weight`, `workout_set_reps`, `workout_set_rir`, `workout_set_confirm`, `workout_set_remove`
   - `workout_set_type_warmup`, `workout_set_type_working`, `workout_set_type_drop`, `workout_set_type_failure`
   - `workout_rir_label`, `workout_rir_5plus`
   - `workout_add_set`
   - `workout_rest_timer_start`, `workout_rest_timer_pause`, `workout_rest_timer_reset`, `workout_rest_timer_title`
   - `workout_duration_label`
   - `workout_loading`, `workout_error`, `workout_not_found`
   - `workout_unconfirmed_sets_warning`
   - Create i18n label maps for set types (similar to `exercises/i18n-maps.ts` pattern) if needed

3. **Wire all components to paraglide** — Replace every hardcoded string in workout components and routes with `m.workout_*()` calls. Import `{ m } from '$lib/paraglide/messages.js'` in each file. For the "Start Workout" button added to program detail page, use appropriate key. Verify no user-facing strings remain hardcoded.

## Must-Haves

- [ ] All workout_ keys present in de.json with proper German translations
- [ ] All user-facing strings in workout components use paraglide `m.workout_*()` messages
- [ ] Set type labels (warmup/working/drop/failure) localized
- [ ] RIR labels localized
- [ ] Timer labels (start/pause/reset) localized
- [ ] Confirmation dialog texts localized
- [ ] Toast messages localized
- [ ] Start workout button on program detail localized
- [ ] No hardcoded user-facing strings remain in workout files

## Verification

- `pnpm -F mobile build` — builds without errors (confirms paraglide keys exist and are wired)
- `grep -rn "\"[A-ZÄÖÜa-zäöü][^\"]*\"" apps/mobile/src/lib/components/workout/ apps/mobile/src/routes/workout/ --include="*.svelte" | grep -v "import\|from\|class\|type\|const\|let\|=\|\$" | head -20` — no suspicious hardcoded strings

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: Check de.json for `workout_` prefixed keys; check components for `m.workout_` imports
- Failure state exposed: None

## Inputs

- `apps/mobile/src/lib/components/workout/*.svelte` — all workout components (T02, T03)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — workout page (T02, T03)
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — modified program detail (T03)
- `apps/mobile/messages/de.json` — existing keys to extend
- `apps/mobile/src/lib/components/exercises/i18n-maps.ts` — label map pattern reference

## Expected Output

- `apps/mobile/messages/de.json` — extended with all workout_ keys
- `apps/mobile/src/lib/components/workout/*.svelte` — all strings wired to paraglide
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — strings wired to paraglide
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — start workout label wired to paraglide
