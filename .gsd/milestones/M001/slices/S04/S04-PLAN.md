# S04: Workout History & Body Weight

**Goal:** Users can browse completed workout sessions with full detail and log/view body weight entries over time.
**Demo:** User opens history, sees a list of past workouts (date, training day name, exercise count, duration). Tapping a session shows full detail (exercises, sets, weight, reps, RIR). User opens body weight page, logs today's weight, sees it appear in the list. Entering weight again on the same day updates the existing entry.

## Must-Haves

- Workout history list showing completed sessions with date, training day name, exercise count, and duration
- Session detail view showing all exercises with their sets (weight, reps, RIR, set type) — read-only
- Body weight table in SQLite (schema v4 migration)
- Body weight repository with log (upsert per date), getAll (paginated), delete
- Body weight logging form using Superforms SPA mode with zod4 validation
- Body weight list view with entries sorted by date descending
- All new UI text has German (de) i18n keys
- Vitest tests for BodyWeightRepository and WorkoutRepository extensions

## Proof Level

- This slice proves: integration
- Real runtime required: no (Vitest with sql.js mock proves data layer; UI is pattern-following)
- Human/UAT required: no (visual polish is S06 scope; this slice proves data flows and UI structure)

## Verification

- `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` — all BodyWeightRepository CRUD tests pass
- `pnpm --filter mobile test -- --run src/lib/db/__tests__/workout-repository.test.ts` — existing tests still pass + new getCompletedSessions/getSessionDetail tests pass
- `pnpm --filter mobile build` — build succeeds with no type errors (proves routes, components, i18n keys compile)
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^history_'` — returns >0 (history i18n keys exist)
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^bodyweight_'` — returns >0 (body weight i18n keys exist)

## Observability / Diagnostics

- Runtime signals: `[Workout]` and `[BodyWeight]` prefixed console.log entries follow existing repository logging pattern. Structured log with operation and key identifiers.
- Inspection surfaces: `BodyWeightRepository.getAll()` and `WorkoutRepository.getCompletedSessions()` are inspectable from console/debugger. DB table `body_weight_entries` queryable directly.
- Failure visibility: Repository methods throw descriptive errors with `[BodyWeightRepository]` / `[WorkoutRepository]` prefixes. Schema migration failure logged with statement that failed.
- Redaction constraints: None — no secrets or PII in this slice.

## Integration Closure

- Upstream surfaces consumed:
  - `src/lib/db/database.ts` — `dbQuery`, `dbExecute`, `getDb`, migration system
  - `src/lib/db/repositories/workout.ts` — existing WorkoutRepository (extended with new methods)
  - `src/lib/db/repositories/exercise.ts` — `ExerciseRepository.getById` for resolving exercise names in history detail
  - `src/lib/types/workout.ts` — `WorkoutSession`, `WorkoutSessionWithSets`, `WorkoutSet`, `SetType`
  - `src/lib/types/common.ts` — `UUID`, `SoftDeletable`
  - `src/lib/db/schema.sql` — schema DDL (extended with body_weight_entries table)
  - `apps/mobile/messages/de.json` — i18n keys (extended)
- New wiring introduced in this slice:
  - `/history` route → WorkoutRepository.getCompletedSessions
  - `/history/[sessionId]` route → WorkoutRepository.getSessionById + ExerciseRepository.getById
  - `/bodyweight` route → BodyWeightRepository CRUD
  - body_weight_entries table + schema v4 migration
- What remains before the milestone is truly usable end-to-end:
  - S05: Onboarding & program templates (cold-start UX)
  - S06: Navigation chrome (bottom nav linking all routes), design polish, haptics, platform builds
  - S07: English translations, launch readiness

## Tasks

- [x] **T01: Body weight data layer — types, schema v4, repository, and tests** `est:1h`
  - Why: Foundation for body weight feature (R006). Creates the new table, type definitions, repository with upsert-per-date behavior, and comprehensive Vitest tests. Tests are created first so T03 (UI) has a proven data layer.
  - Files: `src/lib/types/bodyweight.ts`, `src/lib/db/schema.sql`, `src/lib/db/database.ts`, `src/lib/db/repositories/bodyweight.ts`, `src/lib/db/__tests__/bodyweight-repository.test.ts`
  - Do: Define BodyWeightEntry type + Zod schemas (insert uses z.string() for date YYYY-MM-DD, z.number() for weight_kg). Add body_weight_entries table to schema.sql with UNIQUE(date) constraint. Bump CURRENT_SCHEMA_VERSION to 4. Create BodyWeightRepository following ExerciseRepository pattern: log (INSERT OR REPLACE upsert), getAll (LIMIT/OFFSET, ORDER BY date DESC), getRange (between dates), deleteEntry (soft-delete). Write Vitest tests covering: log creates entry, log on same date updates (upsert), getAll returns descending order, getAll pagination, getRange filters correctly, deleteEntry soft-deletes, deleted entries excluded from queries.
  - Verify: `pnpm --filter mobile test -- --run src/lib/db/__tests__/bodyweight-repository.test.ts` passes
  - Done when: All BodyWeightRepository tests pass, schema v4 migration compiles

