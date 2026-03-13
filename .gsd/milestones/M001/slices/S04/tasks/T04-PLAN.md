---
estimated_steps: 5
estimated_files: 5
---

# T04: Body weight UI — list, form, and route with i18n

**Slice:** S04 — Workout History & Body Weight
**Milestone:** M001

## Description

Build the body weight logging and viewing experience: a page showing logged entries sorted by date, a Superforms-based form in a Drawer for adding/updating entries, and delete capability. Follows existing form and page patterns exactly.

## Steps

1. Add `bodyweight_*` i18n keys to `apps/mobile/messages/de.json`:
   - `bodyweight_title` ("Körpergewicht"), `bodyweight_loading` ("Gewicht wird geladen..."), `bodyweight_empty_title` ("Noch keine Einträge"), `bodyweight_empty_description` ("Erfasse dein erstes Gewicht, um deinen Verlauf zu sehen."), `bodyweight_add` ("Gewicht erfassen"), `bodyweight_form_title` ("Gewicht eintragen"), `bodyweight_form_description` ("Trage dein aktuelles Körpergewicht ein."), `bodyweight_form_date_label` ("Datum"), `bodyweight_form_weight_label` ("Gewicht (kg)"), `bodyweight_form_success` ("Gewicht gespeichert"), `bodyweight_form_error` ("Fehler beim Speichern"), `bodyweight_delete_title` ("Eintrag löschen?"), `bodyweight_delete_description` ("Dieser Eintrag wird gelöscht."), `bodyweight_delete_confirm` ("Löschen"), `bodyweight_delete_cancel` ("Abbrechen"), `bodyweight_delete_success` ("Eintrag gelöscht"), `bodyweight_delete_error` ("Fehler beim Löschen"), `bodyweight_unit_kg` ("kg"), `bodyweight_back` ("Zurück")

2. Create `src/routes/bodyweight/+layout.ts` with `export const ssr = false;`.

3. Create `src/lib/components/bodyweight/BodyWeightForm.svelte`:
   - Uses Superforms SPA mode: `superForm(defaults(zod4(bodyWeightInsertSchema)), { SPA: true, validators: zod4Client(bodyWeightInsertSchema), ... })`
   - Fields: date (Input type="date", default today YYYY-MM-DD), weight_kg (Input type="number", step="0.1")
   - onUpdate handler calls `BodyWeightRepository.log(date, weightKg)`
   - Success: toast + callback to parent; Error: toast error
   - Uses Form.Field, Form.Control, Form.Label, Input from shadcn-svelte

4. Create `src/lib/components/bodyweight/BodyWeightList.svelte`:
   - Props: entries (BodyWeightEntry[]), ondelete callback
   - Renders each entry as a row/card: formatted date, weight in kg
   - Swipe-to-delete or delete button per entry
   - Delete triggers AlertDialog confirmation, then calls ondelete callback
   - Uses Card components and AlertDialog from shadcn-svelte

5. Create `src/routes/bodyweight/+page.svelte`:
   - Follow exercises/+page.svelte pattern: init DB in $effect, load data, loading/empty/error states
   - Load entries via `BodyWeightRepository.getAll()`
   - Render BodyWeightList component
   - FAB button opens Drawer with BodyWeightForm
   - On form success or delete, refresh the list
   - Back button to `/`
   - Empty state with scale icon and message

## Must-Haves

- [ ] /bodyweight route shows body weight entries sorted by date descending
- [ ] Drawer with Superforms-based form for logging weight (date + weight_kg fields)
- [ ] Form defaults to today's date
- [ ] Successful log refreshes the list and shows toast
- [ ] Delete entry with AlertDialog confirmation and soft-delete
- [ ] Empty state when no entries exist
- [ ] Loading and error states
- [ ] All text uses i18n keys from de.json

## Verification

- `pnpm --filter mobile build` — build succeeds with no type errors
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^bodyweight_'` returns >= 10
- Route files exist: `src/routes/bodyweight/+page.svelte`

## Observability Impact

- Signals added/changed: None — UI pages use BodyWeightRepository which has `[BodyWeight]` logging from T01
- How a future agent inspects this: Navigate to /bodyweight route; form submission triggers repository log with console output
- Failure state exposed: Toast errors on failed save/delete; error state in UI for load failures

## Inputs

- `src/lib/db/repositories/bodyweight.ts` — BodyWeightRepository (from T01)
- `src/lib/types/bodyweight.ts` — BodyWeightEntry, bodyWeightInsertSchema (from T01)
- `src/lib/components/exercises/ExerciseForm.svelte` — Superforms SPA pattern reference
- `src/routes/exercises/+page.svelte` — page pattern reference (drawer + list + FAB)
- `apps/mobile/messages/de.json` — existing i18n keys

## Expected Output

- `src/routes/bodyweight/+page.svelte` — body weight page with list + drawer
- `src/routes/bodyweight/+layout.ts` — ssr=false
- `src/lib/components/bodyweight/BodyWeightForm.svelte` — Superforms SPA form
- `src/lib/components/bodyweight/BodyWeightList.svelte` — entry list with delete
- `apps/mobile/messages/de.json` — bodyweight_* keys added
