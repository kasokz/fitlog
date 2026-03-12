# S02: Programs & Mesocycles — Research

**Date:** 2026-03-12

## Summary

S02 delivers program and mesocycle management (R002) — the backbone of structured training. The core challenge is the data model: representing the relationship between a reusable program template (with training days and exercise assignments) and an active mesocycle instance (with week count and deload positioning). S01 established clear patterns for the repository layer, schema migration, Zod v4 types, and UI composition that S02 should follow directly.

The data model is a three-level hierarchy: **Program → TrainingDay → ExerciseAssignment**, with **Mesocycle** as a separate entity linking a program to a specific time period. Programs are templates; mesocycles are instances of running those templates. This separation is critical because S03 (workout logging) needs to know "which day template am I logging against" while S05 (onboarding templates) needs to create programs without mesocycle instances. The schema must be additive (version 2 migration on top of v1) and use the same UUID PK / timestamps / soft-delete conventions from S01.

The UI needs a multi-step creation flow: create program → add training days → assign exercises to each day → define mesocycle parameters. This is more complex than S01's single-form exercise creation, requiring navigation between screens and stateful editing of nested entities. Superforms in SPA mode works for individual forms (program name, training day name, mesocycle params), but the overall flow is page-level orchestration with multiple Drawer/Dialog interactions.

## Recommendation

**Follow S01 patterns exactly** for the data layer: add program tables to `schema.sql`, bump `CURRENT_SCHEMA_VERSION` to 2 with migration logic in `database.ts`, create typed interfaces + Zod v4 schemas in `src/lib/types/program.ts`, and build `ProgramRepository` as a plain object (not class) in `src/lib/db/repositories/program.ts`.

**Data model:** Use four new tables — `programs`, `training_days`, `exercise_assignments`, `mesocycles`. Programs and training days are templates. Mesocycles attach to a program with week count and deload week number. Exercise assignments live on training days with sort_order, target sets, min/max reps (rep range). Keep the model normalized — don't embed training days as JSON in the program row.

