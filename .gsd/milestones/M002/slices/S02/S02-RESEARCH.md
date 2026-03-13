# S02: Progress Dashboard with Interactive Charts — Research

**Date:** 2026-03-12

## Summary

S02 builds the interactive progress dashboard — the visual payoff for all the data logging users have done. The analytics computation engine from S01 is solid: `AnalyticsRepository` (4 query methods), `oneRepMax.ts`, `prDetector.ts`, `volumeAggregator.ts`, `progressionAdvisor.ts`, and `deloadCalculator.ts` are all tested (317 tests passing). The dashboard needs to wire these services into interactive chart components via LayerChart v2.

The biggest practical risk is **LayerChart installation and integration**. The library is not installed anywhere — neither in `apps/mobile` nor `packages/ui`. The `packages/ui/src/components/ui/chart/` wrappers (ChartContainer, ChartTooltip, ChartStyle, chart-utils) already import from `layerchart` and expect it to be available, but it's a missing dependency. The shadcn-svelte chart docs show the pattern clearly: `Chart.Container` wraps the chart, LayerChart's simplified components (`LineChart`, `BarChart`, `AreaChart`) render the data, and `Chart.Tooltip` provides styled tooltips via snippets. The reference registry has working examples for line-interactive, area-interactive, bar-active, and line-multiple patterns — all directly applicable.

Navigation is decided (D047): dashboard lives at `/history/analytics` as a sub-route, linked from the History page header. This avoids adding a 6th bottom tab (D036 constraint). The dashboard will need: an exercise picker (reuse `ExercisePicker.svelte` pattern or build a `Select`-based picker), a time-range selector (Select component exists in packages/ui), and chart sections for strength curves (LineChart), volume trends (BarChart/AreaChart), body weight (LineChart), and training frequency summary (stat cards).

## Recommendation

**Install LayerChart first, then build incrementally: data-loading service layer → chart components → dashboard page → exercise picker + time range → empty states.**

1. Install `layerchart@next` and `d3-scale`/`d3-shape` as devDependencies in `apps/mobile`. Verify the existing chart wrappers in `packages/ui` compile without errors.
2. Create a dashboard data service (`src/lib/services/analytics/dashboardData.ts`) that aggregates the S01 services into chart-ready data shapes. This keeps chart components thin — they receive pre-shaped data, not raw analytics results.
3. Build chart components as isolated Svelte components: `StrengthChart.svelte`, `VolumeChart.svelte`, `BodyWeightChart.svelte`, `FrequencySummary.svelte`. Each wraps a single LayerChart simplified component.
4. Build the dashboard page at `/history/analytics/+page.svelte` with exercise picker, time-range selector, and chart sections.
5. Link from History page header and add empty states for insufficient data (CR-005).

