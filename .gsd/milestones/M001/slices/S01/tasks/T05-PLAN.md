---
estimated_steps: 4
estimated_files: 5
---

# T05: Add custom exercise creation form

**Slice:** S01 — Data Layer & Exercise Library
**Milestone:** M001

## Description

Complete the exercise library feature by adding custom exercise creation. Users need to add exercises not in the curated library — this is part of R001 (custom exercise creation). The form is extracted into its own component per AGENTS.md rules, uses superforms in SPA mode with the `zod4Client` adapter, and renders inside a Drawer. On successful creation, the new exercise appears in the browse list and persists across reloads.

## Steps

1. **Create ExerciseForm component** (`src/lib/components/exercises/ExerciseForm.svelte`): Use `superForm` with `SPA: true` and `validators: zod4Client(exerciseInsertSchema)`. Form fields:
   - Name: text Input (required)
   - Description: textarea or text Input (optional)
   - Primary muscle group: native-select or Select with MuscleGroup enum values (required)
   - Secondary muscle groups: multi-select using checkboxes or a Popover with toggleable Badges (optional)
   - Equipment: native-select or Select with Equipment enum values (required)
   - Is compound: checkbox (optional, defaults false)
   
   Use shadcn-svelte form components (Form.Field, Form.Control, Form.Label, Form.FieldErrors). Handle submission in `onUpdate` callback: call `ExerciseRepository.create()`, show success toast via `svelte-sonner`, invoke an `oncreated` callback prop to signal the parent to refresh.

2. **Wire form into exercises page**: Add a floating action button (FAB) or header button on the `/exercises` page that opens a Drawer containing the ExerciseForm. When `oncreated` fires, re-query exercises from the repository to update the list. Close the drawer on success.

3. **Add i18n keys**: Add all form labels, placeholders, validation error messages, button text, and success/error toast messages to `de.json` first, then `en.json`. Keys should follow a namespace pattern like `exercises_form_name_label`, `exercises_form_submit`, etc.

4. **Verify end-to-end flow**: Create button → drawer opens → fill form → submit → new exercise appears in list → filter/search finds it → page reload preserves it. Also verify: form validation shows errors for missing required fields, selecting muscle group and equipment works correctly.

## Must-Haves

- [ ] ExerciseForm is its own extracted Svelte component (not inlined in page)
- [ ] Uses superforms SPA mode with `zod4Client` adapter
- [ ] Uses shadcn-svelte form components (Form.Field, Form.Control, Form.Label, Form.FieldErrors)
- [ ] Form renders inside a Drawer
- [ ] All required fields validated (name, muscle_group, equipment)
- [ ] On submit: creates exercise via repository, shows toast, closes drawer, refreshes list
- [ ] New custom exercise appears in browse/search/filter results
- [ ] Custom exercise persists across page reload
- [ ] All form strings in `de.json` and `en.json`

## Verification

- Dev server: create button visible on exercises page → opens drawer with form
- Fill required fields → submit → success toast → drawer closes → new exercise in list
- Missing required field → submit → validation error shown inline
- Reload page → custom exercise still present
- Search for custom exercise name → found
- Filter by custom exercise's muscle group → included in results

## Observability Impact

- Signals added/changed: Toast notifications (success/error) on form submission provide user-visible feedback
- How a future agent inspects this: Check for custom exercises via `ExerciseRepository.getAll()` with `is_custom = 1`; browser toast messages indicate form submission results
- Failure state exposed: Zod validation errors render inline in form; repository/DB errors caught in onUpdate handler and shown as error toast

## Inputs

- `src/lib/db/repositories/exercise.ts` — ExerciseRepository.create() from T02
- `src/lib/types/exercise.ts` — exerciseInsertSchema, MuscleGroup, Equipment from T01
- `src/routes/exercises/+page.svelte` — page to wire the create trigger into (from T04)
- `packages/ui/src/components/ui/form/` — formsnap components
- `packages/ui/src/components/ui/drawer/` — Drawer component

## Expected Output

- `apps/mobile/src/lib/components/exercises/ExerciseForm.svelte` — complete form component
- `apps/mobile/src/routes/exercises/+page.svelte` — updated with create button and drawer integration
- `apps/mobile/messages/de.json` — updated with form-related keys
- `apps/mobile/messages/en.json` — updated with form-related translations