**UI approach:** Create a `/programs` route for listing programs, a `/programs/create` flow for the multi-step program builder, and a `/programs/[id]` route for viewing/editing. Use Drawers for adding training days and exercise assignments (matching S01's Drawer pattern). Use the exercise picker from S01 (ExerciseRepository + filter/search) embedded in a Drawer when assigning exercises to a training day.

**Exercise reordering:** Use `sort_order` integer column on `exercise_assignments`. Reordering can be simple up/down buttons for now — dnd-kit/svelte is available in references but adds complexity. Reserve drag-and-drop for S06 polish if needed.

**Schema migration strategy:** The existing `applySchema()` in `database.ts` applies schema.sql as DDL. Since all tables use `CREATE TABLE IF NOT EXISTS`, adding new tables to schema.sql and bumping the version works for forward migration. No destructive ALTER needed.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Form validation + SPA submit | sveltekit-superforms + zod4Client | Pattern established in S01 ExerciseForm — use identical setup |
| Bottom sheet / modal editing | vaul-svelte Drawer (via @repo/ui) | Already used for exercise detail and create — same pattern |
| Dropdown selects | bits-ui Select (via @repo/ui) | Already used for muscle group / equipment in ExerciseForm |
| Toast notifications | svelte-sonner (already wired) | Toaster in root layout, toast.success/error pattern from S01 |
| Debounced search | runed Debounced | Already used in exercise page for search input |
| Exercise picker | ExerciseRepository + ExerciseFilters | Reuse S01's search/filter infrastructure for assigning exercises |
| UUID generation | crypto.randomUUID() | S01 pattern, works offline |
| Enum-to-i18n mapping | i18n-maps.ts pattern from S01 | Create equivalent for program-related enums if needed |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/database.ts` — Singleton DB with `dbExecute()`, `dbQuery<T>()`, `getDb()`. Schema version is tracked in `schema_version` table. Migration applies DDL statements from schema.sql. **S02 must bump `CURRENT_SCHEMA_VERSION` to 2 and add migration logic for existing v1 databases.**
- `apps/mobile/src/lib/db/schema.sql` — Current v1 schema. S02 adds program tables here with `CREATE TABLE IF NOT EXISTS` (idempotent DDL). All tables follow UUID PK, created_at, updated_at, deleted_at pattern.
- `apps/mobile/src/lib/db/repositories/exercise.ts` — Repository-as-plain-object pattern. Each method calls `getDb()` internally. Zod validation on mutations. Row-to-domain mapping function for type conversion (SQLite 0/1 → boolean, JSON string → array). **Follow this exact pattern for ProgramRepository.**
- `apps/mobile/src/lib/types/exercise.ts` — Enum-as-const-object pattern for MuscleGroup/Equipment. Interface extending SoftDeletable. Zod insert/update schemas with `z.uuid()`, `z.optional()`, `z.enum()`. **Follow for Program/TrainingDay/ExerciseAssignment/Mesocycle types.**
- `apps/mobile/src/lib/types/common.ts` — UUID, Timestamp, SoftDeletable shared types.
- `apps/mobile/src/lib/components/exercises/ExerciseForm.svelte` — Superforms SPA pattern: `defaults(zod4(schema))` + `superForm({ SPA: true, validators: zod4Client(schema), onUpdate })`. Form in its own component with callback prop. **Replicate for ProgramForm, TrainingDayForm, ExerciseAssignmentForm.**
- `apps/mobile/src/routes/exercises/+page.svelte` — Page orchestrator pattern: DB init in `$effect`, reactive state, Drawer integration, FAB for create. **Follow for /programs page.**
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js-backed mock of Capacitor plugin. Existing mock supports transactions (beginTransaction, commitTransaction, rollbackTransaction). **S02 tests should use the same setup.**
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — 49 tests with `clearAllExercises()` helper in beforeEach. **Follow this thoroughness for ProgramRepository tests.**

## Constraints

- **Schema must be additive** — v1 databases with exercises only must migrate to v2 with program tables added. `CREATE TABLE IF NOT EXISTS` + version check handles this. No ALTER TABLE needed.
- **All tables must use UUID PK, created_at, updated_at, deleted_at** — sync-ready model (D002).
- **Zod v4 syntax required** — use `z.uuid()`, `z.enum()`, `z.optional()`, not `z.string().uuid()` (D017 / AGENTS.md).
- **Superforms SPA mode for all mutating forms** — no server actions, no form actions (AGENTS.md).
- **Repository as plain object, not class** — established in S01 T02 (D017).
- **Forms must be extracted into their own components** — even if used once (AGENTS.md).
- **i18n: de.json is source of truth** — add German keys first, maintain en.json in sync (AGENTS.md).
- **Capacitor plugin transaction support** — `beginTransaction` / `commitTransaction` / `rollbackTransaction` available. Use for multi-table inserts (creating program + training days + assignments atomically).
- **sort_order for exercise assignments** — INTEGER column for ordering exercises within a training day. Reordering updates sort_order values.
- **Foreign key columns use TEXT type** — SQLite doesn't enforce FK by default; rely on application-level integrity. FK columns should still be indexed for join performance.

## Common Pitfalls

- **Migration ordering** — The current `applySchema()` splits schema.sql by semicolons and executes all statements. New program tables must come after the schema_version and exercises tables in the file. Since all use `IF NOT EXISTS`, ordering is safe but keep logical grouping.
- **Nested entity creation without transactions** — Creating a program with training days and assignments requires multiple INSERT statements. Without a transaction, a failure halfway through leaves orphaned rows. **Always wrap multi-table creates in beginTransaction/commitTransaction.**
- **sort_order gaps on delete** — When an exercise assignment is removed from a training day, sort_order values may have gaps (1, 2, 4). This is fine — sort_order is only used for ordering, not display index. Don't compact on every delete.
- **Soft delete cascade** — Soft-deleting a program should NOT auto-cascade to training days and assignments. The S03 workout logger may reference a training day by ID even after the parent program is soft-deleted. Keep entities independently deletable, or handle "archived program" state separately.
- **JSON vs normalized for secondary data** — Training day exercises must be in a separate `exercise_assignments` table (not JSON in training_days row). S03 needs to query individual assignments for pre-fill, and S05 templates need to create them individually.
- **ExerciseAssignment referencing exercises** — The `exercise_id` FK on exercise_assignments points to the exercises table. If an exercise is soft-deleted, assignments still reference it. Read operations should join on exercises and handle the null/deleted case gracefully.
- **Superforms defaults with nested objects** — The program creation form has multiple nested entities (training days with their exercises). Superforms handles flat forms well but nested creation flows need page-level orchestration, not a single massive form. Break into separate form components per entity.

## Open Risks

- **Mesocycle activation model** — The boundary map mentions "active mesocycle instances" but the requirements (R002) only say "define a mesocycle with week count and deload week position." For S02, a mesocycle is just metadata on a program (week count, deload week, start date). The concept of "activating" a mesocycle and tracking which week the user is on is needed by S03 (workout logging). S02 should create the mesocycle table with fields that S03 can consume (`current_week` or similar), but S03 owns the logic for advancing weeks.
- **Multiple mesocycles per program** — A program could theoretically have multiple sequential mesocycles (e.g., 6-week strength → 4-week hypertrophy). For S02, start with one active mesocycle per program. The table supports multiple rows per program_id, but the UI only creates/shows one. S03/S05 can extend later.
- **Exercise assignment rep range model** — Rep ranges can be expressed as min/max (e.g., 8-12) or as a single target (e.g., 5). Using `min_reps` and `max_reps` columns handles both (set equal for single target). RIR targets are S03 scope, not S02.
- **Program editing after workouts are logged** — Once S03 logs workouts against a program, editing the program template (adding/removing exercises, changing rep ranges) affects future workouts but not past ones. This is fine because workout_sets in S03 capture the actual performed data, not references to the template. No special handling needed in S02, but document the assumption.
- **Drag-and-drop for exercise reordering** — dnd-kit/svelte is available (references/dnd-kit) and uses Svelte 5 runes + `{@attach}` directive. However, it requires Svelte 5.29+ and adds UI complexity. For S02, implement up/down buttons for reordering. Upgrade to dnd-kit in S06 polish if desired.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 / SvelteKit | — | No dedicated skill found (npx skills timed out); references/svelte and references/kit available locally |
| Capacitor SQLite | — | No dedicated skill found; references/capacitor-fast-sql available locally |
| shadcn-svelte | — | No dedicated skill found; references/shadcn-svelte available locally |
| dnd-kit/svelte | — | No dedicated skill found; references/dnd-kit available locally with Svelte adapter docs |
| sveltekit-superforms | — | No dedicated skill found; existing codebase patterns from S01 are sufficient |

## Sources

- S01 task summaries (T01-T05) — established patterns for DB layer, repository, types, UI, forms
- `references/capacitor-fast-sql/src/definitions.ts` — plugin API including transaction support and SQLBatchOperation type
- `references/dnd-kit/packages/svelte/README.md` — Svelte 5 runes adapter with createSortable, DragDropProvider
- D007 (DECISIONS.md) — "Full mesocycles with week blocks + deload scheduling"
- D016-D018 (DECISIONS.md) — Capgo fast SQL, thin repository over raw SQL, schema_version migration strategy
- R002 (REQUIREMENTS.md) — Program & mesocycle management requirements
- M001-ROADMAP.md boundary map — S02 produces: ProgramRepository, program types, program-related schema tables, program creation/editing UI routes
