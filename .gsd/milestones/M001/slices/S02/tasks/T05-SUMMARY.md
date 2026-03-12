---
id: T05
parent: S02
milestone: M001
provides:
  - MesocycleForm component with Superforms SPA create/edit mode
  - Mesocycle section on program detail page with empty/populated states
  - 19 new i18n keys for mesocycle feature in de.json and en.json
  - Full i18n audit pass — de.json and en.json synchronized at 129 keys each
key_files:
  - apps/mobile/src/lib/components/programs/MesocycleForm.svelte
  - apps/mobile/src/routes/programs/[id]/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Used native HTML select element for deload week picker instead of shadcn Select component — simpler binding with Superforms $formData, avoids extra abstraction for a simple numeric dropdown
  - Form-specific Zod schema with .refine() for deload_week_number <= weeks_count created inline in MesocycleForm (same pattern as ExerciseAssignmentForm) rather than modifying mesocycleInsertSchema in types
  - Used getInitialState() helper function to extract initial prop values and avoid Svelte 5 state_referenced_locally warnings when accessing props at module level for form initialization
patterns_established:
  - Edit mode form pattern: capture isEditMode/existingId via getInitialState() helper to avoid Svelte 5 state_referenced_locally warnings, pass to superForm config and onUpdate handler
  - Mesocycle section pattern: separate mesocycle state loaded via getMesocycleByProgramId, displayed as card (populated) or empty state + define button (empty), edited via Drawer
observability_surfaces:
  - Console error prefixed [MesocycleForm] on save failure
  - Toast notifications on mesocycle save success/error
  - ProgramRepository.getMesocycleByProgramId(programId) returns mesocycle state for inspection
duration: ~20min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T05: Mesocycle form and i18n completion

**Built MesocycleForm with Superforms SPA create/edit mode, wired mesocycle section into program detail page, added 19 i18n keys, and verified full de/en key synchronization at 129 keys.**

## What Happened

1. Created `MesocycleForm.svelte` with Superforms SPA validation using a form-specific Zod schema with `.refine()` for deload_week_number <= weeks_count. The form supports create and edit modes via `existingMesocycle` prop. Fields: weeks_count (number input 1-52), deload_week_number (native select 0..weeks_count, dynamically bounded), start_date (optional date input). The deload options array recomputes when weeks_count changes, and an `$effect` clamps deload_week_number if it exceeds the new weeks_count.

2. Updated program detail page (`/programs/[id]/+page.svelte`) with a Mesocycle section below training days. When no mesocycle exists: empty state with Timer icon and "Define mesocycle" button. When mesocycle exists: card showing weeks count, deload week, and current week with an edit button. Both open MesocycleForm in a Drawer. After save, program data is refreshed (which reloads the mesocycle).

3. Added 19 new i18n keys for mesocycle feature to both de.json and en.json.

4. Ran final i18n audit: both files have exactly 129 keys, diff shows identical key sets, all parameters match across languages, and German translations use proper Umlaute.

## Verification

- `pnpm -r check` — 10 errors (all pre-existing in exercise-repository.test.ts and ExerciseForm.svelte from prior slices), 0 warnings. No errors from new MesocycleForm or detail page changes.
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — 55 tests pass
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — 17 tests pass
- `cd apps/mobile/messages && jq 'keys | length' de.json` → 129, `jq 'keys | length' en.json` → 129 — identical key counts
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no diff (identical key sets)
- Parameter names verified matching across all keys via Python script

### Slice-level verification status (T05 is final task):
- [x] `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — 55 tests pass
- [x] `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — 17 tests pass
- [x] `pnpm -r check` — compiles with only pre-existing errors (none from S02 code)
- [x] i18n key count check — de.json (129) = en.json (129)

## Diagnostics

- Console error `[MesocycleForm] Save failed:` on mesocycle create/update failure
- Toast notifications provide user-visible feedback on success/error
- `ProgramRepository.getMesocycleByProgramId(programId)` returns current mesocycle or null
- Navigate to `/programs/[id]` to see mesocycle section rendered below training days

## Deviations

- Used native HTML `<select>` element for deload week picker instead of shadcn Select component (plan said "number select"). Native select integrates more cleanly with Superforms `$formData` binding and is simpler for a numeric dropdown. The styling matches the design system via Tailwind classes.

## Known Issues

- Pre-existing TypeScript errors in `exercise-repository.test.ts` (8 errors) and `ExerciseForm.svelte` (2 errors) from prior slices — not introduced by this task.

## Files Created/Modified

- `apps/mobile/src/lib/components/programs/MesocycleForm.svelte` — new: mesocycle configuration form with Superforms SPA, create/edit mode, dynamic deload options
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — modified: added mesocycle section (empty/populated states), mesocycle Drawer, mesocycle state loading
- `apps/mobile/messages/de.json` — modified: added 19 mesocycle i18n keys (129 total)
- `apps/mobile/messages/en.json` — modified: added 19 mesocycle i18n keys (129 total, synchronized with de.json)
