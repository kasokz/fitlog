---
estimated_steps: 5
estimated_files: 4
---

# T04: Assemble dashboard page, wire navigation, and verify full integration

**Slice:** S02 — Progress Dashboard with Interactive Charts
**Milestone:** M002

## Description

The final assembly task — connects all chart components into the real dashboard page at `/history/analytics`, wires the data loading with reactive `$effect` blocks, adds the navigation link from the History page, and proves the full integration compiles and routes correctly. This is the task that makes the slice demo actually true.

## Steps

1. Create `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte`:
   - Props: bindable `value: string` (default "90d")
   - Uses `Select` from `@repo/ui/components/ui/select` with three options: "7d" (Last 7 days), "30d" (Last 30 days), "90d" (Last 3 months)
   - Compact width, matching the pattern from `chart-area-interactive.svelte` reference

2. Create `apps/mobile/src/routes/history/analytics/+page.svelte`:
   - On mount (`$effect`): call `getExercisesWithHistory()` to populate exercise picker. Auto-select first exercise if available.
   - Reactive state: `selectedExerciseId`, `timeRange` (default "90d"). Derive `AnalyticsDateRange` from `timeRange` (compute `start` as today minus N days in local timezone, `end` as today).
   - `$effect` watching `selectedExerciseId` + `timeRange`: load all chart data in parallel using `Promise.all([getStrengthChartData(...), getVolumeChartData(...), getBodyWeightChartData(...), getTrainingFrequency(...)])`. Set loading state during fetch.
   - Layout: header with page title, ExercisePickerSelect + TimeRangeSelect controls. Below controls, use Tabs component with 4 tabs: Strength, Volume, Body Weight, Frequency.
   - Each tab content renders the corresponding chart component with loaded data.
   - Loading state: show spinner while data is loading.
   - Error state: show error message with `[Dashboard]` console.error on failures.
   - Empty state: if no exercises with history exist, show global empty state (no workout data yet).

3. Modify `apps/mobile/src/routes/history/+page.svelte`:
   - Import `TrendingUp` or `BarChart3` icon from `@lucide/svelte`
   - Add an icon button to the header (right side of the `<h1>` row) that uses `goto('/history/analytics')` on click
   - Keep existing page layout unchanged

4. Verify the full integration:
   - Run `pnpm run build` and confirm zero errors
   - Run `pnpm test` and confirm all 317 tests pass
   - Confirm `/history/analytics` route exists in the build output (check `.svelte-kit/output/` or SvelteKit manifest)

5. Review all new files for consistency:
   - All imports use the correct paths (`$lib/...`, `@repo/ui/...`)
   - Chart configs use `--chart-N` color tokens from the design system
   - Date handling uses local timezone (not UTC) for range calculations
   - No hardcoded text strings (placeholder text is fine for now — S07 adds i18n)

## Must-Haves

- [ ] Dashboard page at `/history/analytics/+page.svelte` renders all 4 chart sections
- [ ] ExercisePickerSelect and TimeRangeSelect control which data is displayed
- [ ] Data loads in parallel via `Promise.all` in `$effect`
- [ ] Loading spinner shown during data fetch
- [ ] Empty state shown when no exercises have workout history
- [ ] History page has chart icon button navigating to `/history/analytics`
- [ ] `pnpm run build` exits 0
- [ ] `pnpm test` passes all existing tests

## Verification

- `pnpm run build` exits 0 — full integration compiles
- `pnpm test` passes all 317 tests — no regressions
- The route `/history/analytics` exists (verified by build output or SvelteKit routing)
- History page (`/history`) contains a navigation element linking to `/history/analytics`

## Observability Impact

- Signals added/changed: `[Dashboard]` console.error in the page's data loading `$effect` on failures; loading/error/empty UI states
- How a future agent inspects this: read `+page.svelte` to see the data flow (`$effect` → dashboardData functions → chart components); check console for `[Dashboard]` errors; observe loading/error states visually
- Failure state exposed: error state UI with message; console.error with context; loading state prevents stale data display

## Inputs

- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — all 5 data functions (from T01)
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — (from T02)
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — (from T02)
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — (from T03)
- `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte` — (from T03)
- `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte` — (from T03)
- `packages/ui/src/components/ui/tabs/` — Tabs component for dashboard sections
- `packages/ui/src/components/ui/select/` — Select (used by TimeRangeSelect)
- `apps/mobile/src/routes/history/+page.svelte` — modified to add nav link

## Expected Output

- `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte` — new, time range selector
- `apps/mobile/src/routes/history/analytics/+page.svelte` — new, fully assembled dashboard page
- `apps/mobile/src/routes/history/+page.svelte` — modified, chart icon link in header
- Build green, tests green, route exists
