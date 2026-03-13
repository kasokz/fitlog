# S02: Progress Dashboard with Interactive Charts

**Goal:** A user navigates to the progress dashboard and sees interactive strength curves (1RM over time), volume/tonnage trend charts, body weight chart, and training frequency summary — all rendered with LayerChart using real data from the S01 analytics engine. Exercise picker and time-range selector control what's displayed.
**Demo:** From the History page, tap the chart icon to navigate to `/history/analytics`. Select an exercise → see a line chart of estimated 1RM over time. Switch to volume tab → see bar/area chart of training volume. Switch to body weight tab → see body weight trend line. All charts respond to time-range changes (7d/30d/90d). Empty states display clearly when no data exists.

## Must-Haves

- LayerChart v2 (`layerchart@next`) installed and verified with existing `packages/ui/chart` wrappers
- Dashboard data service that transforms S01 analytics outputs into chart-ready shapes (Date objects, best-e1RM-per-date grouping, sorted arrays)
- Interactive strength curve chart (LineChart) showing estimated 1RM over time per exercise
- Volume/tonnage trend chart (BarChart or AreaChart) showing training volume per exercise or muscle group
- Body weight trend chart (LineChart) with smooth interpolation for sparse data
- Training frequency summary (stat cards showing session count per period)
- Exercise picker limited to exercises with workout history
- Time-range selector (7d / 30d / 90d) filtering chart data
- Dashboard route at `/history/analytics` with navigation link from History page header
- Empty states for each chart section when insufficient data exists
- All parallel data loading with Promise.all for performance

## Proof Level

- This slice proves: integration
- Real runtime required: yes (build must succeed; charts render with real analytics service wiring)
- Human/UAT required: yes (visual inspection of chart rendering quality and responsiveness)

## Verification

- `pnpm run build` completes with zero errors — confirms LayerChart integration, all imports resolve, and Svelte compilation succeeds
- `pnpm test` passes with all existing analytics tests still green (317 tests) — no regressions
- Dashboard route exists at `/history/analytics` and renders without runtime errors
- Strength chart, volume chart, body weight chart, and frequency summary are all present as distinct sections
- Exercise picker shows only exercises with workout history
- Time-range selector filters visible chart data
- Empty states render when a chart has no data

## Observability / Diagnostics

- Runtime signals: console error logging in `dashboardData.ts` service on query failures with `[Dashboard]` prefix, matching existing codebase pattern (e.g. `[History]`)
- Inspection surfaces: each chart component receives data as a prop — a future agent can inspect data flow by reading the dashboard page's `$effect` block and the `dashboardData.ts` module
- Failure visibility: loading/error states on the dashboard page surface query failures visually; `console.error` with exercise ID and date range context aids debugging
- Redaction constraints: none — analytics data contains no secrets

## Integration Closure

- Upstream surfaces consumed: `AnalyticsRepository` (4 query methods), `estimateOneRepMax()`, `bestEstimatedOneRM()`, `getExerciseVolume()`, `getMuscleGroupVolume()`, `ExerciseRepository.getAll()`, `BodyWeightRepository` (via `AnalyticsRepository.getBodyWeightRange()`), `WorkoutRepository.getCompletedSessions()` (for frequency), all types from `analytics.ts`
- New wiring introduced in this slice: `/history/analytics` route + dashboard data service composing S01 analytics into UI; History page header link; LayerChart dependency installed; chart components consuming real SQLite data via analytics services
- What remains before the milestone is truly usable end-to-end: S03 (PR detection/celebration at session completion), S04 (progression suggestion banners during workout), S05 (deload auto-adjustment), S06 (freemium gate), S07 (i18n for all analytics UI)

## Tasks

- [x] **T01: Install LayerChart and build dashboard data service** `est:1h`
  - Why: LayerChart is not installed — nothing chart-related compiles without it. The data service transforms raw analytics outputs into chart-ready shapes (Date objects, best-e1RM-per-date grouping), keeping chart components thin.
  - Files: `apps/mobile/package.json`, `apps/mobile/src/lib/services/analytics/dashboardData.ts`
  - Do: Install `layerchart@next` as devDependency in `apps/mobile`. Verify `packages/ui/chart` wrappers compile. Pin version in package.json. Create `dashboardData.ts` with functions: `getStrengthChartData(exerciseId, dateRange)` → best e1RM per date as `{date: Date, e1rm: number}[]`; `getVolumeChartData(exerciseId, dateRange)` → `{date: Date, totalVolume: number, setCount: number}[]`; `getBodyWeightChartData(dateRange)` → `{date: Date, weight: number}[]`; `getTrainingFrequency(dateRange)` → `{totalSessions: number, avgPerWeek: number}`; `getExercisesWithHistory()` → exercises that have at least one completed working set. Each function converts YYYY-MM-DD strings to Date objects for scaleUtc().
  - Verify: `pnpm run build` succeeds with zero errors; `pnpm test` still passes (317 tests)
  - Done when: LayerChart is installed, `dashboardData.ts` exports all 5 functions, build passes

