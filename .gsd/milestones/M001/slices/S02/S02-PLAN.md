# S02: Programs & Mesocycles

**Goal:** Users can create structured training programs with named training days, assign exercises with target rep ranges and set counts, and define mesocycle parameters (week count + deload week position). All data persists in SQLite.
**Demo:** Create a program "Push/Pull/Legs" → add 3 training days → assign exercises with sets/rep ranges to each day → define a 6-week mesocycle with deload on week 6 → close and reopen app → program loads with all data intact.

## Must-Haves

- Program CRUD: create, read, update, soft-delete programs with name + description
- Training day CRUD: create, reorder, soft-delete training days within a program
- Exercise assignment CRUD: assign exercises to training days with target_sets, min_reps, max_reps, sort_order; reorder with up/down
- Mesocycle creation: attach mesocycle to program with weeks_count, deload_week_number, optional start_date; fields for current_week that S03 can consume
- Schema v2 migration: new tables added idempotently, existing v1 databases upgraded seamlessly
- Transactions for multi-table inserts (program + training days + assignments)
- All CRUD validated with Zod v4 schemas
- Repository as plain object (not class), following ExerciseRepository pattern
- UI: /programs list page, program detail/edit, training day management, exercise assignment via exercise picker (reusing S01 filter/search), mesocycle form
- i18n: German keys added for all new UI, English translations maintained in sync

## Proof Level

- This slice proves: integration (real SQLite CRUD via mock plugin, schema migration, full repository layer exercised through tests)
- Real runtime required: no (tests use sql.js mock; UI verified visually by user outside GSD)
- Human/UAT required: no (data layer contract is proven by tests; UI is standard Svelte composition following S01 patterns)

## Verification

- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — all program repository tests pass (CRUD lifecycle, training days, exercise assignments, mesocycle, transactions, validation, edge cases)
- `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/database.test.ts` — schema v2 migration tests pass alongside existing v1 tests
- `pnpm -r check` — TypeScript compilation succeeds with all new types and components
- i18n key count check: `cd apps/mobile/messages && jq 'keys | length' de.json` and `jq 'keys | length' en.json` return the same count

## Observability / Diagnostics

- Runtime signals: `[DB]` prefixed log messages from database.ts for schema migration (from/to version logged). Repository methods throw Zod validation errors with structured error messages on bad input.
- Inspection surfaces: `dbState()` function returns connection status. `schema_version` table stores applied migration versions with timestamps. Repository methods return null for missing entities (not exceptions).
- Failure visibility: Schema migration failures throw with the failing SQL statement in the error message. Transaction rollback on multi-table insert failure. Zod parse errors include field-level detail.
- Redaction constraints: None — no secrets or PII in program data.

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/database.ts` (getDb, dbExecute, dbQuery), `src/lib/types/common.ts` (UUID, Timestamp, SoftDeletable), `src/lib/types/exercise.ts` (Exercise type for assignment FK), `src/lib/db/repositories/exercise.ts` (ExerciseRepository for exercise picker in UI)
- New wiring introduced in this slice: `src/lib/db/repositories/program.ts` (ProgramRepository), `src/lib/types/program.ts` (Program, TrainingDay, ExerciseAssignment, Mesocycle types + Zod schemas), schema v2 tables in `schema.sql`, `/programs` route tree, program component library
- What remains before the milestone is truly usable end-to-end: S03 (workout logging against program days), S04 (history/body weight), S05 (onboarding templates feeding into ProgramRepository), S06 (design polish, native builds), S07 (full i18n)

## Tasks

- [x] **T01: Program types, schema v2, and repository with tests** `est:2h`
  - Why: The data layer is the foundation — types, schema tables, and repository must exist and be proven before any UI can consume them. Tests must cover the full contract (CRUD, transactions, validation, edge cases) that S03 and S05 depend on.
  - Files: `src/lib/types/program.ts`, `src/lib/db/schema.sql`, `src/lib/db/database.ts`, `src/lib/db/repositories/program.ts`, `src/lib/db/__tests__/program-repository.test.ts`
  - Do: Define Program/TrainingDay/ExerciseAssignment/Mesocycle interfaces + Zod v4 insert/update schemas following exercise.ts pattern. Add 4 new tables to schema.sql (programs, training_days, exercise_assignments, mesocycles) with UUID PKs, timestamps, soft-delete, FK indexes. Bump CURRENT_SCHEMA_VERSION to 2 in database.ts. Build ProgramRepository as plain object with: createProgram (with training days + assignments in transaction), getAll, getById (with nested training days + assignments), update, softDelete, addTrainingDay, updateTrainingDay, removeTrainingDay, reorderTrainingDays, addExerciseAssignment, updateExerciseAssignment, removeExerciseAssignment, reorderExerciseAssignments, createMesocycle, getMesocycleByProgramId, updateMesocycle. Write comprehensive tests using existing test-helpers.ts mock.
  - Verify: `cd apps/mobile && pnpm vitest run src/lib/db/__tests__/program-repository.test.ts` — all tests pass
  - Done when: ProgramRepository passes 30+ tests covering full CRUD lifecycle, nested entities, transaction atomicity, validation errors, soft-delete filtering, and mesocycle operations

- [x] **T02: Programs list page and create program flow** `est:1.5h`
  - Why: The first UI surface — users need to see their programs and create new ones. Follows the exercises page pattern (FAB, Drawer, Superforms SPA).
  - Files: `src/routes/programs/+page.svelte`, `src/routes/programs/+layout.ts`, `src/lib/components/programs/ProgramForm.svelte`, `src/lib/components/programs/ProgramCard.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Create /programs route with SPA prerender. Build ProgramCard component (name, description, training day count, mesocycle status). Build ProgramForm with Superforms SPA (name + description fields, zod4Client validator). Programs list page follows exercises page pattern: $effect for DB init, loading/empty/error states, FAB to open create Drawer. Add all German i18n keys first, then English translations. Ensure createProgram in form calls ProgramRepository.createProgram.
  - Verify: `pnpm -r check` passes. Visual: /programs page renders, create form validates and submits.
  - Done when: User can view list of programs, create a new program with name/description via Drawer form, and see it appear in the list

