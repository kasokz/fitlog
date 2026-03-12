---
estimated_steps: 4
estimated_files: 5
---

# T05: Mesocycle form and i18n completion

**Slice:** S02 — Programs & Mesocycles
**Milestone:** M001

## Description

Add mesocycle definition to the program detail page — users set weeks_count and deload_week_number — and perform the final i18n audit to ensure de.json and en.json are fully synchronized. This completes R002 by adding the mesocycle dimension to programs, making them ready for S03 (workout logging with week tracking) and S05 (templates with mesocycle config).

## Steps

1. **Build MesocycleForm component** — `src/lib/components/programs/MesocycleForm.svelte`:
   - Superforms SPA: `defaults(zod4(mesocycleInsertSchema))`, `superForm({ SPA: true, validators: zod4Client(mesocycleInsertSchema), onUpdate })`
   - Fields:
     - weeks_count: number stepper (1-52, default 4) — "How many weeks in this mesocycle?"
     - deload_week_number: number select (0=none, 1..weeks_count) — "Which week is the deload?" Options dynamically update when weeks_count changes.
     - start_date: optional date input — "When does this mesocycle start?" (nullable, S03 can set it when workout logging begins)
   - Validation: deload_week_number <= weeks_count (enforced in Zod schema via refine or in onUpdate)
   - Props: `programId: string`, `existingMesocycle?: Mesocycle`, `onsaved: () => void`
   - If existingMesocycle provided, pre-fill form values and call updateMesocycle on submit; otherwise call createMesocycle
   - onUpdate: create or update via ProgramRepository, toast.success, call onsaved

2. **Wire mesocycle section into program detail page** — Update `src/routes/programs/[id]/+page.svelte`:
   - Add "Mesocycle" section below training days list
   - If program has a mesocycle (via getById response): show mesocycle card with weeks_count, deload_week display, current_week, edit button
   - If no mesocycle: show "Define mesocycle" button
   - Both open MesocycleForm in a Drawer (create mode vs edit mode based on existing data)
   - After save, refresh program data

3. **Add all remaining i18n keys** — Update `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json`:
   - Mesocycle keys: programs_mesocycle_title, programs_mesocycle_empty, programs_mesocycle_empty_description, programs_mesocycle_define, programs_mesocycle_edit, programs_mesocycle_weeks_count_label, programs_mesocycle_deload_week_label, programs_mesocycle_deload_none, programs_mesocycle_start_date_label, programs_mesocycle_start_date_placeholder, programs_mesocycle_form_title, programs_mesocycle_form_description, programs_mesocycle_submit, programs_mesocycle_submitting, programs_mesocycle_success, programs_mesocycle_error, programs_mesocycle_weeks_display, programs_mesocycle_deload_display, programs_mesocycle_current_week_display

4. **Final i18n audit** — Verify all keys are synchronized:
   - Run key count comparison: both files must have identical key counts
   - Verify no keys exist in en.json that are missing from de.json (and vice versa)
   - Spot-check that German translations use proper Umlaute (ä, ö, ü, not ae, oe, ue)
   - Verify parameter names match across languages (e.g. {count}, {weeks})

## Must-Haves

- [ ] MesocycleForm uses Superforms SPA with zod4Client validation
- [ ] weeks_count stepper (1-52) and deload_week_number select (0..weeks_count) work correctly
- [ ] deload_week_number dynamically bounded by weeks_count
- [ ] Create vs edit mode based on existing mesocycle
- [ ] Mesocycle section visible on program detail page with appropriate empty/populated states
- [ ] de.json and en.json have identical key counts with no missing keys
- [ ] All German translations use proper Umlaute

## Verification

- `pnpm -r check` — TypeScript compiles cleanly
- `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json` — both files have identical key counts
- `cd apps/mobile/messages && diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no diff (identical key sets)
- Visual: open program detail, define mesocycle with 6 weeks and deload on week 6, save, see mesocycle displayed, edit it

## Observability Impact

- Signals added/changed: Console error on mesocycle save failure. Toast feedback on success/error.
- How a future agent inspects this: Check ProgramRepository.getMesocycleByProgramId(). Navigate to program detail and verify mesocycle section.
- Failure state exposed: Toast on failure. Invalid deload_week caught by form validation before submit.

## Inputs

- `src/lib/db/repositories/program.ts` — createMesocycle, getMesocycleByProgramId, updateMesocycle from T01
- `src/lib/types/program.ts` — Mesocycle, mesocycleInsertSchema, mesocycleUpdateSchema from T01
- `src/routes/programs/[id]/+page.svelte` — program detail page from T03/T04 (add mesocycle section)
- `apps/mobile/messages/de.json` — existing keys from T02-T04

## Expected Output

- `src/lib/components/programs/MesocycleForm.svelte` — mesocycle configuration form
- `src/routes/programs/[id]/+page.svelte` — updated with mesocycle section
- `apps/mobile/messages/de.json` — ~19 new mesocycle keys + audit clean
- `apps/mobile/messages/en.json` — fully synchronized with de.json
