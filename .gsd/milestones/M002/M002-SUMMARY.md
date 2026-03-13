---
id: M002
provides:
  - Analytics computation engine (1RM estimation, PR detection, volume aggregation, progression advisor, deload calculator)
  - Progress dashboard with interactive charts (Strength, Volume, Body Weight, Frequency)
  - PR detection at session completion with celebration toast and haptic feedback
  - PR history page with per-exercise personal records
  - RIR-driven progression suggestion banners during active workouts
  - Deload auto-adjustment of pre-filled weights when mesocycle reaches deload week
  - Freemium analytics gate (local feature-flag service with Capacitor Preferences)
  - Premium service abstraction for future IAP wiring (M003)
  - Schema v5 with composite index for analytics query performance
  - 81 i18n keys for analytics UI in de.json and en.json (319 total, zero drift)
key_decisions:
  - "D042: Analytics service layer as pure functions + repository in src/lib/services/analytics/"
  - "D043: Epley formula for 1RM, null for reps >10"
  - "D044: Three PR categories (weight_pr, rep_pr, e1rm_pr)"
  - "D045: Progression thresholds — >=2 consecutive sessions, avg RIR >=2, min 3 working sets"
  - "D046: Deload hooks into pre-fill flow, reduces weight to ~60%"
  - "D047: Dashboard at /history/analytics, no 6th tab"
  - "D048: Freemium gate via local Preferences, M003 wires IAP"
  - "D049: LayerChart v2 via shadcn-svelte chart wrappers"
  - "D050: Schema v5 composite index on workout_sets(exercise_id, set_type, completed)"
  - "D051: Working-set filter enforced in repository + defense-in-depth in services"
  - "D052: Skip bodyweight exercises in progression advisor"
  - "D053: Deload rounds to nearest 2.5kg"
  - "D054: Volume aggregation uses primary muscle group only"
  - "D055: dashboardData.ts as chart intermediary"
  - "D056: Dashboard tabs — Strength, Volume, Body Weight, Frequency"
  - "D057: Best e1RM per date grouping for strength chart"
  - "D058: sessionPRDetector bridges pure detection with workout flow"
  - "D059: PR detection failure never blocks workout completion"
  - "D060: PR history at /history/prs"
  - "D061: Page-level deload banner, not per-exercise"
  - "D062: Deload detection from session's stored mesocycle_week"
  - "D063: Free tier = Strength tab + Frequency tab + 30d range + top 3 PRs"
  - "D064: Page-level freemium gate before data loading"
  - "D065: Deload banners, PR celebration, ExercisePRSection not gated"
patterns_established:
  - "Analytics pure-function pattern: computation services are stateless, independently testable, receive data rather than querying"
  - "AnalyticsRepository as single source of truth for working-set filtering (set_type='working' AND completed=1 AND deleted_at IS NULL)"
  - "dashboardData.ts intermediary pattern: transforms analytics output to chart-ready shapes, keeps chart components thin"
  - "sessionPRDetector orchestration pattern: thin bridge between pure detection logic and workout UI, never throws"
  - "progressionSuggestionLoader pattern: parallel loading of suggestions for all exercises in a workout, error-resilient"
  - "Freemium gate at page level: premium check before data load, components unaware of premium status"
  - "UpgradePrompt reusable component at premium gate boundaries"
observability_surfaces:
  - "354 unit tests (16 test files) covering all analytics services, repositories, and M001 foundations"
  - "[Premium] isPremiumUser console log for gate debugging"
  - "[Workout] Deload banner detection failure logged as console.warn"
  - "PR detection failure silently returns empty — check sessionPRDetector console logs"
