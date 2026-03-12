---
id: T03
parent: S02
milestone: M001
provides:
  - /programs/[id] route with program detail page
  - TrainingDayCard component with reorder and remove
  - TrainingDayForm component (Superforms SPA) for adding training days
  - 18 new i18n keys in de.json and en.json for training day management
key_files:
  - src/routes/programs/[id]/+page.svelte
  - src/routes/programs/[id]/+layout.ts
  - src/lib/components/programs/TrainingDayCard.svelte
  - src/lib/components/programs/TrainingDayForm.svelte
key_decisions:
  - page.params.id cast to string (route guarantees it exists in [id] segment)
  - TrainingDayCard uses external reorder buttons (up/down) alongside card, not drag-and-drop, matching mobile-first interaction pattern
  - onclick handler on TrainingDayCard is a no-op for now (T04 will wire it to exercise assignment view)
patterns_established:
  - Detail page pattern: $effect DB init → load by ID from params → loading/error/content states → back button to list → FAB + Drawer for child creation
  - Reorder pattern: clone array → swap → extract IDs → call repository.reorder → reload
observability_surfaces:
  - Console error prefix [Programs] for detail load/init failures
  - Console error prefix [ProgramForm] for training day add failures
  - Toast notifications for action success/failure (remove, create)
  - Null program → error state rendered in UI
duration: 25min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Program detail page with training day management

**Built /programs/[id] detail page with training day list, add-day Drawer form, up/down reorder, and soft-delete with 18 new i18n keys.**

## What Happened

Created the program detail route at `/programs/[id]` following the established page pattern from T02's programs list. The page loads a program by ID with nested training days via `ProgramRepository.getById()`, displays program name/description with a back-to-list button, and renders training days as cards with reorder and remove controls.

TrainingDayCard shows day name and exercise count badge, with up/down chevron buttons (disabled at boundaries) and a trash button. TrainingDayForm uses Superforms SPA with `zod4Client(trainingDayInsertSchema)` for the name field, matching ProgramForm's pattern exactly.

Reorder is implemented by cloning the training days array, swapping adjacent items, extracting the ID sequence, and calling `ProgramRepository.reorderTrainingDays`. Remove calls `ProgramRepository.removeTrainingDay` (soft-delete) and reloads.

Added 18 i18n keys to both de.json and en.json covering detail page labels, training day form, and card actions.

## Verification

- `pnpm -r check` — TypeScript compiles. All 10 errors are pre-existing in ExerciseForm.svelte and exercise-repository.test.ts (none from T03 files)
- `cd apps/mobile/messages && jq 'keys | length' de.json` → 94, `jq 'keys | length' en.json` → 94 — keys match exactly, diff confirms identical key sets
- `pnpm paraglide:compile` — succeeds, message functions generated
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — 54/55 pass (1 pre-existing mesocycle default value failure)
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — 17/17 pass

## Diagnostics

- Navigate to `/programs/[id]` with a valid program ID to see training days render
- `ProgramRepository.getById(id)` returns `ProgramWithDays` with nested `trainingDays[].assignments[]`
- Console errors prefixed `[Programs]` for load/init failures, `[ProgramForm]` for add-day failures
- Error state displays in UI when program is null or load fails
- Toast notifications on create success, remove success, and action errors

## Deviations

- TrainingDayCard `onclick` is wired as a no-op (`() => {}`) since T04 will add exercise assignment navigation/expansion
- Added 18 keys (plan said ~17) — the count aligns with actual UI needs

## Known Issues

- Pre-existing: 10 TypeScript errors in ExerciseForm.svelte and exercise-repository.test.ts (not from this task)
- Pre-existing: 1 program-repository test failure (mesocycle default value mismatch)

## Files Created/Modified

- `src/routes/programs/[id]/+layout.ts` — SPA prerender config
- `src/routes/programs/[id]/+page.svelte` — program detail page with training day management
- `src/lib/components/programs/TrainingDayCard.svelte` — training day card with reorder + remove
- `src/lib/components/programs/TrainingDayForm.svelte` — add training day form (Superforms SPA)
- `apps/mobile/messages/de.json` — 18 new training day-related i18n keys
- `apps/mobile/messages/en.json` — matching English translations
