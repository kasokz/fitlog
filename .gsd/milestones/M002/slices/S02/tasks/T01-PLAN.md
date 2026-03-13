---
estimated_steps: 5
estimated_files: 3
---

# T01: Install LayerChart and build dashboard data service

**Slice:** S02 — Progress Dashboard with Interactive Charts
**Milestone:** M002

## Description

LayerChart v2 is not installed anywhere — the `packages/ui/chart` wrappers import from `layerchart` but it's a missing dependency. This task installs it, verifies compilation, and creates the data service layer that transforms raw analytics outputs into chart-ready shapes. The data service is the single bridge between S01's analytics engine and the chart components, keeping chart components thin (data in → render).

## Steps

1. Install `layerchart@next` as a devDependency in `apps/mobile` using `pnpm add -D layerchart@next`. Verify that `d3-scale` and `d3-shape` are available (they may come transitively; if not, install explicitly). Pin the exact installed version in `package.json`.
2. Run `pnpm run build` to verify that `packages/ui/chart` wrappers (`ChartContainer`, `ChartTooltip`, `ChartStyle`, `chart-utils`) resolve their `layerchart` imports without errors.
3. Create `apps/mobile/src/lib/services/analytics/dashboardData.ts` with the following exported functions:
   - `getStrengthChartData(exerciseId: UUID, dateRange?: AnalyticsDateRange): Promise<StrengthChartPoint[]>` — calls `AnalyticsRepository.getExerciseSetsHistory()`, groups sets by date (YYYY-MM-DD), computes best e1RM per date via `estimateOneRepMax`, converts dates to `Date` objects, returns sorted ascending. Type: `{date: Date, e1rm: number}`.
   - `getVolumeChartData(exerciseId: UUID, dateRange?: AnalyticsDateRange): Promise<VolumeChartPoint[]>` — calls `getExerciseVolume()`, converts date strings to Date objects. Type: `{date: Date, totalVolume: number, setCount: number}`.
   - `getBodyWeightChartData(dateRange: AnalyticsDateRange): Promise<BodyWeightChartPoint[]>` — calls `AnalyticsRepository.getBodyWeightRange()`, converts to `{date: Date, weight: number}`.
   - `getTrainingFrequency(dateRange: AnalyticsDateRange): Promise<TrainingFrequencyData>` — counts completed sessions within date range using `WorkoutRepository.getCompletedSessions()` filtered client-side by date, computes `totalSessions` and `avgPerWeek`. Type: `{totalSessions: number, avgPerWeek: number}`.
   - `getExercisesWithHistory(): Promise<ExerciseOption[]>` — gets all exercises, then for each queries whether any completed working sets exist (or alternatively, queries distinct exercise IDs from workout_sets in one query). Returns `{id: UUID, name: string}[]` sorted by name.
4. Export all chart point types from `dashboardData.ts` for use by chart components.
5. Run `pnpm run build` and `pnpm test` to verify zero errors and no regressions.

## Must-Haves

- [ ] `layerchart@next` installed in `apps/mobile/package.json` with pinned version
- [ ] `pnpm run build` succeeds with LayerChart — `packages/ui/chart` wrappers compile
- [ ] `dashboardData.ts` exports `getStrengthChartData`, `getVolumeChartData`, `getBodyWeightChartData`, `getTrainingFrequency`, `getExercisesWithHistory`
- [ ] Strength chart data groups by best e1RM per date (not all sets)
- [ ] All date strings converted to `Date` objects for `scaleUtc()` compatibility
- [ ] Console error logging with `[Dashboard]` prefix on query failures

## Verification

- `pnpm run build` exits 0
- `pnpm test` passes all 317 existing tests with zero failures
- `dashboardData.ts` is importable and TypeScript-clean (build proves this)

## Observability Impact

- Signals added/changed: `[Dashboard]` prefixed console.error on data loading failures in each function
- How a future agent inspects this: read `dashboardData.ts` to trace data flow from analytics services to chart-ready shapes; build output confirms compilation
- Failure state exposed: console errors with exercise ID and date range context on query failures

## Inputs

- `apps/mobile/src/lib/services/analytics/oneRepMax.ts` — `estimateOneRepMax()` for strength chart data
- `apps/mobile/src/lib/services/analytics/volumeAggregator.ts` — `getExerciseVolume()` for volume chart data
- `apps/mobile/src/lib/db/repositories/analytics.ts` — `AnalyticsRepository.getExerciseSetsHistory()`, `.getBodyWeightRange()`
- `apps/mobile/src/lib/db/repositories/workout.ts` — `WorkoutRepository.getCompletedSessions()`
- `apps/mobile/src/lib/db/repositories/exercise.ts` — `ExerciseRepository.getAll()`
- `apps/mobile/src/lib/types/analytics.ts` — `StrengthDataPoint`, `VolumeDataPoint`, `AnalyticsDateRange`
- `packages/ui/src/components/ui/chart/` — chart wrappers that must compile after LayerChart install

## Expected Output

- `apps/mobile/package.json` — updated with `layerchart@next` devDependency (pinned version)
- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — new file, 5 exported functions + chart point types
- Build and test green