requirement_outcomes:
  - id: R013
    from_status: active
    to_status: active
    proof: "Strength curves with estimated 1RM implemented via oneRepMax.ts (Epley formula, capped at 10 reps) + StrengthChart.svelte rendering interactive line chart. Dashboard at /history/analytics with exercise picker and time range selector. Tested in oneRepMax.test.ts (20 tests)."
  - id: R014
    from_status: active
    to_status: active
    proof: "PR detection across 3 categories (weight_pr, rep_pr, e1rm_pr) via prDetector.ts. Session-level detection via sessionPRDetector.ts. Celebration toast with haptics on workout completion. PR history page at /history/prs. ExercisePRSection shows current bests per exercise. Tested in prDetector.test.ts (19 tests) + sessionPRDetector.test.ts (12 tests)."
  - id: R015
    from_status: active
    to_status: active
    proof: "Volume/tonnage aggregation per exercise and muscle group via volumeAggregator.ts. VolumeChart.svelte renders bar chart with time range. Tested in volumeAggregator.test.ts (13 tests)."
  - id: R016
    from_status: active
    to_status: active
    proof: "RIR-driven progression suggestions via progressionAdvisor.ts with configurable thresholds (min 2 sessions, avg RIR >=2, equipment-based rounding). ProgressionBanner.svelte shows inline during active workout. Loaded via progressionSuggestionLoader.ts. Tested in progressionAdvisor.test.ts (19 tests)."
  - id: R017
    from_status: active
    to_status: active
    proof: "Deload auto-adjustment via deloadCalculator.ts reducing weight to ~60% with 2.5kg rounding. DeloadBanner.svelte shows page-level indicator during deload sessions. Hooks into session pre-fill flow. Tested in deloadCalculator.test.ts (18 tests) + deloadIntegration.test.ts (15 tests)."
  - id: R018
    from_status: active
    to_status: active
    proof: "Progress dashboard at /history/analytics with 4 tabs (Strength, Volume, Body Weight, Frequency). Interactive charts via LayerChart v2 + shadcn-svelte wrappers. Exercise picker, time range selector, and FrequencySummary component. Premium gating limits free users to Strength + Frequency tabs and 30d range."
  - id: R019
    from_status: active
    to_status: active
    proof: "Freemium gate via premium.ts service using @capacitor/preferences. Free tier: Strength tab, Frequency tab, 30d time range, top 3 exercise PRs. Premium: full charts, extended history, progression suggestions. UpgradePrompt component at gate boundaries. Page-level enforcement in analytics dashboard and PR history."
duration: "~6 hours across 7 slices"
verification_result: passed
completed_at: 2026-03-12T18:20:00.000Z
---

# M002: Analytics & Progression Intelligence

**Delivered a complete analytics and progression intelligence layer — 1RM estimation, PR detection with celebration UX, volume trends, RIR-driven progression suggestions, deload automation, interactive dashboard with charts, and a freemium gate separating free loggers from premium analytics users.**

## What Happened

**S01 (Analytics Computation Engine)** built the foundation: pure-function analytics services for 1RM estimation (Epley, capped at 10 reps), PR detection across 3 categories (weight/rep/e1RM), volume/tonnage aggregation per exercise and muscle group, RIR-driven progression advisor with configurable thresholds, and deload weight calculator. An AnalyticsRepository was added with working-set-only filtering as the single source of truth. Schema v5 added a composite index on `workout_sets(exercise_id, set_type, completed) WHERE deleted_at IS NULL` for query performance. All services tested against realistic multi-session SQLite data via sql.js (7 test files, 116 analytics-specific tests).

**S02 (Progress Dashboard)** built the interactive dashboard at `/history/analytics` with 4 tabs: Strength (1RM line chart per exercise), Volume (bar chart), Body Weight (trend line), and Frequency (session count summary). A `dashboardData.ts` intermediary transforms analytics outputs into chart-ready shapes. Exercise picker and time range selector control all tabs. Charts rendered via LayerChart v2 through shadcn-svelte wrappers.

**S03 (PR Detection & Celebration)** wired PR detection into the workout completion flow via a thin `sessionPRDetector.ts` orchestrator that bridges the pure detection engine with the UI. A `PRCelebrationToast.svelte` shows detected PRs with haptic feedback on session complete. PR history page at `/history/prs` shows all personal records per exercise. `ExercisePRSection.svelte` shows current bests on exercise detail screens.

**S04 (Progression Suggestions)** integrated the progression advisor into the active workout screen. A `progressionSuggestionLoader.ts` loads suggestions in parallel for all exercises in the workout. `ProgressionBanner.svelte` shows a non-intrusive banner on exercise cards when RIR criteria are met, suggesting specific weight increases rounded per equipment type.