- [x] **T03: Program detail page with training day management** `est:1.5h`
  - Why: After creating a program, users need to view it, add/reorder/remove training days, and navigate to exercise assignment. This is the core program editing experience.
  - Files: `src/routes/programs/[id]/+page.svelte`, `src/routes/programs/[id]/+layout.ts`, `src/lib/components/programs/TrainingDayForm.svelte`, `src/lib/components/programs/TrainingDayCard.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Create /programs/[id] route that loads program by ID with nested training days. TrainingDayForm in a Drawer (Superforms SPA: name field). TrainingDayCard shows day name, exercise count, up/down reorder buttons. Program detail page shows program name/description at top, list of training days, FAB to add training day. Implement reorder via ProgramRepository.reorderTrainingDays. Implement soft-delete via swipe or button. Add German i18n keys, sync English.
  - Verify: `pnpm -r check` passes. Visual: program detail shows training days, add/reorder/remove works.
  - Done when: User can view a program's training days, add new days via Drawer, reorder them with up/down buttons, and remove days

- [x] **T04: Exercise assignment to training days with exercise picker** `est:1.5h`
  - Why: Training days need exercises with target sets and rep ranges. This reuses S01's exercise search/filter infrastructure in an exercise picker Drawer, completing the program→day→exercise hierarchy.
  - Files: `src/lib/components/programs/ExerciseAssignmentList.svelte`, `src/lib/components/programs/ExerciseAssignmentForm.svelte`, `src/lib/components/programs/ExercisePicker.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Build ExercisePicker component that reuses ExerciseRepository.combinedFilter with search + muscle group filter in a Drawer — user taps an exercise to select it. ExerciseAssignmentForm (Superforms SPA): target_sets (number stepper, default 3), min_reps + max_reps (number inputs), auto-fills exercise name. ExerciseAssignmentList renders assignments within a training day card with sort_order, up/down reorder buttons, remove button. Wire into program detail page: each TrainingDayCard expands or links to show its assignments. Add German i18n keys, sync English.
  - Verify: `pnpm -r check` passes. Visual: user can pick an exercise, set reps/sets, see assignments listed under training day.
  - Done when: User can add exercises to a training day with target sets and rep ranges, reorder them, and remove them

- [x] **T05: Mesocycle form and i18n completion** `est:1h`
  - Why: Completes R002 by adding mesocycle definition (weeks_count, deload_week), and ensures all i18n keys are fully synchronized. This is the final piece that makes the program a mesocycle-driven template.
  - Files: `src/lib/components/programs/MesocycleForm.svelte`, `src/routes/programs/[id]/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Build MesocycleForm (Superforms SPA): weeks_count (number stepper, 1-52, default 4), deload_week_number (number select, 0=none, 1..weeks_count), optional start_date (date input). Wire into program detail page — section below training days showing mesocycle config. If mesocycle exists, show current values with edit button; if not, show "Define mesocycle" button that opens MesocycleForm Drawer. On save, call ProgramRepository.createMesocycle or updateMesocycle. Final i18n audit: verify de.json and en.json have identical key counts and all new keys are present. Add any missing keys.
  - Verify: `pnpm -r check` passes. `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`. Visual: mesocycle section shows on program detail, form validates and persists.
  - Done when: User can define a mesocycle with week count and deload week for a program, mesocycle data persists, and all i18n keys are synchronized between de and en

## Files Likely Touched

- `src/lib/types/program.ts` — new file: Program, TrainingDay, ExerciseAssignment, Mesocycle interfaces + Zod schemas
- `src/lib/db/schema.sql` — add programs, training_days, exercise_assignments, mesocycles tables
- `src/lib/db/database.ts` — bump CURRENT_SCHEMA_VERSION to 2
- `src/lib/db/repositories/program.ts` — new file: ProgramRepository
- `src/lib/db/__tests__/program-repository.test.ts` — new file: comprehensive repository tests
- `src/routes/programs/+page.svelte` — new file: programs list page
- `src/routes/programs/+layout.ts` — new file: SPA prerender
- `src/routes/programs/[id]/+page.svelte` — new file: program detail/edit page
- `src/routes/programs/[id]/+layout.ts` — new file: SPA prerender
- `src/lib/components/programs/ProgramForm.svelte` — new file
- `src/lib/components/programs/ProgramCard.svelte` — new file
- `src/lib/components/programs/TrainingDayForm.svelte` — new file
- `src/lib/components/programs/TrainingDayCard.svelte` — new file
- `src/lib/components/programs/ExerciseAssignmentList.svelte` — new file
- `src/lib/components/programs/ExerciseAssignmentForm.svelte` — new file
- `src/lib/components/programs/ExercisePicker.svelte` — new file
- `src/lib/components/programs/MesocycleForm.svelte` — new file
- `apps/mobile/messages/de.json` — add program/training day/mesocycle i18n keys
- `apps/mobile/messages/en.json` — sync with de.json