**Key pattern from reference examples:** Use `Chart.Container` with `config` for color theming → `LineChart`/`BarChart` with `data`, `x`, `xScale={scaleUtc()}`, `series`, `axis` → `{#snippet tooltip()}<Chart.Tooltip />{/snippet}` for tooltips. Time-range filtering is client-side (filter the data array by date, pass filtered data to chart).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Interactive line/area/bar charts | LayerChart v2 via shadcn-svelte chart wrappers | Project's chosen chart library. Wrappers already exist in `packages/ui`. Reference examples show exact patterns for time-series with tooltips, legends, and series switching. |
| Chart container + tooltip theming | `ChartContainer`, `ChartTooltip`, `ChartStyle` in `packages/ui/src/components/ui/chart/` | Already built with neobrutalist color tokens (`--chart-1` through `--chart-5`). Handles dark/light mode via `THEMES` in chart-utils. |
| Date axis scaling | `scaleUtc()` from `d3-scale` | Standard for time-series charts. Used in all LayerChart line/area examples. Comes as peer dep of layerchart. |
| Smooth line curves | `curveNatural` from `d3-shape` | Used in reference examples for smooth spline rendering. Peer dep of layerchart. |
| Exercise picker UI | Existing pattern from `ExercisePicker.svelte` (Drawer + search + list) | Already handles exercise search, filtering, and selection. Can be adapted or a simpler Select-based picker built for the dashboard. |
| Time-range selector | `Select` component from `@repo/ui/components/ui/select` | Already used in `MesocycleForm.svelte` and `ExerciseForm.svelte`. Reference `chart-area-interactive.svelte` shows exact pattern with 7d/30d/90d options. |
| Card layout for chart sections | `Card` component from `@repo/ui/components/ui/card` | All chart reference examples wrap charts in Cards with header/content/footer sections. |
| Tabs for dashboard sections | `Tabs` component from `@repo/ui/components/ui/tabs` | Available in packages/ui. Can organize dashboard into sections (Strength / Volume / Body Weight). |
| Date formatting | `Intl.DateTimeFormat` / `toLocaleDateString` | Already used throughout codebase. Reference examples format x-axis ticks with `v.toLocaleDateString("en-US", { month: "short", day: "numeric" })`. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` — `estimateOneRepMax(weight, reps)` and `bestEstimatedOneRM(sets)`. Strength chart data comes from `AnalyticsRepository.getExerciseSetsHistory()` → map each set to `{ date, e1rm }` using `estimateOneRepMax`. Only sets with reps <= 10 produce valid e1RM values.
- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` — `getExerciseVolume(exerciseId, dateRange)` and `getMuscleGroupVolume(muscleGroup, dateRange)` return `VolumeDataPoint[]` with `{ date, totalVolume, setCount }`. Directly chart-ready for bar/area charts.
- `apps/mobile/src/lib/db/repositories/analytics.ts` — `AnalyticsRepository.getExerciseSetsHistory()` returns all completed working sets with session timestamps. `getBodyWeightRange(dateRange)` returns body weight entries. Both ordered chronologically.
- `apps/mobile/src/lib/services/analytics/prDetector.ts` — `getPRHistory(exerciseId)` returns chronological PR list. Can show PR markers on strength chart or in a summary stat.
- `packages/ui/src/components/ui/chart/` — Chart wrappers ready to use. `ChartContainer` takes `config: ChartConfig` and renders children. `ChartTooltip` integrates with LayerChart's tooltip context. `chart-utils.ts` exports `ChartConfig` type and `getPayloadConfigFromPayload`.
- `packages/ui/src/globals.css` — Chart color tokens `--chart-1` through `--chart-5` defined for both light and dark themes in oklch. Already referenced as `--color-chart-N` via `@theme inline`.
- `apps/mobile/src/routes/history/+page.svelte` — Current History page with session list. Dashboard link should be added to its header (e.g., a chart icon button that navigates to `/history/analytics`).
- `apps/mobile/src/lib/components/BottomNav.svelte` — 5-tab nav, History tab covers `/history` and sub-routes via `pathname.startsWith(tabHref + '/')`. `/history/analytics` will automatically highlight the History tab.
- `apps/mobile/src/lib/components/programs/ExercisePicker.svelte` — Drawer-based exercise picker with search. Pattern to reference or adapt for dashboard exercise selection.
- `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-line-interactive.svelte` — Reference implementation for interactive line chart with series switching, `scaleUtc()`, `curveNatural`, tooltips, and card layout. Most relevant reference for the strength curve chart.
- `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-area-interactive.svelte` — Reference implementation for area chart with time-range selector (Select with 7d/30d/90d), gradient fills, and stacked series. Most relevant reference for the volume trend chart.
- `apps/mobile/src/lib/types/analytics.ts` — `StrengthDataPoint { date, estimatedOneRM, weight, reps }`, `VolumeDataPoint { date, totalVolume, setCount }`, `AnalyticsDateRange { start, end }`. Chart components should consume these types directly.
- `apps/mobile/src/lib/types/exercise.ts` — `Exercise`, `MuscleGroup`, `Equipment` types. Exercise picker needs these. `MuscleGroup` enum has 12 values; used for muscle-group volume filtering.
- `apps/mobile/src/lib/db/repositories/exercise.ts` — `ExerciseRepository.getAll()`, `.search()`, `.filterByMuscleGroup()`. Needed for populating exercise picker in dashboard.
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — `BodyWeightRepository.getRange(startDate, endDate)` returns entries for body weight chart.

## Constraints

- **LayerChart is NOT installed.** Must install `layerchart@next` as a devDependency in `apps/mobile` before any chart code will compile. The `packages/ui` chart wrappers import directly from `layerchart` — they will fail to resolve until the package is present.
- **d3-scale and d3-shape are peer dependencies.** LayerChart uses `scaleUtc` from `d3-scale` and `curveNatural` from `d3-shape`. These may come transitively with layerchart, but should be verified after installation. If not, install explicitly.
- **5-tab bottom nav constraint (D036).** Dashboard must live at `/history/analytics`, not as a new tab. The BottomNav `isActive` check already handles sub-routes.
- **SPA mode only (ssr = false).** All data loading is client-side in `$effect` blocks, not in `+page.ts` load functions (matching the pattern in History and BodyWeight pages).
- **Set type filter is critical.** Charts must only show data from completed working sets. S01's analytics services already enforce this at the repository + service layers. Dashboard code should NOT apply additional filtering — just pass exercise IDs and date ranges to the service functions.
- **Weight is always kg internally (D030).** Chart y-axis labels show kg. Unit conversion display is deferred.
- **Chart data volume.** For time ranges > 3 months, consider aggregating data points to weekly granularity to avoid rendering 100+ points. The `getExerciseVolume` already groups by date — but strength curve data (per-set e1RM) can have many points per session.
- **Capacitor bridge overhead.** Each `dbQuery` call has ~1-5ms overhead. Dashboard loads multiple chart types, each calling multiple queries. Batch where possible — e.g., load all chart data in parallel using `Promise.all` on initial page load.
- **layerchart@next is pre-release (D049).** Pin the exact version after install to avoid unintended breakage from minor releases.

