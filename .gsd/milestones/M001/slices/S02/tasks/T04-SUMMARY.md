---
id: T04
parent: S02
milestone: M001
provides:
  - ExercisePicker component with search and muscle group filter in a Drawer
  - ExerciseAssignmentForm with Superforms SPA validation including max_reps >= min_reps refinement
  - ExerciseAssignmentList component with reorder (up/down) and remove
  - Exercise assignment management wired into /programs/[id] detail page
  - 16 new i18n keys in de.json and en.json (110 total each)
key_files:
  - apps/mobile/src/lib/components/programs/ExercisePicker.svelte
  - apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte
  - apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte
  - apps/mobile/src/routes/programs/[id]/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Exercise names resolved via ExerciseRepository.getById per exercise_id in the detail page loadProgram function, building a Map<string, string> passed to ExerciseAssignmentList. Acceptable for small assignment counts per program.
  - Form-specific Zod schema with .refine() for max_reps >= min_reps created inline in ExerciseAssignmentForm rather than added to types/program.ts (the DB-level insert schema doesn't enforce cross-field constraints)
  - Assignment list rendered inline under each TrainingDayCard in the detail page (not inside TrainingDayCard itself) to keep TrainingDayCard simple and reusable
patterns_established:
  - Exercise picker pattern: Drawer with Debounced search + muscle group filter badges, reusing ExerciseRepository.combinedFilter and i18n-maps from exercises module
  - Assignment list inline pattern: assignments displayed below each training day card with indent, reorder via up/down buttons, remove via trash button (same pattern as training day reorder)
  - Cross-field Zod refinement in form component: form-specific schema wraps base fields with .refine() for UI validation that the repository-level schema doesn't enforce
observability_surfaces:
  - Console errors prefixed [ExercisePicker], [ExerciseAssignmentForm], [Programs] for load/add/reorder/remove failures
  - Toast notifications on assignment create success, remove success, and all error paths
  - Deleted exercises show "[Gelöschte Übung]" / "[Deleted exercise]" gracefully in assignment list
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Exercise assignment to training days with exercise picker

**Built complete exercise assignment flow: picker Drawer with search/filter, Superforms assignment form with sets/reps validation, inline assignment list with reorder/remove under each training day, and 16 new i18n keys.**

## What Happened

Built 3 new components and updated the program detail page:

1. **ExercisePicker** — Drawer component reusing `ExerciseRepository.combinedFilter` from S01. Features Debounced search input (300ms, via runed), muscle group filter badges, and a scrollable exercise list showing name + muscle group + equipment badges. Tapping an exercise fires `onselect` callback and closes the Drawer.

2. **ExerciseAssignmentForm** — Two-step Superforms SPA form. First step: open ExercisePicker to select an exercise (sets hidden `exercise_id` field). Second step: configure target_sets (1-10, default 3), min_reps (1-100, default 8), max_reps (1-100, default 12). Cross-field validation enforces `max_reps >= min_reps` via Zod `.refine()`. Submit calls `ProgramRepository.addExerciseAssignment`.

3. **ExerciseAssignmentList** — Renders assignments with exercise name (resolved from a `Map<string, string>` passed as prop), sets × reps display badge (e.g. "3 x 8-12"), up/down reorder buttons, and remove button. Deleted exercises show localized fallback text.

4. **Detail page wiring** — Updated `/programs/[id]/+page.svelte` to show `ExerciseAssignmentList` inline under each `TrainingDayCard`, with an "Add exercise" ghost button per training day. Added a second Drawer for the assignment form. Exercise names are resolved during `loadProgram()` by looking up each unique `exercise_id` via `ExerciseRepository.getById`.

## Verification

- `pnpm -r check` — TypeScript compiles. All 10 errors are pre-existing (ExerciseRepository.update type mismatch in tests, ExerciseForm type issues). Zero new errors from T04 files.
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — 55/55 tests pass
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — 17/17 tests pass
- `cd apps/mobile/messages && jq 'keys | length' de.json` → 110, `jq 'keys | length' en.json` → 110 (matching)
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no differences

### Slice-level verification status (intermediate task):
- ✅ Program repository tests pass (55/55)
- ✅ Database migration tests pass (17/17)
- ✅ TypeScript compilation succeeds (no new errors)
- ✅ i18n key counts match (110 each)

## Diagnostics

- Navigate to `/programs/[id]` with a valid program ID to see assignments listed under each training day
- `ProgramRepository.getById(id)` returns `ProgramWithDays` with nested `trainingDays[].assignments[]`
- Console errors prefixed `[ExercisePicker]` for exercise load failures, `[ExerciseAssignmentForm]` for add failures, `[Programs]` for reorder/remove failures
- Toast notifications provide user-visible feedback on all success/error paths
- Deleted exercises render as "[Gelöschte Übung]" (de) / "[Deleted exercise]" (en) in assignment list

## Deviations

None.

## Known Issues

- Pre-existing: 10 TypeScript errors in `exercise-repository.test.ts` (8), `repositories/exercise.ts` (1), and `ExerciseForm.svelte` (2) — all related to `ExerciseRepository.update` type signature and enum type narrowing. Not introduced by T04.

## Files Created/Modified

- `apps/mobile/src/lib/components/programs/ExercisePicker.svelte` — New: exercise selection Drawer with search and muscle group filter
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte` — New: two-step assignment form with Superforms SPA validation
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — New: assignment list with reorder/remove, sets×reps display
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — Modified: wired assignment list/form into training day display, added exercise name resolution
- `apps/mobile/messages/de.json` — Added 16 new assignment/picker keys (94→110)
- `apps/mobile/messages/en.json` — Added 16 matching English translations (94→110)