- [x] **T02: Build StrengthChart and VolumeChart components** `est:1h`
  - Why: The core chart components are the visual centerpiece of the dashboard. Each wraps a LayerChart simplified component with the shadcn-svelte chart wrappers.
  - Files: `apps/mobile/src/lib/components/analytics/StrengthChart.svelte`, `apps/mobile/src/lib/components/analytics/VolumeChart.svelte`
  - Do: Create `StrengthChart.svelte` — accepts `data: {date: Date, e1rm: number}[]` and `exerciseName: string`. Uses `Chart.Container` + `LineChart` with `scaleUtc()`, `curveNatural`, x-axis date formatting, tooltip, chart config with `--chart-1` color. Wraps in `Card` with title showing exercise name + "Est. 1RM (kg)" y-axis. Shows empty state message when data is empty array. Create `VolumeChart.svelte` — accepts `data: {date: Date, totalVolume: number, setCount: number}[]`. Uses `Chart.Container` + `AreaChart` with gradient fill, `scaleUtc()`, `curveNatural`. Wraps in Card. Shows empty state when no data. Follow the exact patterns from `chart-line-interactive.svelte` and `chart-area-interactive.svelte` references.
  - Verify: `pnpm run build` succeeds
  - Done when: Both components compile, accept typed props, render chart or empty state

- [x] **T03: Build BodyWeightChart, FrequencySummary, and ExercisePickerSelect components** `est:45m`
  - Why: Completes the remaining dashboard chart sections and the exercise picker control needed before assembling the full page.
  - Files: `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte`, `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte`, `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte`
  - Do: Create `BodyWeightChart.svelte` — accepts `data: {date: Date, weight: number}[]`. LineChart with `curveNatural` for smooth interpolation of sparse data. Card wrapper. Empty state pointing to Body Weight tab if no data. Create `FrequencySummary.svelte` — accepts `totalSessions: number` and `avgPerWeek: number`. Renders stat cards (2-column grid) showing total sessions and average sessions/week in the selected period. Create `ExercisePickerSelect.svelte` — accepts `exercises` array (id + name) and bindable `value` (selected exercise ID). Uses `Select` component from `@repo/ui`. Shows exercise names as options.
  - Verify: `pnpm run build` succeeds
  - Done when: All three components compile and accept typed props

- [x] **T04: Assemble dashboard page, wire navigation, and verify full integration** `est:1h`
  - Why: Connects all components into the actual dashboard page, wires real data loading, adds navigation from History, and proves the full integration works end-to-end.
  - Files: `apps/mobile/src/routes/history/analytics/+page.svelte`, `apps/mobile/src/routes/history/+page.svelte`, `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte`
  - Do: Create `TimeRangeSelect.svelte` — Select component with 7d/30d/90d options, bindable value. Create dashboard page at `/history/analytics/+page.svelte` — loads exercises with history on mount via `$effect`, shows ExercisePickerSelect + TimeRangeSelect in header area. Uses `$effect` reactive to selected exercise + time range to load all chart data in parallel via `Promise.all`. Shows loading spinner during fetch. Renders tabbed sections (Tabs component) for Strength / Volume / Body Weight / Frequency. Each tab section renders the corresponding chart component with loaded data. Add chart icon button (TrendingUp or BarChart3 from lucide) to History page header that navigates to `/history/analytics`. Verify full flow: build succeeds, History page shows link, dashboard page renders all sections.
  - Verify: `pnpm run build` succeeds with zero errors; `pnpm test` passes all 317 tests; route `/history/analytics` exists in the build output
  - Done when: Dashboard page renders all 4 chart sections with real data wiring, navigation link exists on History page, build passes with zero errors, no test regressions

## Files Likely Touched

- `apps/mobile/package.json` (layerchart dependency)
- `apps/mobile/src/lib/services/analytics/dashboardData.ts` (new — data service)
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` (new)
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` (new)
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` (new)
- `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte` (new)
- `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte` (new)
- `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte` (new)
- `apps/mobile/src/routes/history/analytics/+page.svelte` (new — dashboard page)
- `apps/mobile/src/routes/history/+page.svelte` (modified — add chart icon link)
