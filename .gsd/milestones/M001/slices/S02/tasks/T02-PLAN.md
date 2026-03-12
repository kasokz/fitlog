---
estimated_steps: 4
estimated_files: 7
---

# T02: Programs list page and create program flow

**Slice:** S02 — Programs & Mesocycles
**Milestone:** M001

## Description

Build the first UI surface for programs: a list page at `/programs` that shows all programs with FAB to create, and a create-program Drawer form using Superforms SPA. Follows the exact same page structure and component patterns established in the exercises page (S01).

## Steps

1. **Create route files** — `src/routes/programs/+layout.ts` with `export const prerender = true; export const ssr = false;` (matches exercises pattern). Create `src/routes/programs/+page.svelte` as the programs list page.

2. **Build ProgramCard component** — `src/lib/components/programs/ProgramCard.svelte`:
   - Props: `program: ProgramWithDays`, `onclick: () => void`
   - Display: program name, description (truncated), training day count badge, mesocycle status (if exists: "X weeks" badge)
   - Use Card/CardContent from @repo/ui, Badge for metadata
   - Follow ExerciseCard pattern (button wrapper, Card with transition)

3. **Build ProgramForm component** — `src/lib/components/programs/ProgramForm.svelte`:
   - Superforms SPA setup: `defaults(zod4(programInsertSchema))`, `superForm({ SPA: true, validators: zod4Client(programInsertSchema), onUpdate })`
   - Fields: name (Input, required), description (Textarea, optional)
   - onUpdate calls `ProgramRepository.createProgram()`, shows toast.success, calls `oncreated` prop
   - Follow ExerciseForm pattern exactly (Form.Field, Form.Control, Form.Label, Form.FieldErrors, Form.Button)

4. **Build programs list page** — `src/routes/programs/+page.svelte`:
   - State: programs array, loading, error (same pattern as exercises page)
   - $effect for DB init + loadPrograms
   - Loading spinner, empty state, error state using Empty components
   - ProgramCard list with onclick navigating to /programs/[id]
   - FAB (fixed bottom-right Button) opens create Drawer
   - Create Drawer wraps ProgramForm, refreshes list on created
   - Add i18n keys to `de.json` first: programs_title, programs_count, programs_loading, programs_empty_title, programs_empty_description, programs_create_button, programs_form_title, programs_form_description, programs_form_name_label, programs_form_name_placeholder, programs_form_description_label, programs_form_description_placeholder, programs_form_submit, programs_form_submitting, programs_form_success, programs_form_error, programs_card_days_count, programs_card_mesocycle_weeks
   - Add matching English translations to `en.json`

## Must-Haves

- [ ] /programs route exists with SPA prerender
- [ ] ProgramCard shows program name, training day count, mesocycle info
- [ ] ProgramForm uses Superforms SPA with zod4Client validation (not zod/zodClient)
- [ ] Create Drawer follows S01 Drawer pattern (Drawer.Root, .Content, .Header, .Title, .Description)
- [ ] FAB button for creating programs (matches exercises page)
- [ ] Loading, empty, and error states handled
- [ ] All new i18n keys added to both de.json and en.json

## Verification

- `pnpm -r check` — TypeScript compiles with all new components and routes
- Visual: navigate to /programs, see empty state, create a program, see it in the list
- `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`

## Observability Impact

- Signals added/changed: Console error logging on load/create failure (matching exercises page pattern `[Programs] Load failed:`)
- How a future agent inspects this: Check /programs route renders. Check ProgramRepository.getAll() returns data.
- Failure state exposed: Error state displayed in UI with error message. Toast on create failure.

## Inputs

- `src/lib/db/repositories/program.ts` — ProgramRepository.getAll(), createProgram() from T01
- `src/lib/types/program.ts` — ProgramWithDays type, programInsertSchema from T01
- `src/routes/exercises/+page.svelte` — page structure pattern to follow
- `src/lib/components/exercises/ExerciseForm.svelte` — Superforms SPA pattern to follow
- `src/lib/components/exercises/ExerciseCard.svelte` — card component pattern to follow

## Expected Output

- `src/routes/programs/+layout.ts` — SPA prerender config
- `src/routes/programs/+page.svelte` — programs list page with create Drawer
- `src/lib/components/programs/ProgramForm.svelte` — create program form
- `src/lib/components/programs/ProgramCard.svelte` — program card component
- `apps/mobile/messages/de.json` — ~18 new program-related keys
- `apps/mobile/messages/en.json` — matching English translations