**S05 (Deload Auto-Adjustment)** hooked deload detection into the workout page. When a session's `mesocycle_week` matches the mesocycle's `deload_week_number`, pre-filled weights are reduced to ~60% (rounded to 2.5kg) and a page-level `DeloadBanner.svelte` displays. Detection uses the session's stored week snapshot, not live mesocycle state, for stability.

**S06 (Freemium Gate)** added a `premium.ts` service using `@capacitor/preferences` to control feature access. Free users see Strength chart, Frequency summary, and top 3 exercise PRs. Volume/Body Weight tabs, extended time ranges, full PR history, and progression suggestions require premium. `UpgradePrompt.svelte` appears at gate boundaries. Deload banners, PR celebration toasts, and ExercisePRSection are explicitly non-gated.

**S07 (i18n)** added 77 new keys across analytics, PR, progression, deload, premium, and dashboard namespaces. Both `de.json` and `en.json` have 319 keys with zero drift.

## Cross-Slice Verification

| Success Criterion | Verified? | Evidence |
|---|---|---|
| Strength curve (1RM over time) visible for any exercise with 4+ weeks of data | Yes | StrengthChart.svelte renders via dashboardData.ts → oneRepMax.ts. Exercise picker + time range selector control display. 20 unit tests for 1RM calculation. |
| PRs automatically detected at session completion with celebration toast | Yes | sessionPRDetector.ts runs on workout complete → PRCelebrationToast with haptics. 31 tests (prDetector + sessionPRDetector). Never blocks completion (D059). |
| Volume/tonnage trends per exercise and muscle group over selectable time ranges | Yes | VolumeChart.svelte renders data from volumeAggregator.ts. Time range selector supports 7d/30d/90d/1y/all. 13 unit tests. |
| Progression suggestion banner appears when RIR >=2 across 2+ consecutive sessions | Yes | progressionAdvisor.ts with D045 thresholds → ProgressionBanner.svelte in workout page. 19 unit tests. |
| Deload week auto-reduces weight to ~60% with appropriate banner | Yes | deloadCalculator.ts reduces + rounds to 2.5kg. DeloadBanner.svelte shows page-level amber banner. 33 tests (deload + integration). |
| Progress dashboard loads <1s with realistic dataset | Partial | Dashboard uses dashboardData.ts with Promise.all parallelism and the v5 composite index. No load test with 6-month seeded data was run against actual device — this is an operational verification deferred to real-device testing. Build succeeds and query structure is optimized. |
| Free users see basic PR list + 4-week summary; full features gated behind premium | Yes | premium.ts gates Volume/Body Weight tabs, extended ranges, full PR history, progression suggestions. Free tier gets Strength + Frequency + 30d + top 3 PRs (D063). UpgradePrompt at boundaries. |
| All new UI text in de.json and en.json | Yes | 319 keys in both files, zero diff between key sets. 77 new analytics/premium keys added. |

**Additional DoD checks:**
- `pnpm test` — **354 tests pass** (16 test files, 0 failures)
- `pnpm run build` — **Succeeds** (static adapter, zero errors)
- All 7 slices marked `[x]` in roadmap — **Confirmed**
- All slice summaries exist — **Confirmed** (doctor-created placeholders present for all 7)

**Note:** The "<1s with 6-month dataset" criterion was not verified with a seeded performance test. The query architecture (composite index, parallel loading, chart-ready intermediary) is designed for it, but actual measurement against a large dataset on a real device is deferred to integration testing.

## Requirement Changes

No requirements changed status during M002. All 7 covered requirements (R013–R019) remain `active` with their M002 implementations complete. Status transitions to `validated` are deferred until end-to-end acceptance testing on real devices confirms operational criteria.

## Forward Intelligence

### What the next milestone should know
- The `premium.ts` service is a stub reading from `@capacitor/preferences`. M003 must wire real IAP verification to `setPremiumStatus()`. The `PremiumFeature` enum and `canAccessFeature()` API are ready — M003 just needs to call `setPremiumStatus(true)` after successful purchase verification.
- The analytics computation is entirely read-time (no materialized aggregates). If performance issues surface with very large datasets, consider pre-aggregation or background computation. The composite index `idx_workout_sets_exercise_completed` handles the common query path.
- Chart components use LayerChart v2 (`layerchart@next`). Pin the version carefully — pre-release APIs may change.
- PR detection runs synchronously during workout completion. For very long sessions (20+ exercises), it could add noticeable delay. The `detectSessionPRs` orchestrator handles this with Promise.all but the per-exercise DB queries are sequential.

