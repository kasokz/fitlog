---
id: T04
parent: S04
milestone: M001
provides:
  - /bodyweight route with body weight entry list, drawer form, and delete functionality
  - BodyWeightForm component using Superforms SPA mode with zod4 validation
  - BodyWeightList component with AlertDialog delete confirmation
  - 21 bodyweight_* German i18n keys
key_files:
  - apps/mobile/src/routes/bodyweight/+page.svelte
  - apps/mobile/src/routes/bodyweight/+layout.ts
  - apps/mobile/src/lib/components/bodyweight/BodyWeightForm.svelte
  - apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Form defaults weight_kg to 0 rather than empty — ensures numeric input type works correctly with Superforms bind:value
patterns_established:
  - Body weight page follows exercises page pattern: init DB in $effect, load via repository, loading/empty/error states, FAB button opens Drawer with form component
  - BodyWeightList uses AlertDialog for delete confirmation with deleteTarget state pattern (same as workout finish dialog)
observability_surfaces:
  - "[BodyWeight] Load failed:" and "[BodyWeight] Init failed:" console error prefixes on page load failures
  - "[BodyWeight] Delete failed:" console error prefix on delete failures
  - "[BodyWeightForm] Save failed:" console error prefix on form submission failures
  - Toast notifications for success/error on save and delete operations
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Body weight UI — list, form, and route with i18n

**Built the /bodyweight route with entry list, Superforms drawer form for logging weight, AlertDialog delete confirmation, and 21 German i18n keys.**

## What Happened

Created the complete body weight logging and viewing experience following existing page/form patterns:

1. Added 21 `bodyweight_*` i18n keys to `de.json` covering title, loading, empty state, form labels, success/error toasts, delete confirmation, and unit.

2. Created `/bodyweight` route with `+layout.ts` (ssr=false) and `+page.svelte` following the exercises page pattern — init DB in `$effect`, load entries via `BodyWeightRepository.getAll()`, loading/empty/error states, FAB button opening a Drawer with the form.

3. Created `BodyWeightForm.svelte` using Superforms SPA mode with `zod4`/`zod4Client` adapters for `bodyWeightInsertSchema`. Form has date (defaulting to today YYYY-MM-DD) and weight_kg (number with step 0.1) fields. On successful submit, calls `BodyWeightRepository.log()`, shows toast, and calls parent callback.

4. Created `BodyWeightList.svelte` rendering entries as Card components with weight, formatted date, and a delete button per entry. Delete triggers AlertDialog confirmation, then calls parent `ondelete` callback. Page handler performs soft-delete via `BodyWeightRepository.deleteEntry()` with toast feedback.

## Verification

- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^"bodyweight_'` → **21** (>= 10 required)
- `ls apps/mobile/src/routes/bodyweight/` → `+layout.ts`, `+page.svelte` exist
- `pnpm --filter mobile build` → **build succeeds** with no type errors

**Slice-level checks (all pass on this final task):**
- `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` → 180 tests passed
- `pnpm --filter mobile test -- --run src/lib/db/__tests__/workout-repository.test.ts` → 180 tests passed
- `pnpm --filter mobile build` → succeeds
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^"history_'` → 15
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^"bodyweight_'` → 21

## Diagnostics

- Navigate to `/bodyweight` to see entry list; empty state shows when no entries exist
- Open drawer via FAB button to log weight; form submits via BodyWeightRepository.log()
- Console errors prefixed with `[BodyWeight]` or `[BodyWeightForm]` on failures
- Toast notifications surface success/error for save and delete operations
- BodyWeightRepository methods have `[BodyWeight]` structured logging from T01

## Deviations

- Added `bodyweight_form_submit` and `bodyweight_form_submitting` keys not in the original plan's key list — needed for the form submit button following ExerciseForm pattern.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/de.json` — added 21 bodyweight_* i18n keys
- `apps/mobile/src/routes/bodyweight/+layout.ts` — ssr=false layout
- `apps/mobile/src/routes/bodyweight/+page.svelte` — body weight page with list, drawer, FAB
- `apps/mobile/src/lib/components/bodyweight/BodyWeightForm.svelte` — Superforms SPA form (date + weight_kg)
- `apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte` — entry list with delete confirmation
