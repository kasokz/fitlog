# S01: Analytics Computation Engine & Schema — Research

**Date:** 2026-03-12

## Summary

S01 builds the pure computation layer that all subsequent M002 slices depend on. The existing codebase provides a solid foundation: `WorkoutRepository` already has all the session/set CRUD needed, `ProgramRepository` has mesocycle access (`getMesocycleByProgramId` with `current_week`, `deload_week_number`), and the test infrastructure (`sql.js` mock via `test-helpers.ts`) is battle-tested across 4 repository test suites. The `WorkoutSet` type already carries `weight`, `reps`, `rir`, `set_type`, and `completed` — exactly the fields analytics needs. The `Exercise` type provides `equipment` (for progression rounding) and `is_compound` (for progression sensitivity). All types use Zod v4 for validation.

The primary challenge is designing the **five analytics service modules** as pure functions + a new `AnalyticsRepository` for optimized SQL queries. The 1RM estimation and volume aggregation are straightforward. PR detection requires careful design of three categories (D044). The RIR progression advisor (D045) is the highest-risk piece — the heuristic of "≥2 consecutive sessions with avg RIR ≥2 across ≥3 working sets" needs edge-case coverage. The deload calculator is simple arithmetic. All five services are independently testable and depend only on typed data structures from M001.

A schema v5 migration is needed for a composite analytics index on `workout_sets(exercise_id, set_type, completed) WHERE deleted_at IS NULL` (D050). The existing migration system runs all DDL statements idempotently (`IF NOT EXISTS`) and bumps the version — just add the new index to `schema.sql` and increment `CURRENT_SCHEMA_VERSION` from 4 to 5. No table changes needed.

## Recommendation

**Build five independent analytics service modules** in `src/lib/services/analytics/` plus one `AnalyticsRepository` in `src/lib/db/repositories/analytics.ts`. Each service is a collection of pure functions that operate on typed inputs (not raw SQL). The repository handles all SQL queries and returns typed data that the services consume.

**Task decomposition:**
1. **Types first** — define `src/lib/types/analytics.ts` with all shared types (`PR`, `VolumeDataPoint`, `ProgressionSuggestion`, `DeloadSet`, `StrengthDataPoint`, `AnalyticsDateRange`). These types form the contract between S01 and all downstream slices (S02-S05).
2. **Schema v5** — add the composite index, bump version from 4 to 5.
3. **AnalyticsRepository** — SQL queries: exercise set history (with date range), completed working sets per exercise per session, recent sessions for an exercise, body weight range. These are read-only analytical queries with JOINs.
4. **oneRepMax.ts** — Epley formula for reps 1-10, null for >10 (D043). Pure functions, no DB dependency.
5. **prDetector.ts** — Three PR categories (D044): weight, rep, e1RM. Operates on historical sets vs new sets. Pure comparison logic.
6. **volumeAggregator.ts** — Tonnage calculation (weight × reps per set, summed). Per-exercise and per-muscle-group grouping. Produces `VolumeDataPoint[]` for charts.
7. **progressionAdvisor.ts** — RIR heuristic (D045). Needs AnalyticsRepository to fetch recent session data, then pure logic for threshold evaluation and weight suggestion with equipment-based rounding.
8. **deloadCalculator.ts** — Pure function: input previous sets + deload factor (default 0.6), output adjusted sets with reduced weight and optionally reduced volume.