## Common Pitfalls

- **Importing from layerchart before it's installed.** The `packages/ui` chart wrappers already import `layerchart`. Any build/dev server will fail until the package is installed. Install it as the very first task.
- **Not converting date strings to Date objects for scaleUtc.** The analytics services return dates as `YYYY-MM-DD` strings. `scaleUtc()` from d3-scale expects `Date` objects. Must map `new Date(dataPoint.date)` before passing to chart components.
- **Empty data arrays crash LayerChart.** If an exercise has no history, passing `[]` to a `LineChart` may render a blank chart or error. Each chart needs an empty-state guard that shows a message instead of rendering the chart component.
- **Multiple e1RM values per date for strength chart.** A user may do multiple working sets in one session. `getExerciseSetsHistory` returns all sets. For the strength chart, take the best e1RM per date (not all sets) to avoid cluttered overlapping points. Use `bestEstimatedOneRM` grouped by date.
- **Time-range selector timezone issues.** Dates from SQLite are stored as `YYYY-MM-DD` or ISO timestamps. When creating `AnalyticsDateRange`, use the current date in user's local timezone for the `end` date, and subtract days for `start`. Don't use UTC dates for local date comparisons.
- **Body weight chart with sparse data.** Users may log body weight irregularly (e.g., 3 entries over 2 months). A line chart with sparse points still looks fine but should use `curveNatural` for smooth interpolation rather than `curveLinear`.
- **Exercise picker performance.** `ExerciseRepository.getAll()` returns all exercises. For the dashboard picker, only exercises with actual workout history are relevant. Consider a query that returns exercises with at least one completed session, or filter client-side after fetching all exercises (simpler, exercise count is bounded by seed data + custom).
- **Chart re-rendering on exercise/time-range change.** When the user changes the selected exercise or time range, chart data must reload. Use `$effect` with dependency on the selected exercise ID and time range. Ensure loading states are shown during data fetch to prevent stale chart display.

## Open Risks

- **LayerChart v2 API stability.** Pre-release library. The simplified `LineChart`/`BarChart`/`AreaChart` API may change. The reference examples use `series`, `x`, `xScale`, `axis`, `props`, `tooltip` snippet — pin the version and lock the pattern. If the API breaks, fallback to LayerChart's primitive components (`Chart`, `Svg`, `Spline`, `Area`, `Bar`) which are more stable but more verbose.
- **Performance with large datasets.** A user with 6 months of 4x/week training has ~100 sessions. Per exercise, that's ~25-50 sessions with ~3-5 working sets each = 75-250 data points for the strength chart. Should render fine, but volume chart across all exercises in a muscle group could multiply this. Test with realistic data volume.
- **Missing exercise history.** The exercise picker should only show exercises the user has actually trained. If it shows all 50+ seed exercises, most will have no data and show empty charts. Need to either pre-filter or handle empty state gracefully per chart.
- **Body weight chart may have no data.** Body weight tracking is optional. If a user never logged body weight, that chart section should show an empty state pointing to the Body Weight tab.
- **Training frequency summary scope.** The roadmap says "training frequency summary" but S01 didn't build a dedicated frequency service. Can be computed as session count per week from `WorkoutRepository.getCompletedSessions()` filtered by date range, or by counting distinct dates in `AnalyticsRepository.getExerciseSetsHistory()` results. Keep it simple — a stat card showing "N sessions this week/month".

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| LayerChart (Svelte 5) | `spences10/svelte-skills-kit@layerchart-svelte5` | available (78 installs) — recommended, targets exactly the stack we use |
| LayerChart | `linehaul-ai/linehaulai-claude-marketplace@layerchart` | available (16 installs) |
| shadcn-svelte | (in references at `./references/shadcn-svelte`) | installed |
| Svelte 5 | (in references at `./references/svelte`) | installed |

**Recommendation:** Consider installing `spences10/svelte-skills-kit@layerchart-svelte5` before implementation tasks. It has the most installs and specifically targets LayerChart + Svelte 5 — the exact combination this slice needs. Install command: `npx skills add spences10/svelte-skills-kit@layerchart-svelte5`

## Sources

- LayerChart usage patterns via shadcn-svelte chart docs (source: `references/shadcn-svelte/docs/content/components/chart.md`)
- Interactive line chart with series switching (source: `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-line-interactive.svelte`)
- Interactive area chart with time-range selector (source: `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-area-interactive.svelte`)
- Bar chart with custom bars (source: `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-bar-active.svelte`)
- Line chart with multiple series (source: `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-line-multiple.svelte`)
- S01 task summaries T01-T05 for analytics service contracts and verified test counts
- Chart color tokens confirmed in `packages/ui/src/globals.css` lines 28-32, 83-87, 144-148
- Navigation decision D047 in DECISIONS.md — dashboard at `/history/analytics`
- Freemium gate D048 — full charts are premium; S02 builds without gate, S06 adds it