- [x] **T02: Extend WorkoutRepository with history queries and tests** `est:45m`
  - Why: History list and detail views (R030) need efficient queries. getCompletedSessions returns a lightweight list (no individual set data, but includes training day name and exercise count via SQL). getSessionDetail enriches getSessionById with exercise names. Tests prove these queries work correctly.
  - Files: `src/lib/db/repositories/workout.ts`, `src/lib/types/workout.ts`, `src/lib/db/__tests__/workout-repository.test.ts`
  - Do: Add `CompletedSessionSummary` type to workout.ts (id, started_at, completed_at, duration_seconds, training_day_name, exercise_count, total_sets). Add `getCompletedSessions(limit, offset)` method using JOINs to training_days for name and subquery for exercise count and set count. Add `getSessionDetail(id)` returning session + sets + a map of exercise_id→exercise_name resolved via JOIN. Both filter `status='completed' AND deleted_at IS NULL`. Add tests: getCompletedSessions returns only completed (not in_progress), respects pagination, returns correct counts; getSessionDetail resolves exercise names.
  - Verify: `pnpm --filter mobile test -- --run src/lib/db/__tests__/workout-repository.test.ts` passes (all existing + new tests)
  - Done when: All WorkoutRepository tests pass including new history query tests

- [x] **T03: Workout history UI — list and detail routes with i18n** `est:1h`
  - Why: Delivers the user-facing workout history browsing experience (R030). List route shows completed sessions as cards. Detail route shows full session data read-only. Both routes follow existing page patterns (init DB in $effect, loading/empty/error states).
  - Files: `src/routes/history/+page.svelte`, `src/routes/history/+layout.ts`, `src/routes/history/[sessionId]/+page.svelte`, `src/routes/history/[sessionId]/+layout.ts`, `src/lib/components/history/SessionCard.svelte`, `src/lib/components/history/SessionDetail.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `/history` route with `+layout.ts` (ssr=false). Page loads completed sessions via getCompletedSessions, shows list of SessionCard components (date, training day name, exercise count, duration). Empty state when no history. Create `/history/[sessionId]` route with read-only session detail — shows exercises grouped with sets (weight, reps, RIR, set type badges). Back button navigates to /history. Add all `history_*` i18n keys to de.json (title, loading, empty, back, duration, exercises count, set labels, date formatting hints).
  - Verify: `pnpm --filter mobile build` succeeds (no type errors, routes compile, i18n keys resolve)
  - Done when: Build passes, history routes exist with proper structure, de.json has all history_* keys

- [x] **T04: Body weight UI — list, form, and route with i18n** `est:1h`
  - Why: Delivers the user-facing body weight logging and viewing experience (R006). Form uses Superforms SPA mode following ExerciseForm pattern. List shows entries sorted by date. Upsert behavior means logging twice on same day updates.
  - Files: `src/routes/bodyweight/+page.svelte`, `src/routes/bodyweight/+layout.ts`, `src/lib/components/bodyweight/BodyWeightForm.svelte`, `src/lib/components/bodyweight/BodyWeightList.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `/bodyweight` route with `+layout.ts` (ssr=false). Page loads entries via BodyWeightRepository.getAll, shows BodyWeightList (date + weight in kg per row). FAB or inline button opens Drawer with BodyWeightForm. Form uses superForm + defaults(zod4(schema)) + zod4Client validator. On submit, calls BodyWeightRepository.log. Successful log refreshes list and shows toast. Add all `bodyweight_*` i18n keys to de.json (title, loading, empty, add, form labels, success/error toasts, delete confirmation, unit).
  - Verify: `pnpm --filter mobile build` succeeds (no type errors, routes compile, i18n keys resolve)
  - Done when: Build passes, bodyweight route exists with form + list, de.json has all bodyweight_* keys

- [x] **T05: Wire navigation links and add English translations** `est:30m`
  - Why: History and body weight routes must be reachable from the app. The main page and workout completion flow should link to history. English translations are required to keep locale parity (AGENTS.md mandates translations per supported locale at end of each phase).
  - Files: `src/routes/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Add navigation cards/links on the main page (`/`) for History and Body Weight routes. After workout completion (goto to program page), the history route is accessible from main page. Add all new `history_*` and `bodyweight_*` keys to en.json with proper English translations. Verify key parity between de.json and en.json for the new keys.
  - Verify: `pnpm --filter mobile build` succeeds. `jq 'keys[]' apps/mobile/messages/de.json | grep -E '^(history_|bodyweight_)' | wc -l` matches same grep on en.json.
  - Done when: Build passes, main page links to /history and /bodyweight, en.json has all new keys matching de.json

## Files Likely Touched

- `apps/mobile/src/lib/types/bodyweight.ts` (new)
- `apps/mobile/src/lib/types/workout.ts` (extended with CompletedSessionSummary)
- `apps/mobile/src/lib/db/schema.sql` (v4: body_weight_entries table)
- `apps/mobile/src/lib/db/database.ts` (CURRENT_SCHEMA_VERSION → 4)
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` (new)
- `apps/mobile/src/lib/db/repositories/workout.ts` (extended with history queries)
- `apps/mobile/src/lib/db/__tests__/bodyweight-repository.test.ts` (new)
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` (extended)
- `apps/mobile/src/routes/history/+page.svelte` (new)
- `apps/mobile/src/routes/history/+layout.ts` (new)
- `apps/mobile/src/routes/history/[sessionId]/+page.svelte` (new)
- `apps/mobile/src/routes/history/[sessionId]/+layout.ts` (new)
- `apps/mobile/src/routes/bodyweight/+page.svelte` (new)
- `apps/mobile/src/routes/bodyweight/+layout.ts` (new)
- `apps/mobile/src/lib/components/history/SessionCard.svelte` (new)
- `apps/mobile/src/lib/components/history/SessionDetail.svelte` (new)
- `apps/mobile/src/lib/components/bodyweight/BodyWeightForm.svelte` (new)
- `apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte` (new)
- `apps/mobile/src/routes/+page.svelte` (navigation links added)
- `apps/mobile/messages/de.json` (history_* and bodyweight_* keys)
- `apps/mobile/messages/en.json` (English translations)
