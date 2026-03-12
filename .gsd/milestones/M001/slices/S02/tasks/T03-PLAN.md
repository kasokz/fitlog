---
estimated_steps: 4
estimated_files: 7
---

# T03: Program detail page with training day management

**Slice:** S02 — Programs & Mesocycles
**Milestone:** M001

## Description

Build the program detail page at `/programs/[id]` where users view a program, add training days, reorder them, and remove them. This is the core editing surface for program structure — training days are the containers that exercise assignments (T04) and mesocycle config (T05) attach to.

## Steps

1. **Create route files** — `src/routes/programs/[id]/+layout.ts` with SPA prerender config. `src/routes/programs/[id]/+page.svelte` as the program detail page.

2. **Build TrainingDayCard component** — `src/lib/components/programs/TrainingDayCard.svelte`:
   - Props: `trainingDay: TrainingDayWithAssignments`, `index: number`, `total: number`, `onmoveup`, `onmovedown`, `onremove`, `onclick`
   - Display: day name, exercise count badge (e.g. "3 exercises"), up/down arrow buttons (disabled at boundaries), delete button
   - Card-based layout following ExerciseCard structure
   - Up/down buttons call reorder handlers, remove calls soft-delete

3. **Build TrainingDayForm component** — `src/lib/components/programs/TrainingDayForm.svelte`:
   - Superforms SPA: `defaults(zod4(trainingDayInsertSchema))`, `superForm({ SPA: true, validators: zod4Client(trainingDayInsertSchema), onUpdate })`
   - Fields: name (Input, required — e.g. "Push Day", "Pull Day", "Legs")
   - onUpdate prop receives validated data, calls ProgramRepository.addTrainingDay, shows toast, calls `oncreated` callback
   - Props: `programId: string`, `oncreated: () => void`

4. **Build program detail page** — `src/routes/programs/[id]/+page.svelte`:
   - Read program ID from `$page.params.id` (via `page` from `$app/state`)
   - State: program (ProgramWithDays | null), loading, error
   - $effect: DB init, load program via ProgramRepository.getById(id)
   - Header: program name, description, back link to /programs
   - Training days section: list of TrainingDayCards with reorder/remove handlers
   - Reorder handler: compute new order array, call ProgramRepository.reorderTrainingDays, reload
   - Remove handler: call ProgramRepository.removeTrainingDay, reload, show toast
   - FAB to add training day: opens Drawer with TrainingDayForm
   - Empty state for no training days yet
   - i18n keys to de.json: programs_detail_title, programs_detail_back, programs_detail_days_title, programs_detail_days_empty, programs_detail_days_empty_description, programs_detail_add_day, programs_day_form_title, programs_day_form_description, programs_day_form_name_label, programs_day_form_name_placeholder, programs_day_form_submit, programs_day_form_submitting, programs_day_form_success, programs_day_form_error, programs_day_card_exercises_count, programs_day_card_remove, programs_day_card_remove_success
   - Add matching English translations to en.json

## Must-Haves

- [ ] /programs/[id] route loads program with nested training days
- [ ] TrainingDayForm uses Superforms SPA with zod4Client validation
- [ ] Training days render in sort_order with up/down reorder buttons
- [ ] Reorder calls ProgramRepository.reorderTrainingDays and refreshes UI
- [ ] Remove calls ProgramRepository.removeTrainingDay (soft-delete) and refreshes UI
- [ ] Back navigation to /programs list
- [ ] All new i18n keys in both de.json and en.json

## Verification

- `pnpm -r check` — TypeScript compiles with new routes and components
- Visual: navigate to /programs/[id], add training days, reorder them, remove one
- `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`

## Observability Impact

- Signals added/changed: Console error on load/action failure (`[Programs] Detail load failed:`)
- How a future agent inspects this: Navigate to /programs/[id], verify training days render. Check ProgramRepository.getById() returns nested data.
- Failure state exposed: Error state in UI. Toast on action failure. Null program → 404/error display.

## Inputs

- `src/lib/db/repositories/program.ts` — ProgramRepository.getById, addTrainingDay, reorderTrainingDays, removeTrainingDay from T01
- `src/lib/types/program.ts` — ProgramWithDays, TrainingDayWithAssignments, trainingDayInsertSchema from T01
- `src/routes/programs/+page.svelte` — programs list provides navigation link to [id] (from T02)
- `src/lib/components/exercises/ExerciseCard.svelte` — card component pattern

## Expected Output

- `src/routes/programs/[id]/+layout.ts` — SPA prerender config
- `src/routes/programs/[id]/+page.svelte` — program detail page with training day management
- `src/lib/components/programs/TrainingDayCard.svelte` — training day card with reorder + remove
- `src/lib/components/programs/TrainingDayForm.svelte` — add training day form
- `apps/mobile/messages/de.json` — ~17 new training day-related keys
- `apps/mobile/messages/en.json` — matching English translations
