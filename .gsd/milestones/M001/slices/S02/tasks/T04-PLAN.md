---
estimated_steps: 4
estimated_files: 7
---

# T04: Exercise assignment to training days with exercise picker

**Slice:** S02 — Programs & Mesocycles
**Milestone:** M001

## Description

Build the exercise assignment flow: users select a training day, pick an exercise from the existing library (reusing S01's search/filter), configure target sets and rep range, and see assignments listed under each training day. This completes the Program → TrainingDay → ExerciseAssignment hierarchy that S03 needs for workout logging.

## Steps

1. **Build ExercisePicker component** — `src/lib/components/programs/ExercisePicker.svelte`:
   - Reuses ExerciseRepository.combinedFilter from S01 — search input + optional muscle group filter
   - Renders exercises as a selectable list (tap to select, highlighted state)
   - Props: `onselect: (exercise: Exercise) => void`, `open: boolean` (bindable)
   - Wrapped in a Drawer — opens from the assignment flow
   - Shows exercise name, muscle group badge, equipment badge per row (simplified ExerciseCard)
   - Uses Debounced from runed for search input

2. **Build ExerciseAssignmentForm component** — `src/lib/components/programs/ExerciseAssignmentForm.svelte`:
   - Two-step flow: first pick exercise (opens ExercisePicker Drawer), then configure sets/reps
   - Superforms SPA: exercise_id (hidden, set by picker), target_sets (number input, 1-10, default 3), min_reps (number input, 1-100, default 8), max_reps (number input, 1-100, default 12)
   - Validation: max_reps >= min_reps
   - Shows selected exercise name at the top once picked
   - onUpdate calls ProgramRepository.addExerciseAssignment, toast.success, calls `oncreated` callback
   - Props: `trainingDayId: string`, `oncreated: () => void`

3. **Build ExerciseAssignmentList component** — `src/lib/components/programs/ExerciseAssignmentList.svelte`:
   - Props: `assignments: ExerciseAssignment[]`, `onreorder`, `onremove`
   - Renders each assignment: exercise name (need to resolve via join or included data), target_sets × min_reps-max_reps display (e.g. "3 × 8-12"), up/down reorder buttons, remove button
   - Up/down buttons call ProgramRepository.reorderExerciseAssignments, remove calls removeExerciseAssignment
   - Handle soft-deleted exercises gracefully (show "[Deleted exercise]" if FK target is gone)

4. **Wire into program detail page** — Update `src/routes/programs/[id]/+page.svelte`:
   - Each TrainingDayCard now shows its ExerciseAssignmentList inline (expanding or always visible)
   - Add "Add exercise" button per training day that opens ExerciseAssignmentForm in a Drawer
   - Refresh program data (reload getById) after add/reorder/remove assignment
   - i18n keys to de.json: programs_assignment_add, programs_assignment_form_title, programs_assignment_form_description, programs_assignment_pick_exercise, programs_assignment_target_sets_label, programs_assignment_min_reps_label, programs_assignment_max_reps_label, programs_assignment_submit, programs_assignment_submitting, programs_assignment_success, programs_assignment_error, programs_assignment_remove_success, programs_assignment_sets_reps_display, programs_assignment_deleted_exercise, programs_picker_title, programs_picker_search_placeholder
   - Add matching English translations to en.json

## Must-Haves

- [ ] ExercisePicker reuses ExerciseRepository.combinedFilter (S01 infrastructure)
- [ ] ExerciseAssignmentForm validates target_sets, min_reps, max_reps with Zod
- [ ] max_reps >= min_reps validation enforced
- [ ] Assignments render under training days with sets × reps display
- [ ] Up/down reorder and remove work for assignments
- [ ] Exercise picker opens in a Drawer with search capability
- [ ] All new i18n keys in both de.json and en.json

## Verification

- `pnpm -r check` — TypeScript compiles with all new components
- Visual: open a program, click add exercise on a training day, pick exercise, set 3×8-12, see it listed, reorder, remove
- `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`

## Observability Impact

- Signals added/changed: Console error on assignment add/reorder/remove failure
- How a future agent inspects this: Navigate to /programs/[id], verify assignments render under training days. Check ProgramRepository.getById() returns nested assignments.
- Failure state exposed: Toast on failure. Graceful handling of deleted exercise FK.

## Inputs

- `src/lib/db/repositories/program.ts` — addExerciseAssignment, reorderExerciseAssignments, removeExerciseAssignment from T01
- `src/lib/db/repositories/exercise.ts` — ExerciseRepository.combinedFilter for exercise picker (S01)
- `src/lib/types/program.ts` — ExerciseAssignment, exerciseAssignmentInsertSchema from T01
- `src/lib/types/exercise.ts` — Exercise type for picker
- `src/routes/programs/[id]/+page.svelte` — program detail page from T03 (wire assignment list into it)
- `src/lib/components/programs/TrainingDayCard.svelte` — from T03 (add assignment UI below each day)

## Expected Output

- `src/lib/components/programs/ExercisePicker.svelte` — exercise selection Drawer
- `src/lib/components/programs/ExerciseAssignmentForm.svelte` — assignment config form
- `src/lib/components/programs/ExerciseAssignmentList.svelte` — assignment list with reorder/remove
- `src/routes/programs/[id]/+page.svelte` — updated with assignment management wired into training days
- `apps/mobile/messages/de.json` — ~16 new assignment/picker keys
- `apps/mobile/messages/en.json` — matching English translations