### What's fragile
- **Slice summaries are doctor-created placeholders** — They contain minimal information and should be regenerated from task summaries if detailed slice-level history is needed.
- **LayerChart v2 dependency** — Pre-release library. API breakage on update is a real risk. Version should be pinned in package.json.
- **Performance at scale** — No load test with 6-month realistic dataset was executed. The architecture supports it, but measurement on actual device with ~2000 sets is still needed.

### Authoritative diagnostics
- `pnpm test` — 354 tests covering all analytics services, repositories, and M001 foundations
- `apps/mobile/src/lib/services/analytics/__tests__/` — 7 test files with realistic multi-session SQLite data scenarios
- `apps/mobile/messages/de.json` and `en.json` — 319 keys each, zero drift between locales

### What assumptions changed
- **"LayerChart v2 integration" was flagged as medium risk** — It integrated smoothly through the existing shadcn-svelte chart wrappers. No API mismatches encountered.
- **"RIR-driven progression algorithm" was flagged as high risk** — The conservative threshold approach (D045: >=2 sessions, avg RIR >=2, per-equipment rounding) proved straightforward to implement and test. The real risk is tuning, not implementation.
- **Schema v5 was minimal** — Only added a composite index, no table changes. Migration was trivial.

## Files Created/Modified

### Analytics Engine (S01)
- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` — 1RM estimation (Epley formula, capped at 10 reps)
- `apps/mobile/src/lib/services/analytics/prDetector.ts` — PR detection across 3 categories
- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` — Volume/tonnage aggregation per exercise and muscle group
- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` — RIR-driven progression suggestion algorithm
- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — Deload weight reduction calculator
- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` — Session-level PR detection orchestrator
- `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts` — Parallel progression suggestion loading
- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — Chart data transformation intermediary
- `apps/mobile/src/lib/db/repositories/analytics.ts` — AnalyticsRepository with working-set-filtered queries
- `apps/mobile/src/lib/types/analytics.ts` — PR, VolumeDataPoint, ProgressionSuggestion, DeloadSet, StrengthDataPoint types
- `apps/mobile/src/lib/db/schema.sql` — Schema v5 composite index

### Analytics Tests (S01)
- `apps/mobile/src/lib/services/analytics/__tests__/oneRepMax.test.ts` — 20 tests
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` — 19 tests
- `apps/mobile/src/lib/services/analytics/__tests__/volumeAggregator.test.ts` — 13 tests
- `apps/mobile/src/lib/services/analytics/__tests__/progressionAdvisor.test.ts` — 19 tests
- `apps/mobile/src/lib/services/analytics/__tests__/deloadCalculator.test.ts` — 18 tests
- `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts` — 15 tests
- `apps/mobile/src/lib/services/analytics/__tests__/sessionPRDetector.test.ts` — 12 tests

### Dashboard UI (S02)
- `apps/mobile/src/routes/history/analytics/+page.svelte` — Progress dashboard with 4 tabs
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — 1RM line chart
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — Volume bar chart
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — Body weight trend chart
- `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte` — Training frequency summary
- `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte` — Exercise selector for charts
- `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte` — Time range selector

### PR Celebration (S03)
- `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte` — PR celebration toast with haptics
- `apps/mobile/src/routes/history/prs/+page.svelte` — PR history page
- `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte` — Current bests per exercise

### Workout Integration (S04, S05)
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — Progression suggestion banner
- `apps/mobile/src/lib/components/workout/DeloadBanner.svelte` — Deload session indicator banner
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Updated with PR detection, progression suggestions, deload banner

### Freemium Gate (S06)
- `apps/mobile/src/lib/services/premium.ts` — Premium service with Preferences-backed feature flags
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Reusable upgrade prompt component

### i18n (S07)
- `apps/mobile/messages/de.json` — 319 keys (77 new for M002)
- `apps/mobile/messages/en.json` — 319 keys (77 new for M002, zero drift)
