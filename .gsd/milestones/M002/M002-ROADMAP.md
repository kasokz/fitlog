# M002: Analytics & Progression Intelligence

**Vision:** Transform raw workout data into a smart training partner — strength curves, PR tracking, volume trends, RIR-driven progression suggestions, deload automation, and the freemium boundary that separates free loggers from premium analytics users.

## Success Criteria

- A user with 4+ weeks of workout data sees an interactive strength curve (estimated 1RM over time) for any exercise
- PRs (weight, rep, estimated 1RM) are automatically detected at session completion and shown in a celebration toast
- Volume/tonnage trends are visible per exercise and per muscle group over selectable time ranges
- When a user has logged RIR 2+ across 2+ consecutive sessions for an exercise's working sets, a progression suggestion banner appears during their next workout for that exercise
- When the mesocycle reaches the deload week, workout pre-fill automatically reduces weight to ~60% and sets/reps appropriately
- The progress dashboard loads with real data in <1 second on a realistic dataset (6 months of 4x/week training)
- Free users see basic PR list and last-4-weeks summary; full charts, trends, and progression suggestions are gated behind a premium flag
- All new UI text exists in de.json (base locale) and en.json

## Key Risks / Unknowns

- **RIR-driven progression algorithm** — No standard algorithm exists. Must design a heuristic (session count threshold, RIR averaging, per-exercise sensitivity, weight increment rounding) that feels right to intermediate lifters. Getting this wrong makes the feature useless or annoying.
- **LayerChart v2 integration** — Pre-release library, not yet installed. The shadcn-svelte chart wrappers import from it but it's never been exercised in this codebase. Risk of API mismatch or breaking changes.
- **Analytics query performance** — Aggregating months of sets across exercises for charts could be slow on SQLite via the Capacitor HTTP bridge. May need composite indexes (schema v5) or pre-aggregation. Must measure with realistic data before optimizing.

## Proof Strategy

- **RIR progression algorithm** → retire in S01 by building the full analytics computation engine with unit tests against realistic multi-session datasets. The algorithm is proven when tests demonstrate correct suggestion triggers across edge cases (insufficient sessions, mixed RIR, per-exercise isolation).
- **LayerChart v2 integration** → retire in S02 by building the real dashboard with real chart components rendering real data from the analytics engine. Proven when interactive line charts and bar charts render correctly with tooltips and legends.
- **Query performance** → retire in S01/S02 by running analytics queries against a seeded test database with 6 months of training data (~100 sessions, ~2000 sets). Proven when dashboard loads in <1s. Schema v5 indexes added if measurements warrant it.

## Verification Classes

- Contract verification: Vitest unit tests for all analytics services (1RM calculator, PR detector, volume aggregator, progression advisor, deload adjuster). Tests use sql.js in-memory SQLite with seeded realistic data. Run via `pnpm test`.
- Integration verification: Dashboard renders real charts from real SQLite data. Progression suggestions appear inline during workout logging. Deload pre-fill reads mesocycle state and reduces weights. Freemium gate blocks/allows features based on premium flag.
- Operational verification: Analytics dashboard loads in <1s with 6-month dataset. Chart rendering doesn't cause jank on scroll.
- UAT / human verification: Visual inspection of charts (strength curves look correct, trends are intuitive). Progression suggestion text is clear and actionable. Freemium boundary feels fair.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 7 slices are complete with passing verification
- Analytics engine produces correct 1RM, PR, volume, and progression data from real workout sets in SQLite
- Progress dashboard renders interactive charts with real user data
- Progression suggestion banners appear during workout logging when RIR criteria are met
- Deload week auto-adjusts pre-filled weights/volume when mesocycle is in deload position
- Freemium gate correctly separates free analytics (basic PRs, 4-week summary) from premium (full charts, trends, suggestions)
- All new i18n keys exist in de.json and en.json with zero drift
- `pnpm test` passes with all new analytics tests
- `pnpm run build` succeeds with zero errors

## Requirement Coverage

- Covers: R013 (strength curves/1RM), R014 (PR tracking), R015 (volume/tonnage trends), R016 (RIR progression suggestions), R017 (deload auto-adjustment), R018 (progress dashboard), R019 (freemium gate)
- Partially covers: R004 (RIR tracking — M001 captures, M002 consumes for progression), R006 (body weight — M001 captures, M002 adds chart), R032 (set types — M001 defines, M002 filters on working sets only)
- Leaves for later: R020-R024 (M003 monetization/IAP), R025-R029 (M004 cloud/sync), R010 (additional locales beyond de/en deferred per locale)
- Orphan risks: none — all M002-relevant active requirements are mapped

## Slices

- [x] **S01: Analytics Computation Engine & Schema** `risk:high` `depends:[]`
  > After this: Unit tests prove correct 1RM estimation (Epley/Brzycki, capped at 10 reps), PR detection across 3 categories (weight/rep/e1RM), volume/tonnage aggregation per exercise and muscle group, RIR progression suggestion algorithm with configurable thresholds, and deload weight reduction calculation — all tested against realistic multi-session SQLite data via sql.js.

- [x] **S02: Progress Dashboard with Interactive Charts** `risk:medium` `depends:[S01]`
  > After this: A user can navigate to the progress dashboard, see interactive strength curves (1RM over time per exercise), volume/tonnage trend charts (bar/area), body weight chart, and training frequency summary — all rendered with LayerChart using real data from the analytics engine. Exercise picker and time-range selector control what's displayed.

