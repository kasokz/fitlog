# M002: Analytics & Progression Intelligence — Research

**Date:** 2026-03-12

## Summary

M002 adds analytics and progression intelligence on top of M001's solid data layer. The codebase is well-structured for this: workout sets already store weight, reps, RIR, and set_type per exercise per session, with UUID-based relational links to exercises (with muscle_group metadata), programs, training days, mesocycles, and body weight entries. The existing repository pattern (`dbQuery`/`dbExecute` over raw SQL) makes it straightforward to add analytics query functions alongside existing CRUD operations. The charting infrastructure (shadcn-svelte chart components wrapping LayerChart v2) is partially scaffolded — the UI components exist in `packages/ui` but **layerchart is not yet installed as a dependency**.

The primary technical risk is the **RIR-driven progression algorithm** — no standard algorithm exists, so we must design, implement, and tune a heuristic. The approach should be conservative (suggest weight increase only when consistently RIR 2+ across 2-3+ sessions for an exercise's working sets), with clear thresholds that can be adjusted. The secondary risk is **query performance** — aggregating months of workout data (hundreds of sessions × sets) for charts. SQLite on mobile is fast for point queries but slower for analytical scans. Pre-computed aggregate tables or materialized views can mitigate this, though we should measure first before over-optimizing. The 1RM estimation (Epley/Brzycki) and PR detection are well-understood problems with known solutions.

The recommended approach is: build the analytics computation engine as a pure service layer (`src/lib/services/analytics/`) with comprehensive unit tests first, then build the UI on top. This lets us validate 1RM accuracy, PR detection correctness, and progression heuristics in isolation before wiring up charts. The freemium gate should be a simple feature-flag service checked at the UI layer — no database changes needed, just a `premium.ts` service that returns whether a feature is accessible.

## Recommendation

**Start with the computation engine, not the UI.** Build analytics services (1RM calculator, PR detector, volume aggregator, progression advisor, deload adjuster) as testable pure functions + repository queries first. Then layer the dashboard UI on top using the existing shadcn-svelte chart components + LayerChart. Install layerchart early since the chart component wrappers already import from it.

**Slice ordering by risk:**
1. Analytics computation engine + 1RM/PR/volume services (highest risk — algorithm design, correctness)
2. Progress dashboard UI with charts (medium risk — LayerChart v2 is pre-release)
3. RIR-driven progression suggestions + inline workout integration (medium risk — UX integration)
4. Deload auto-adjustment (low risk — straightforward logic)
5. Freemium gate (low risk — UI-only feature flag)
6. i18n for all new UI

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Interactive charts (line, area, bar) | LayerChart v2 via shadcn-svelte chart components | Already chosen by the project (chart-container, chart-tooltip, chart-utils exist in `packages/ui`). shadcn-svelte's chart docs show exact patterns for LineChart, BarChart with tooltips and legends. Pre-release but actively maintained. |
| 1RM estimation formulas | Epley: `weight × (1 + reps/30)`, Brzycki: `weight × 36 / (37 - reps)` | Standard formulas, no library needed — but don't invent custom formulas. Use Epley for ≤10 reps (more accurate at moderate ranges), Brzycki as alternative. Cap estimates at 10 reps — both degrade above 10-12 reps. |
| Date formatting / manipulation | Native `Date` + `Intl.DateTimeFormat` | Already used throughout codebase. No date library needed for the chart date ranges. |
| Feature flags (freemium gate) | Simple in-memory service + `@capacitor/preferences` | No server needed. Store premium status locally. M003 will add real IAP verification, but the gate boundary should be defined now. |
| d3 scales for chart axes | `d3-scale` (peer dep of LayerChart) | The interactive line chart example uses `scaleUtc` from d3-scale. Comes transitively with layerchart. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/repositories/workout.ts` — **Primary data source.** Contains `getCompletedSessions()` (paginated history), `getSessionById()` (session + sets), `getLastSessionForDay()` (pre-fill). Analytics queries will extend this repository or create a new `AnalyticsRepository`.
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — `getAll()` and `getRange()` methods already return body weight entries sorted by date. Directly usable for the body weight chart.
- `apps/mobile/src/lib/db/repositories/exercise.ts` — Exercise lookup by ID and search. Needed to resolve exercise names and muscle groups for chart labels and grouping.
- `apps/mobile/src/lib/db/repositories/program.ts` — `getMesocycleByProgramId()` returns mesocycle with `current_week`, `deload_week_number`, `weeks_count`. The deload auto-adjustment logic hooks directly into this.
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSet` has `weight: number | null`, `reps: number | null`, `rir: number | null`, `set_type: SetType`, `completed: boolean`. Analytics must filter to `set_type === 'working'` and `completed === true` only (D005, D032).
- `apps/mobile/src/lib/db/schema.sql` — Schema v4 with relevant indexes: `idx_workout_sets_exercise_id`, `idx_workout_sets_session_id`, `idx_workout_sessions_started_at`, `idx_workout_sessions_status`. **Missing:** composite index on `(exercise_id, session_id)` for analytics JOINs — candidate for schema v5.
- `apps/mobile/src/lib/db/database.ts` — `CURRENT_SCHEMA_VERSION = 4`, migration system uses version table. New indexes or tables require bumping to v5.
- `packages/ui/src/components/ui/chart/` — Chart container, tooltip, and utility components that wrap LayerChart. Import `layerchart` directly (which is **not yet installed**). Must add `layerchart@next` as a dev dependency.
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Working set UI component. Progression suggestions should integrate here or in `ExerciseCard.svelte` as a non-intrusive banner/badge.
- `apps/mobile/src/lib/components/BottomNav.svelte` — 5 tabs: Programs, Exercises, History, Body Weight, Settings. The analytics dashboard could replace the home redirect (current `/` just redirects to `/programs`) or be accessed from History tab. **Decision needed: separate Analytics tab or sub-section of History?**
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock for in-memory SQLite testing. All repository tests use this pattern. Analytics service tests should follow the same approach.
- `packages/ui/src/globals.css` — Chart color tokens (`--chart-1` through `--chart-5`) already defined for both light and dark themes.

## Constraints

- **LayerChart v2 is pre-release.** The shadcn-svelte chart docs explicitly warn about potential breaking changes. Pin the version in `package.json` and test thoroughly.
- **SQLite on Capacitor (not Web SQL).** Queries run through `@capgo/capacitor-fast-sql` which uses an HTTP bridge on native. Each `dbQuery` call has bridge overhead (~1-5ms per call on native). Batch analytical queries into single SQL statements with JOINs rather than making N+1 calls.
- **No server-side computation.** All analytics run client-side in the Capacitor WebView. Heavy aggregation must be bounded (e.g., limit chart data to last 6-12 months, paginate if needed).
- **Schema migration is version-based, not file-based.** Adding indexes or tables requires incrementing `CURRENT_SCHEMA_VERSION` and adding conditional DDL to `schema.sql` (using `IF NOT EXISTS` pattern already established).
- **Set types filter is critical.** Only `working` sets with `completed = true` count for analytics (D005). Warmup, drop, and failure sets must be excluded from 1RM estimation and volume calculations.
- **Weight unit is always kg internally (D030).** No unit column exists. Any kg→lbs display conversion is a presentation concern, not a data concern.
- **One active mesocycle per program (D021).** Deload logic targets the single active mesocycle returned by `getMesocycleByProgramId()`.
- **Bottom nav has 5 tabs (D036).** Adding a 6th tab would break the layout. Analytics must fit into existing navigation (e.g., sub-route of History, or replace the home redirect).

## Common Pitfalls

- **1RM estimation above 10 reps is unreliable.** Epley and Brzycki both diverge significantly above 10-12 reps. For sets of 15+, the estimated 1RM can be off by 20%+. **Mitigation:** Only compute estimated 1RM from sets with reps ≤ 10. Show a disclaimer or skip estimation for high-rep sets.
- **PR detection on estimated 1RM creates phantom PRs.** If a user does 5×100kg one day (e1RM = 117kg) and 8×95kg another (e1RM = 119kg), both are "PRs" but the second one feels wrong to the user. **Mitigation:** Track three PR categories separately: weight PR (heaviest single set), rep PR (most reps at a given weight or higher), and estimated 1RM PR. Show weight PR prominently, e1RM PR as secondary.
- **Progression suggestions firing too aggressively.** Suggesting weight increase after one good session leads to bad recommendations. **Mitigation:** Require ≥2 consecutive sessions where average working-set RIR ≥ 2 for that exercise. Also consider minimum set count threshold (≥3 working sets per session to have statistical meaning).
- **Progression suggestions ignoring exercise context.** Isolation exercises (curls) progress slower than compounds (squats). A flat "add 2.5kg" doesn't work for all exercises. **Mitigation:** Use percentage-based suggestion (~2.5% increase for compounds, ~5% for isolations using smaller absolute increments). Or provide weight increment suggestions based on the exercise's equipment type (barbell: +2.5kg, dumbbell: +2kg, cable/machine: +2.5-5kg).
- **Deload auto-adjustment timing ambiguity.** When does deload activate — when the user starts a workout in deload week, or proactively before? **Mitigation:** Apply deload modifications when pre-filling sets for a new session in the deload week. The pre-fill logic in `getLastSessionForDay()` already provides the hook point.
- **Chart performance with large datasets.** Rendering 200+ data points in LayerChart can cause jank on low-end devices. **Mitigation:** Aggregate to weekly or monthly data points for time ranges > 3 months. Lazy-load chart data on tab activation, not on page mount.
- **Freemium gate frustration.** Showing analytics UI that users can't interact with is punishing. **Mitigation:** Show limited analytics for free (e.g., last 4 weeks of 1RM for 3 exercises, basic PR list). Gate the full dashboard, long history, and progression suggestions behind premium.

## Open Risks

- **LayerChart v2 breaking changes during development.** The library is pre-release. A breaking update mid-milestone could require chart component rewrites. Pin version and monitor.
- **Progression algorithm tuning requires real data.** The heuristic (2+ sessions with RIR ≥ 2) is a starting point. Without real user feedback, the thresholds may need iteration. Build with configurable thresholds from the start.
- **Navigation structure for analytics.** The current 5-tab layout has no obvious home for a dedicated analytics dashboard. Options: (a) add Analytics as a sub-section accessible from History, (b) replace the root `/` redirect with a dashboard, (c) add a dashboard button in the header. This is a UX decision that should be made during roadmap planning.
- **Freemium boundary scope creep.** R019 says "basic history free, full analytics premium." But what counts as "basic"? PR list? Last-session comparison? The boundary must be clearly defined during slice planning to avoid ambiguity.
- **Body weight chart integration with exercise analytics.** Users will want to correlate body weight changes with strength changes. This cross-chart correlation could add scope if not bounded. Keep it as a simple overlay option on the dashboard, not a deep analytical feature.

## Candidate Requirements

These emerged from research and are advisory — not auto-added to scope:

- **CR-001: Analytics query performance indexes.** Schema v5 should add composite indexes for analytics queries (e.g., `idx_workout_sets_exercise_completed` on `(exercise_id, set_type, completed)` filtering `deleted_at IS NULL`). Without these, full-table scans on workout_sets will degrade as data grows.
- **CR-002: Progression suggestion weight rounding.** Suggested weights should round to practical increments (2.5kg for barbell, 2kg for dumbbell, variable for machine). Users don't want "add 2.37kg."
- **CR-003: PR celebration/notification.** When a PR is detected at session completion, show a celebration animation or toast. PRs are the most motivating data point — they deserve prominent UX.
- **CR-004: Analytics data export.** R029 (CSV/JSON export) is deferred to M004, but the analytics computation layer should produce export-friendly data structures from the start.
- **CR-005: Empty state for analytics.** Users with < 2 weeks of data won't have meaningful charts. The analytics dashboard needs compelling empty states that encourage continued logging.
- **CR-006: Per-exercise analytics view.** Beyond the dashboard, users should be able to tap an exercise in the library to see its strength curve and PR history. This is a natural entry point alongside the dashboard.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| LayerChart (Svelte 5) | `spences10/svelte-skills-kit@layerchart-svelte5` | available (78 installs) |
| LayerChart | `linehaul-ai/linehaulai-claude-marketplace@layerchart` | available (16 installs) |
| shadcn-svelte | (already in codebase) | installed / in references |
| Svelte 5 | (already in codebase) | installed / in references |

**Recommendation:** Consider installing `spences10/svelte-skills-kit@layerchart-svelte5` before the charting slice — it has the most installs and targets Svelte 5 + LayerChart specifically. The project already has shadcn-svelte in references.

## Sources

- 1RM formula accuracy: Epley (1985) `1RM = w(1 + r/30)` and Brzycki (1993) `1RM = w × 36/(37 - r)` are the two most widely used. Both become unreliable above 10 reps. The NSCA recommends using actual 1RM testing or sub-10-rep estimates for programming decisions. (source: domain knowledge, NSCA Essentials of Strength Training)
- LayerChart v2 usage via shadcn-svelte: Chart components use `LineChart`, `BarChart` simplified APIs with `d3-scale` for axes, `d3-shape` for curves. Tooltip and legend integration via snippets. (source: `references/shadcn-svelte/docs/content/components/chart.md`, `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-line-interactive.svelte`)
- SQLite performance on mobile: SQLite handles millions of rows efficiently for indexed queries but analytical scans over large tables benefit from covering indexes or pre-aggregation. The Capacitor bridge adds ~1-5ms overhead per query. (source: domain knowledge, SQLite documentation)
- RIR-based progression: Commonly used in Renaissance Periodization (RP) and similar evidence-based training methodologies. The general principle: if RIR stays at 2-3 across multiple sessions, the stimulus is insufficient and weight should increase. If RIR drops to 0-1 frequently, the weight may be too heavy or fatigue is accumulating. (source: domain knowledge, Israetel et al. "Scientific Principles of Hypertrophy Training")
