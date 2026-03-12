# S01: Data Layer & Exercise Library

**Goal:** Establish the SQLite data layer with `@capgo/capacitor-fast-sql`, build a typed repository pattern for exercises, seed a curated exercise library, and deliver a browsable exercise UI with search and filtering.
**Demo:** User opens the app → sees a curated exercise library → can search by name → can filter by muscle group and equipment → can create a custom exercise → all data persists across page reload (via sql.js/IndexedDB on web).

## Must-Haves

- SQLite database opens on app launch and persists data across restarts (web: sql.js + IndexedDB)
- Schema uses UUID PKs, `created_at`/`updated_at` timestamps, `deleted_at` soft delete (D002)
- Schema versioning via `schema_version` table for future migrations
- `ExerciseRepository` with full CRUD: getAll, getById, search, filterByMuscleGroup, filterByEquipment, create, update, softDelete
- ~60 curated exercises seeded on first launch with muscle groups, equipment, and descriptions
- Exercise browse UI with card-based list
- Exercise search (debounced text input)
- Exercise filter by muscle group and equipment type
- Custom exercise creation via superforms (SPA mode, extracted form component)
- Exercise detail view (drawer/sheet)
- All new UI strings in `de.json` (source of truth) and `en.json`
- Vitest unit tests for database layer and repository

## Proof Level

- This slice proves: contract + integration (SQLite CRUD works, data persists, repository returns typed objects, UI renders real data from the DB)
- Real runtime required: yes (browser with sql.js web fallback — no native projects yet)
- Human/UAT required: no (automated tests + dev server visual verification)

## Verification

- `pnpm --filter mobile test -- --run` — all tests pass
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — database opens, schema created, version tracked
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — full CRUD, search, filter, soft delete, seed data loaded
- Dev server: exercise library page renders with seeded exercises, search works, filter works, custom exercise form submits and new exercise appears in list

## Observability / Diagnostics

- Runtime signals: database module logs connection state transitions (connecting, connected, error) and schema version on open via structured console output
- Inspection surfaces: `getDb()` exposes connection status; `ExerciseRepository.getAll()` returns full exercise list for state inspection; schema_version table queryable for migration state
- Failure visibility: database connection errors surface as thrown errors with descriptive messages; repository methods propagate SQL errors with the failing query context
- Redaction constraints: none (no secrets in local SQLite)

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced in this slice:
  - `src/lib/db/database.ts` — singleton DB connection manager, consumed by all repositories
  - `src/lib/db/repositories/exercise.ts` — ExerciseRepository, consumed by exercise UI and future slices (S02, S03)
  - `src/lib/types/exercise.ts` — Exercise, MuscleGroup, Equipment types, consumed everywhere
  - `src/lib/types/common.ts` — shared UUID/Timestamp types
  - `/exercises` route — exercise browse/search/filter UI
  - `de.json` / `en.json` — i18n keys for exercise UI
- What remains before the milestone is truly usable end-to-end: S02 (programs), S03 (workout logging), S04 (history/body weight), S05 (onboarding/templates), S06 (design polish/native builds), S07 (full i18n)

## Tasks

- [x] **T01: Set up database layer with schema and migrations** `est:1h`
  - Why: Foundation for all data access — every other task and every future slice depends on a working database connection and schema
  - Files: `src/lib/db/database.ts`, `src/lib/db/schema.sql`, `src/lib/types/common.ts`, `src/lib/types/exercise.ts`, `src/lib/db/__tests__/database.test.ts`
  - Do: Install `@capgo/capacitor-fast-sql`. Create a platform-aware database module that uses the Capacitor plugin (web fallback uses sql.js). Define full schema DDL with exercises table (UUID PK, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, created_at, updated_at, deleted_at) and schema_version table. Create TypeScript types for Exercise, MuscleGroup enum, Equipment enum, and shared types (UUID, Timestamp). Write vitest tests proving: db opens, schema is created, version is tracked, basic execute/query works. Use Zod v4 syntax for validation schemas.
  - Verify: `pnpm --filter mobile test -- --run` — database tests pass
  - Done when: database.test.ts passes with schema creation and basic query verification

- [x] **T02: Build ExerciseRepository with full CRUD and tests** `est:1h`
  - Why: Encapsulates all exercise data access behind a typed interface — consumed by UI in T04 and by S02/S03 for exercise lookups
  - Files: `src/lib/db/repositories/exercise.ts`, `src/lib/db/__tests__/exercise-repository.test.ts`
  - Do: Implement ExerciseRepository class with methods: getAll (with pagination), getById, search (LIKE query on name), filterByMuscleGroup, filterByEquipment, combinedFilter (muscle group + equipment + search text), create (validates with Zod, generates UUID), update, softDelete. All queries include `WHERE deleted_at IS NULL` by default. Write comprehensive vitest tests covering: CRUD lifecycle, search matching, filter combinations, soft delete hides from getAll but data exists, validation rejects invalid input.
  - Verify: `pnpm --filter mobile test -- --run` — exercise repository tests pass
  - Done when: All ExerciseRepository methods tested with edge cases (empty results, search with no match, filter combinations)

