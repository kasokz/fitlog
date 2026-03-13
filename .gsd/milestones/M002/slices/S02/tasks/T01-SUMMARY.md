---
id: T01
parent: S02
milestone: M002
provides:
  - LayerChart v2 installed and compiling with existing chart wrappers
  - Dashboard data service with 5 exported functions transforming analytics into chart-ready shapes
key_files:
  - apps/mobile/package.json
  - apps/mobile/src/lib/services/analytics/dashboardData.ts
key_decisions:
  - Used direct dbQuery for training frequency count instead of paginated WorkoutRepository.getCompletedSessions — avoids looping through all pages to count sessions in a date range
  - getExercisesWithHistory uses single SQL JOIN query (exercises + workout_sets + workout_sessions) instead of per-exercise existence checks — O(1) queries vs O(n)
patterns_established:
  - Dashboard data service as single bridge between analytics engine and chart components — all date strings converted to Date objects via parseDate(YYYY-MM-DD) → Date.UTC for scaleUtc() compatibility
  - Error handling pattern: try/catch with console.error using [Dashboard] prefix, returns empty data on failure
observability_surfaces:
  - console.error with [Dashboard] prefix on query failures in each function, includes exerciseId and dateRange context
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Install LayerChart and build dashboard data service

**Installed layerchart@2.0.0-next.46 and created dashboardData.ts with 5 exported chart-data functions plus chart point types.**

## What Happened

1. Installed `layerchart@2.0.0-next.46` as devDependency in `apps/mobile`. Version pinned in package.json. d3-scale and d3-shape are available transitively — no explicit install needed.

2. Ran `pnpm run build` — confirmed `packages/ui/chart` wrappers (ChartContainer, ChartTooltip, ChartStyle, chart-utils) resolve their `layerchart` imports and compile without errors.

3. Created `apps/mobile/src/lib/services/analytics/dashboardData.ts` with:
   - `getStrengthChartData(exerciseId, dateRange?)` — fetches exercise sets history, groups by date, computes best e1RM per date via `estimateOneRepMax`, returns `{date: Date, e1rm: number}[]` sorted ascending
   - `getVolumeChartData(exerciseId, dateRange?)` — delegates to `getExerciseVolume()`, converts date strings to Date objects, returns `{date: Date, totalVolume: number, setCount: number}[]`
   - `getBodyWeightChartData(dateRange)` — fetches body weight range, converts to `{date: Date, weight: number}[]`
   - `getTrainingFrequency(dateRange)` — direct SQL COUNT query for completed sessions in range, computes avgPerWeek, returns `{totalSessions: number, avgPerWeek: number}`
   - `getExercisesWithHistory()` — single JOIN query for distinct exercises with completed working sets, returns `{id: UUID, name: string}[]` sorted by name

4. All 5 chart point types exported: `StrengthChartPoint`, `VolumeChartPoint`, `BodyWeightChartPoint`, `TrainingFrequencyData`, `ExerciseOption`.

## Verification

- `pnpm run build`: exits 0, both mobile and web apps build successfully. LayerChart wrappers compile.
- `pnpm test`: all 317 tests pass with zero failures across 13 test files.
- `dashboardData.ts` is TypeScript-clean — confirmed by successful build compilation.

### Slice-level checks (intermediate — T01 of 4):
- ✅ `pnpm run build` completes with zero errors
- ✅ `pnpm test` passes with all 317 tests green
- ⬜ Dashboard route exists at `/history/analytics` (T04)
- ⬜ Strength/volume/body weight/frequency sections present (T02-T04)
- ⬜ Exercise picker shows only exercises with history (T03-T04)
- ⬜ Time-range selector filters chart data (T04)
- ⬜ Empty states render when no data (T02-T04)

## Diagnostics

- Read `dashboardData.ts` to trace data flow from analytics services to chart-ready shapes
- Each function logs `[Dashboard]` prefixed errors with exercise ID and date range context on failure
- Build output confirms compilation of all chart wrapper imports

## Deviations

- Used direct `dbQuery` for `getTrainingFrequency` instead of `WorkoutRepository.getCompletedSessions()` — the repository method is paginated (limit/offset) making it impractical for counting sessions in a date range. Direct SQL COUNT is the correct approach, matching the pattern used by `getSessionTonnage` in `volumeAggregator.ts`.
- Used single JOIN query for `getExercisesWithHistory` instead of per-exercise existence checks — far more efficient (1 query vs N queries).

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json` — added `layerchart@2.0.0-next.46` as devDependency
- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — new file: 5 exported functions + 5 chart point types for dashboard data transformation
- `pnpm-lock.yaml` — updated with layerchart and its transitive dependencies
