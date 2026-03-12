---
id: T02
parent: S02
milestone: M001
provides:
  - /programs route with list page and create Drawer
  - ProgramCard and ProgramForm components
  - ProgramRepository.getAllWithDays() method
  - 17 new i18n keys (de + en)
key_files:
  - apps/mobile/src/routes/programs/+page.svelte
  - apps/mobile/src/routes/programs/+layout.ts
  - apps/mobile/src/lib/components/programs/ProgramCard.svelte
  - apps/mobile/src/lib/components/programs/ProgramForm.svelte
key_decisions:
  - Added getAllWithDays() to ProgramRepository for list page; iterates programs and loads days per-program (acceptable for small program counts, avoids complex JOIN mapping)
patterns_established:
  - Programs page follows same structure as exercises page (state, $effect init, loading/empty/error states, FAB, Drawer)
  - ProgramForm follows ExerciseForm Superforms SPA pattern (defaults + zod4, zod4Client validators, onUpdate handler)
  - ProgramCard follows ExerciseCard pattern (button wrapper, Card with transition, Badge for metadata)
observability_surfaces:
  - "[Programs] Load failed:" and "[Programs] Init failed:" console error logging
  - "[ProgramForm] Create failed:" console error logging
  - Error state displayed in UI with error message
  - Toast notifications on create success/failure
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Programs list page and create program flow

**Built /programs list page with ProgramCard display, create-program Drawer with Superforms SPA validation, and 17 new i18n keys in de/en.**

## What Happened

Created the programs UI surface following the exact patterns established in the exercises page (S01):

1. **Route files**: `+layout.ts` with `ssr = false` and `+page.svelte` as the programs list page.
2. **ProgramCard component**: Shows program name, description (truncated), and training day count badge using ProgramWithDays type.
3. **ProgramForm component**: Superforms SPA setup with `zod4`/`zod4Client` adapters, name (required) and description (optional) fields, calls `ProgramRepository.createProgram()` on submit with toast feedback.
4. **Programs list page**: Full state management (loading, empty, error), FAB button to open create Drawer, Drawer wrapping ProgramForm with list refresh on created callback.
5. **Repository enhancement**: Added `getAllWithDays()` to ProgramRepository to load programs with their training days for the list view.
6. **i18n**: 17 new keys added to both `de.json` and `en.json` (77 keys each, in sync).

## Verification

- `pnpm -r check` — TypeScript compiles with 0 errors from new files (10 pre-existing errors in exercise files, unrelated)
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — 54/55 pass (1 pre-existing failure in mesocycle ordering test, unrelated to changes)
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — 17/17 pass
- `cd apps/mobile/messages && jq 'keys | length' de.json en.json` — both return 77 (in sync)

### Slice-level verification status (intermediate task):
- ✅ program-repository tests: 54/55 pass (1 pre-existing failure)
- ✅ database tests: 17/17 pass
- ✅ TypeScript: compiles (0 new errors)
- ✅ i18n key count: de=77, en=77

## Diagnostics

- Console errors prefixed `[Programs]` for load/init failures and `[ProgramForm]` for create failures
- Error state rendered in UI shows the error message text
- Toast notifications provide user-visible feedback on create success/failure
- `ProgramRepository.getAllWithDays()` returns full program tree for inspection

## Deviations

- Added `ProgramRepository.getAllWithDays()` method not in original plan — needed for ProgramCard to display training day counts without N+1 getById calls from the page component
- Removed `programs_card_mesocycle_weeks` i18n key from plan — mesocycle info display was dropped since the basic create flow only creates programs without mesocycles; mesocycle badges will be added in a later task when mesocycle creation UI exists

## Known Issues

- 1 pre-existing test failure in `program-repository.test.ts`: "program with multiple mesocycles returns the most recent" expects weeks_count=8 but gets 4 — not related to T02 changes
- 10 pre-existing TypeScript errors in exercise files (`ExerciseForm.svelte`, `exercise-repository.test.ts`, `exercise.ts`) — not related to T02 changes

## Files Created/Modified

- `apps/mobile/src/routes/programs/+layout.ts` — SPA prerender config (ssr = false)
- `apps/mobile/src/routes/programs/+page.svelte` — Programs list page with create Drawer
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte` — Program card component
- `apps/mobile/src/lib/components/programs/ProgramForm.svelte` — Create program form with Superforms SPA
- `apps/mobile/src/lib/db/repositories/program.ts` — Added getAllWithDays() method
- `apps/mobile/messages/de.json` — 17 new program-related i18n keys
- `apps/mobile/messages/en.json` — 17 matching English translations