Each module gets its own test file. Tests seed realistic multi-session data into sql.js and verify outputs.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| 1RM estimation | Epley formula: `weight × (1 + reps/30)` | Standard, well-validated formula. No library needed — 1 line of math. Cap at 10 reps per D043. |
| SQL database mock for tests | `test-helpers.ts` with sql.js + vi.mock | Already established in 4 test suites. Provides full SQLite compatibility including partial indexes. |
| UUID generation | `crypto.randomUUID()` | Already used by all repositories. Works in Node (tests) and browser (runtime). |
| Zod v4 validation | `zod` (already installed, `^4.3.6`) | Used for all input validation. Analytics types don't need Zod schemas (they're output types), but use `z.uuid()` etc. for any new input schemas. |
| Date math | Native `Date` + ISO strings | Already the pattern everywhere. No date library needed for analytics date ranges. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/repositories/workout.ts` — **Primary data source.** `getSessionById()` returns session + all sets. `getLastSessionForDay()` returns most recent completed session for pre-fill. `getCompletedSessions()` for history. Analytics queries need different access patterns (by exercise across sessions, not by session), so a dedicated `AnalyticsRepository` is warranted.
- `apps/mobile/src/lib/db/repositories/program.ts` — `getMesocycleByProgramId()` returns active mesocycle with `current_week` and `deload_week_number`. Deload calculator needs this to determine if current week is a deload week.
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — `getRange(startDate, endDate)` returns entries in ascending date order. Directly usable for body weight chart data in S02. No analytics wrapper needed.
- `apps/mobile/src/lib/db/repositories/exercise.ts` — `getById()` returns exercise with `equipment` and `is_compound`. Needed by progression advisor for weight rounding strategy.
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSet` interface with `weight: number | null`, `reps: number | null`, `rir: number | null`, `set_type: SetType`, `completed: boolean`. **Critical filter:** analytics must use only `set_type === 'working'` AND `completed === true` (D005, D032). `SetType` enum has `WARMUP`, `WORKING`, `DROP`, `FAILURE`.
- `apps/mobile/src/lib/types/exercise.ts` — `Equipment` enum: `barbell`, `dumbbell`, `cable`, `machine`, `bodyweight`, `kettlebell`, `band`, `other`. `MuscleGroup` enum: 12 values. `is_compound: boolean`. Both drive progression rounding.
- `apps/mobile/src/lib/types/program.ts` — `Mesocycle` with `current_week: number`, `deload_week_number: number`, `weeks_count: number`. `deload_week_number: 0` means no deload. 
- `apps/mobile/src/lib/db/database.ts` — `dbQuery<T>()` and `dbExecute()` are the SQL access functions. `CURRENT_SCHEMA_VERSION = 4`. Migration runs all DDL idempotently, then records version.
- `apps/mobile/src/lib/db/schema.sql` — All `CREATE TABLE/INDEX IF NOT EXISTS`. Partial index already used for body weight entries. Schema v5 just adds the analytics composite index.
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — `setupMockDatabase()` installs vi.mock for `@capgo/capacitor-fast-sql`, returns sql.js in-memory DB. `teardownMockDatabase()` closes and nulls DB. Tests import modules via dynamic `await import()` after mock is installed.
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — **Follow this pattern exactly.** Uses `setupMockDatabase()` at module scope, dynamic imports, `_resetForTesting()` + `getDb()` in `beforeEach`, `teardownMockDatabase()` in `afterEach`. Seeds test data with helper functions. This is the template for analytics tests.

## Constraints

- **Only working + completed sets count for analytics.** Every analytics query must filter `set_type = 'working' AND completed = 1 AND deleted_at IS NULL` (D005, D032). Failure to apply this filter pollutes all calculations.
- **1RM estimation capped at 10 reps (D043).** `estimateOneRepMax(weight, reps)` must return `null` for `reps > 10`. Callers must handle the null case.
- **Weight is always kg internally (D030).** No unit conversion in analytics. Display conversion is a presentation concern.
- **SQLite via Capacitor bridge has per-query overhead (~1-5ms).** Batch analytical work into single SQL queries with JOINs. The `AnalyticsRepository` should minimize round-trips.
- **Schema migration is all-or-nothing DDL replay.** `schema.sql` is run statement-by-statement. Every statement must use `IF NOT EXISTS`. Version 5 is recorded after all statements succeed. No rollback mechanism.
- **One active mesocycle per program (D021).** `getMesocycleByProgramId()` returns at most one row (most recent, non-deleted). Deload logic can rely on this.
- **Concurrent session prevention (D027).** Only one `in_progress` session at a time. PR detection runs at session completion, not during active workout.
- **sql.js test mock is full SQLite.** It supports partial indexes, CTEs, window functions — whatever the real SQLite supports. Analytics queries can be complex.
- **Weight increment rounding must be practical (D045, CR-002).** Barbell: 2.5kg increments. Dumbbell: 2kg. Cable/machine: 2.5kg. Bodyweight/band/kettlebell: 2.5kg default. The progression advisor needs exercise equipment type to round correctly.

## Common Pitfalls