- [x] **T03: Create curated exercise seed data and seeding mechanism** `est:1h`
  - Why: The exercise library needs real content — users expect a populated library on first launch, not an empty screen
  - Files: `src/lib/db/seed/exercises.ts`, `src/lib/db/database.ts` (add seed-on-first-open logic), `src/lib/db/__tests__/exercise-repository.test.ts` (add seed verification test)
  - Do: Create ~60 curated exercises covering major muscle groups and equipment types. Structure: compound lifts (bench, squat, deadlift, OHP, rows), isolation exercises (curls, extensions, flies, lateral raises), bodyweight (pull-ups, dips, push-ups), machine exercises. Each exercise has: name (in English — display name), description, primary muscle group, secondary muscle groups (JSON array as TEXT), equipment type. Use `executeBatch()` for efficient bulk insert within a transaction. Wire seeding into database initialization (seed only if exercises table is empty). Add test verifying seed data loads correctly and exercise count matches.
  - Verify: `pnpm --filter mobile test -- --run` — seed test passes, exercise count is ~60
  - Done when: Seed data is comprehensive (all major muscle groups covered, mix of equipment types) and loads in a single batch operation

- [x] **T04: Build exercise browse, search, and filter UI** `est:1.5h`
  - Why: The primary user-facing deliverable of this slice — users need to browse, search, and filter exercises (R001, R031)
  - Files: `src/routes/exercises/+page.svelte`, `src/routes/exercises/+layout.ts`, `src/lib/components/exercises/ExerciseList.svelte`, `src/lib/components/exercises/ExerciseFilters.svelte`, `src/lib/components/exercises/ExerciseCard.svelte`, `src/lib/components/exercises/ExerciseDetail.svelte`, `messages/de.json`, `messages/en.json`
  - Do: Create `/exercises` route with `export const ssr = false`. Build ExerciseList component using Card components for each exercise (name, muscle group badge, equipment badge). Build ExerciseFilters with Command input for search (debounced via runed `Debounced`) and Tabs or badge-based toggles for muscle group and equipment filtering. Build ExerciseDetail as a Drawer showing full exercise info. Wire DB initialization and repository to page — load exercises on mount via `$effect`, re-query on filter/search change. Add all UI strings to `de.json` first, then `en.json`. Use `m.*()` pattern for all text. Icons from `@lucide/svelte`.
  - Verify: Dev server shows exercise list with real data, search narrows results, filter by muscle group/equipment works, exercise detail drawer opens
  - Done when: User can browse seeded exercises, search by name, filter by muscle group and equipment, and view exercise details — all with German and English strings

- [x] **T05: Add custom exercise creation form** `est:1h`
  - Why: Users need to add their own exercises beyond the curated library (R001 — custom exercise creation)
  - Files: `src/lib/components/exercises/ExerciseForm.svelte`, `src/routes/exercises/+page.svelte` (add create button + form trigger), `messages/de.json`, `messages/en.json`
  - Do: Create ExerciseForm component as an extracted form component (AGENTS.md requirement). Use superforms in SPA mode with `zod4Client` adapter. Form fields: name (required), description (optional), primary muscle group (select), secondary muscle groups (multi-select or checkboxes), equipment (select). Form rendered inside a Drawer or Sheet. On submit: validate with Zod, call ExerciseRepository.create(), show success toast via svelte-sonner, close drawer, refresh exercise list. Add FAB or button to trigger the create form. Add all form label/placeholder/error strings to `de.json` and `en.json`.
  - Verify: Dev server: tap create button → form opens → fill required fields → submit → new exercise appears in list → persists across page reload
  - Done when: Custom exercises can be created, appear in the browse/search/filter UI, and survive page reload

## Files Likely Touched

- `apps/mobile/package.json` (add @capgo/capacitor-fast-sql)
- `apps/mobile/src/lib/types/common.ts`
- `apps/mobile/src/lib/types/exercise.ts`
- `apps/mobile/src/lib/db/database.ts`
- `apps/mobile/src/lib/db/schema.sql`
- `apps/mobile/src/lib/db/repositories/exercise.ts`
- `apps/mobile/src/lib/db/seed/exercises.ts`
- `apps/mobile/src/lib/db/__tests__/database.test.ts`
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts`
- `apps/mobile/src/routes/exercises/+page.svelte`
- `apps/mobile/src/routes/exercises/+layout.ts`
- `apps/mobile/src/lib/components/exercises/ExerciseList.svelte`
- `apps/mobile/src/lib/components/exercises/ExerciseFilters.svelte`
- `apps/mobile/src/lib/components/exercises/ExerciseCard.svelte`
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte`
- `apps/mobile/src/lib/components/exercises/ExerciseForm.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