- [x] **S03: PR Detection, Celebration & History** `risk:medium` `depends:[S01]`
  > After this: When a user completes a workout session, PRs are automatically detected and a celebration toast with haptic feedback shows the achievement. A dedicated PR history view shows all personal records per exercise with dates and values. PRs are visible from the exercise detail screen.

- [x] **S04: RIR Progression Suggestions in Workout** `risk:medium` `depends:[S01]`
  > After this: During an active workout, if the analytics engine determines a progression suggestion exists for an exercise (based on RIR trends from recent sessions), a non-intrusive banner appears on the exercise card suggesting a specific weight increase (rounded to practical increments per equipment type).

- [ ] **S05: Deload Auto-Adjustment** `risk:low` `depends:[S01]`
  > After this: When a mesocycle reaches its deload week and the user starts a workout, pre-filled set weights are automatically reduced to ~60% of previous session values and volume is adjusted. A deload indicator banner shows on the workout screen.

- [ ] **S06: Freemium Analytics Gate** `risk:low` `depends:[S02, S03, S04]`
  > After this: Free users see a basic analytics summary (PR list for top 3 exercises, last-4-weeks volume snapshot) and hit a clear upgrade prompt when tapping into full charts, extended history, or progression suggestions. Premium users see everything. Gate is controlled by a local feature flag service.

- [ ] **S07: i18n — German & English for Analytics UI** `risk:low` `depends:[S02, S03, S04, S05, S06]`
  > After this: All new analytics UI text (dashboard labels, chart titles, PR messages, progression suggestions, deload indicators, freemium prompts) exists in de.json and en.json with zero key drift. Keys are synchronized and paraglide compiles cleanly.

## Boundary Map

### S01 → S02, S03, S04, S05

Produces:
- `src/lib/services/analytics/oneRepMax.ts` — `estimateOneRepMax(weight, reps): number | null` (returns null for reps > 10), `bestEstimatedOneRM(sets): { e1rm, weight, reps, date } | null`
- `src/lib/services/analytics/prDetector.ts` — `detectPRs(exerciseId, newSets, historicalSets): PR[]` with types `weight_pr`, `rep_pr`, `e1rm_pr`; `getPRHistory(exerciseId): PR[]`
- `src/lib/services/analytics/volumeAggregator.ts` — `getExerciseVolume(exerciseId, dateRange): VolumeDataPoint[]`, `getMuscleGroupVolume(muscleGroup, dateRange): VolumeDataPoint[]`, `getSessionTonnage(sessionId): number`
- `src/lib/services/analytics/progressionAdvisor.ts` — `getProgressionSuggestion(exerciseId): ProgressionSuggestion | null` with `suggested_weight`, `increment_kg`, `reason`, `sessions_analyzed`; configurable thresholds (min sessions, min RIR, equipment-based rounding)
- `src/lib/services/analytics/deloadCalculator.ts` — `calculateDeloadSets(previousSets, deloadFactor?): DeloadSet[]` with reduced weight (~60%) and adjusted volume
- `src/lib/db/repositories/analytics.ts` — `AnalyticsRepository` with queries: `getExerciseSetsHistory(exerciseId, dateRange)`, `getCompletedWorkingSets(exerciseId, sessionIds)`, `getRecentSessionsForExercise(exerciseId, count)`, `getBodyWeightRange(dateRange)`
- Schema v5: composite index `idx_workout_sets_exercise_completed` on `(exercise_id, set_type, completed)` WHERE `deleted_at IS NULL`
- `src/lib/types/analytics.ts` — `PR`, `VolumeDataPoint`, `ProgressionSuggestion`, `DeloadSet`, `StrengthDataPoint`, `AnalyticsDateRange` types

Consumes:
- M001's `WorkoutRepository`, `ExerciseRepository`, `BodyWeightRepository`, `ProgramRepository`
- M001's `WorkoutSet`, `SetType`, `Exercise`, `Mesocycle` types
- M001's `dbQuery`/`dbExecute` from `database.ts`
- M001's sql.js test helpers

### S02 consumes from S01:
- All analytics service functions for chart data
- `AnalyticsRepository` for direct queries
- `StrengthDataPoint`, `VolumeDataPoint`, `AnalyticsDateRange` types

### S03 consumes from S01:
- `detectPRs()`, `getPRHistory()` from prDetector
- `PR` type
- Haptic service from M001

### S04 consumes from S01:
- `getProgressionSuggestion()` from progressionAdvisor
- `ProgressionSuggestion` type
- Workout `ExerciseCard.svelte` as integration point

### S05 consumes from S01:
- `calculateDeloadSets()` from deloadCalculator
- `DeloadSet` type
- `ProgramRepository.getMesocycleByProgramId()` from M001
- `WorkoutRepository.getLastSessionForDay()` pre-fill hook from M01

### S06 consumes from S02, S03, S04:
- Dashboard, PR history, and progression suggestion components (to gate/limit them)

Produces:
- `src/lib/services/premium.ts` — `isPremiumFeature(feature): boolean`, `getPremiumStatus(): PremiumStatus`, `PremiumFeature` enum (`full_charts`, `extended_history`, `progression_suggestions`, `volume_trends`)
- Upgrade prompt component for reuse at gate boundaries

### S07 consumes from all prior slices:
- All new `.svelte` components with user-facing text
- Existing `de.json` / `en.json` as base to extend
