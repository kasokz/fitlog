# S04: Workout History & Body Weight — Research

**Date:** 2026-03-12

## Summary

S04 delivers two features: (1) browsable workout history with full session detail, and (2) body weight logging/viewing. Both are read-heavy views that consume data already written by S01 and S03, plus a new body weight table/repository. The existing codebase provides all needed infrastructure — WorkoutRepository has query methods for completed sessions, the repository pattern and test harness are established, and the UI component library (shadcn-svelte) has all primitives needed (Card, Badge, Drawer, Form, Empty, Separator, Item).

This is a low-risk, pattern-following slice. The main work is:
- Adding 2 new repository methods to WorkoutRepository (list sessions with pagination/date filter, get session with exercise names resolved)
- Creating a BodyWeightRepository + types + schema migration (v4)
- Building 3 new routes (`/history`, `/history/[sessionId]`, `/bodyweight`)
- Adding i18n keys for de (base locale) with en translation plan

No new dependencies or architectural decisions are needed. The slice follows established patterns exactly.

## Recommendation

Follow the existing repository + route pattern exactly. No ORM, no new libraries. Key approach:

1. **WorkoutRepository extensions:** Add `getCompletedSessions(limit, offset)` returning a lightweight session list (no sets, but with training day name and exercise count resolved via JOINs or subqueries). Add `getSessionDetail(id)` that enriches `getSessionById` with exercise names resolved.
2. **BodyWeightRepository:** New file following ExerciseRepository pattern. Simple CRUD: `log(date, weightKg)`, `getAll(limit, offset)`, `getRange(startDate, endDate)`, `deleteEntry(id)`. Schema migration bumps to v4.
3. **Routes:** `/history` for session list, `/history/[sessionId]` for session detail (read-only version of workout view), `/bodyweight` for weight log list + entry form.
4. **Navigation:** No bottom nav exists yet (S06 scope). Routes are accessible via direct navigation. The history route should be linked from the main page and from workout completion flow (after `goto('/programs/{id}')`, user can also navigate to history).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Form validation & submission | sveltekit-superforms SPA mode + zod4Client | Already used in all 5 existing forms. Body weight form follows same pattern. |
| Date formatting & display | `Intl.DateTimeFormat` | Built into all browsers/runtimes. No moment/date-fns needed for simple date display. |
| Debounced search (if added to history) | `Debounced` from `runed` | Already used in exercises page for search debouncing. |
| Empty state UI | `Empty`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription` from `@repo/ui` | Already used in exercises, programs, and workout pages. |
| Card-based list items | `Card`, `CardContent`, `CardHeader`, `CardTitle` from `@repo/ui` | Already used in ExerciseCard, workout ExerciseCard, ProgramCard. |
| Form components | `Form.*` from `@repo/ui/components/ui/form` via formsnap | Already used in all existing forms. |
| Drawer for forms | `Drawer.*` from `@repo/ui/components/ui/drawer` | Already used in exercises, programs pages. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/repositories/workout.ts` — **WorkoutRepository** already has `getSessionById` (returns session + sets), `getLastSessionForDay`, `getInProgressSession`, `completeSession`. Missing: paginated completed sessions list, enriched detail with exercise names.
- `apps/mobile/src/lib/db/repositories/exercise.ts` — **ExerciseRepository** has `getById` for resolving exercise names. Used by the workout page to build exercise name map. Same pattern needed for history detail.
- `apps/mobile/src/lib/db/database.ts` — Singleton connection manager with `dbQuery<T>`, `dbExecute`, migration system. `CURRENT_SCHEMA_VERSION = 3`. Body weight table = version 4.
- `apps/mobile/src/lib/db/schema.sql` — Full DDL. No body_weight table yet. Migration strategy: all DDL uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so bumping version and adding new DDL at end is safe.
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock for Vitest. All repositories tested via this mock. BodyWeightRepository tests follow same pattern.
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSession`, `WorkoutSessionWithSets`, `WorkoutSet`, `SetType` types + Zod schemas. History views consume these directly.
- `apps/mobile/src/lib/types/common.ts` — `UUID`, `Timestamp`, `SoftDeletable` — body weight type extends `SoftDeletable`.
- `apps/mobile/src/routes/exercises/+page.svelte` — Pattern for list page: init DB in `$effect`, load data, show loading/empty/error/list states. History list follows same pattern.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Workout session detail with exercise groups. History detail is a read-only version of this layout.
- `apps/mobile/src/lib/components/exercises/ExerciseForm.svelte` — Superforms SPA pattern: `defaults(zod4(schema))`, `zod4Client` validators, `onUpdate` handler calls repository. Body weight form follows same pattern.
- `apps/mobile/src/lib/components/exercises/i18n-maps.ts` — Pattern for mapping enum values to i18n labels. Set type labels already exist in workout messages (`workout_set_type_*`).
- `apps/mobile/src/routes/+layout.ts` — `export const ssr = false;` — Every new route needs a `+layout.ts` with this export.

## Constraints

- **Schema migration must be v4.** `CURRENT_SCHEMA_VERSION` in `database.ts` must be bumped to 4, and body weight DDL added to `schema.sql`. All DDL uses `IF NOT EXISTS` so re-running on existing DBs is safe.
- **Base locale is `de`.** All new i18n keys must be added to `de.json` first. English translations in a separate task.
- **Superforms SPA mode required** for the body weight entry form (mutating action). D026 exempts active workout set editing from Superforms, but body weight is a standard form.
- **Zod v4 syntax** (`z.uuid()` not `z.string().uuid()`). Already established in all type files.
- **No bottom navigation yet.** S06 scope. History/bodyweight routes need to be reachable but navigation chrome is minimal (back buttons, links from main page).
- **Repository pattern: raw SQL, no ORM.** D017 established. Follow existing `dbQuery<RowType>` + `rowToModel` mapping pattern.
- **Svelte 5 runes only.** All state via `$state`, `$derived`, `$effect`. No stores.
- **pnpm only.** No npm commands.

## Common Pitfalls

- **N+1 queries for exercise names in history list** — The workout page loads exercise names one-by-one via `ExerciseRepository.getById`. For a history list showing many sessions, this would be slow. Solution: Use a JOIN or subquery in the SQL to get exercise names in the session list query, or batch-load exercise names for all exercises referenced across visible sessions.
- **Timezone handling for body weight dates** — Body weight is logged per date (not timestamp). Use `YYYY-MM-DD` string format in the DB column, not ISO timestamp. The user logs "today's weight" — timezone is the user's local timezone. `new Date().toISOString().split('T')[0]` works for display, but for the actual date, use `Intl.DateTimeFormat` or locale-aware date formatting.
- **Missing `+layout.ts` in new routes** — Every new route directory needs `export const ssr = false;` in `+layout.ts`. Without this, SvelteKit will try to SSR, which fails in Capacitor. Pattern is consistent across all existing routes.
- **Session status filtering** — History must show only `completed` sessions (not `in_progress` or `cancelled`). The existing `getLastSessionForDay` filters by `status = 'completed'`. New queries must do the same.
- **Soft-delete filtering** — All queries must include `AND deleted_at IS NULL`. Established pattern in all existing repositories.
- **Duplicate body weight entries per date** — Need a decision: allow multiple entries per day (pick latest) or enforce one per day (upsert). Recommend: unique constraint on date, with upsert behavior. If user logs twice on same day, update the existing entry.

## Open Risks

- **S01 and S03 summaries are placeholder (doctor-recovered).** The actual task summaries in `tasks/` directories are the authoritative source. If there are undocumented quirks in the WorkoutRepository or schema, they may not be captured in the slice summaries.
- **Performance of history list with many sessions.** For a user who trains 5x/week for a year, that's ~260 sessions. A simple `SELECT * FROM workout_sessions ORDER BY started_at DESC` with `LIMIT/OFFSET` pagination should be fine, but the exercise-name resolution for each session could add up. Mitigate by showing exercise count rather than exercise names in the list view, and only resolving names on the detail page.
- **Body weight unit system.** D008 says "just weight" but doesn't specify unit. The schema should store weight in kilograms (matching the existing `workout_weight` / `workout_kg_unit` i18n keys). Unit conversion (kg/lbs) is S06 polish or later scope.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 | `sveltejs/ai-tools@svelte-code-writer` (2.5K installs) | available — not installed |
| Svelte 5 | `ejirocodes/agent-skills@svelte5-best-practices` (2.1K installs) | available — not installed |
| Capacitor | `cap-go/capacitor-skills@capacitor-best-practices` (295 installs) | available — not installed |

These skills are relevant but not critical for S04 since the patterns are already well-established in the codebase from S01-S03. The existing code is the best reference.

## Sources

- Existing codebase patterns from S01 (exercise repository, types, tests) and S03 (workout repository, logging UI)
- `apps/mobile/src/lib/db/schema.sql` — current schema at v3
- `apps/mobile/messages/de.json` — 175 existing i18n keys, none for history or body weight yet
- AGENTS.md project guidelines for tech stack constraints
- DECISIONS.md (D001-D028) for architectural decisions