- **Forgetting the working-set filter.** Every analytics function touches sets, and every one must filter to working + completed + non-deleted. Build this into the AnalyticsRepository queries, not into each service function — single source of truth for the filter.
- **1RM on 1-rep sets.** Epley formula `w * (1 + 1/30)` for 1 rep gives `w * 1.033`, not `w * 1.0`. For reps=1, the estimated 1RM should just equal weight (1RM IS the 1RM). Special-case `reps === 1` to return `weight` directly.
- **PR detection on non-comparable sets.** A warmup set of 60kg×10 should never be compared against working sets for PR detection. The AnalyticsRepository must guarantee only working sets are returned.
- **Progression suggestion on insufficient data.** A user with 1 session should never get suggestions. The threshold check (`≥2 consecutive sessions`) must handle: 0 sessions, 1 session, sessions with <3 working sets (D045 minimum), and non-consecutive sessions (gap of more than N days?). Edge: sessions for the same exercise across different training days should still count.
- **"Consecutive sessions" ambiguity.** D045 says "consecutive sessions" but doesn't clarify what counts. Safest: the N most recent completed sessions containing that exercise, regardless of date spacing. The "consecutive" means "last N in a row," not "on consecutive dates."
- **Deload week number 0 means no deload.** The mesocycle schema allows `deload_week_number: 0` (default). Deload calculator must treat 0 as "deload disabled" and return unmodified sets.
- **Null weight/reps in completed working sets.** The schema allows `weight REAL NULL` and `reps INTEGER NULL`. Analytics must handle nulls: skip sets with null weight or null reps for 1RM calculation and volume aggregation. Don't crash on null arithmetic.
- **Equipment-based rounding edge case.** The `other` equipment type has no standard increment. Default to 2.5kg. `bodyweight` exercises typically don't use weight progression suggestions (pull-ups, dips use body weight). Consider skipping progression suggestions for `bodyweight` equipment, or suggest rep increases instead.

## Open Risks

- **Progression algorithm threshold tuning.** The 2-session / RIR≥2 / ≥3-sets thresholds are untested with real user data. Build thresholds as named constants in a config object so they can be adjusted without code changes. Unit tests should cover boundary conditions around these thresholds.
- **Date range semantics for analytics queries.** The `AnalyticsDateRange` type needs clear semantics: inclusive start, inclusive end? ISO dates (YYYY-MM-DD) or full timestamps? Since `workout_sessions.started_at` is a full ISO timestamp and `body_weight_entries.date` is YYYY-MM-DD, the repository must handle both formats. Recommend: date range always uses YYYY-MM-DD strings, and queries use `DATE(started_at)` or `started_at >= ?` with `startDate + 'T00:00:00'` / `endDate + 'T23:59:59'`.
- **Session ordering for "recent N sessions" query.** If two sessions have the same `completed_at` timestamp (unlikely but possible in tests), the `rowid DESC` tiebreaker pattern from D028 must be applied. The AnalyticsRepository queries must include this.
- **Volume aggregation by muscle group.** An exercise has one `muscle_group` and optional `secondary_muscle_groups`. When aggregating volume by muscle group, should secondary groups get partial volume credit? Simplest approach: count full volume for primary group only. Secondary muscle group volume tracking is a premium/advanced feature that adds complexity. Start simple, extend later.
- **Bodyweight exercise progression.** Exercises with `equipment: 'bodyweight'` (pull-ups, dips, push-ups) don't increase external weight. The progression advisor should either: (a) skip bodyweight exercises entirely, or (b) suggest rep increases. Start with (a) — skip — and revisit if user feedback demands it.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Vitest | `onmax/nuxt-skills@vitest` (658 installs) | available — Nuxt-specific, not directly relevant |
| Vitest | `pproenca/dot-skills@vitest` (331 installs) | available — generic, but project already has established test patterns |
| SQLite | `martinholovsky/claude-skills-generator@sqlite database expert` (513 installs) | available — generic SQLite, not needed for simple index addition |

**Recommendation:** No skills needed for S01. The work is pure TypeScript computation + SQL queries, both well-covered by existing codebase patterns. The project's test infrastructure and repository pattern are the best reference.

## Sources

- 1RM formula: Epley (1985) `1RM = w × (1 + r/30)`. Standard in exercise science. Degrades above 10 reps (~20% error at 15+ reps). For reps=1, 1RM equals weight directly. (source: NSCA Essentials of Strength Training, domain knowledge)
- RIR-based progression: If RIR consistently ≥2 across working sets over multiple sessions, stimulus is insufficient and load should increase. If RIR drops to 0-1 frequently, load may be excessive or fatigue is accumulating. Commonly used in Renaissance Periodization and evidence-based training methodologies. (source: Israetel et al., domain knowledge)
- Equipment-based weight increments: Barbell plates typically smallest 1.25kg per side (2.5kg total). Dumbbells typically go up 2kg per pair. Cable/machine stacks vary but commonly 2.5-5kg increments. (source: standard gym equipment, domain knowledge)
- sql.js SQLite compatibility: sql.js compiles the full SQLite3 engine to WebAssembly, supporting all standard features including partial indexes, CTEs, and window functions. (source: `sql.js` npm package documentation)
