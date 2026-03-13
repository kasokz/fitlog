---
estimated_steps: 4
estimated_files: 2
---

# T02: Build StrengthChart and VolumeChart components

**Slice:** S02 — Progress Dashboard with Interactive Charts
**Milestone:** M002

## Description

Creates the two primary chart components — StrengthChart (estimated 1RM line chart over time) and VolumeChart (training volume area chart over time). These are the visual centerpiece of the analytics dashboard. Each wraps a LayerChart simplified component inside the shadcn-svelte chart wrappers (`Chart.Container`, `Chart.Tooltip`) following the exact patterns from the reference examples (`chart-line-interactive.svelte` and `chart-area-interactive.svelte`).

## Steps

1. Create `apps/mobile/src/lib/components/analytics/StrengthChart.svelte`:
   - Props: `data: StrengthChartPoint[]` (from dashboardData), `exerciseName: string`
   - Wrap in `Card` with header showing exercise name as title, "Est. 1RM (kg)" as description
   - Use `Chart.Container` with config mapping `e1rm` to `--chart-1` color and label "Est. 1RM"
   - Use `LineChart` with `x="date"`, `xScale={scaleUtc()}`, series `[{key: "e1rm", label: "Est. 1RM", color: "var(--chart-1)"}]`
   - Apply `curveNatural` for smooth rendering, x-axis format as `"MMM d"` via `toLocaleDateString`
   - Add tooltip snippet with `Chart.Tooltip`
   - Guard: if `data.length === 0`, render an empty state message inside the Card instead of the chart

2. Create `apps/mobile/src/lib/components/analytics/VolumeChart.svelte`:
   - Props: `data: VolumeChartPoint[]` (from dashboardData)
   - Wrap in `Card` with header title "Volume (kg)" or equivalent
   - Use `Chart.Container` with config for `totalVolume` → `--chart-2` color
   - Use `AreaChart` with gradient fill (SVG linearGradient like the reference), `scaleUtc()`, `curveNatural`
   - x-axis date format, tooltip with volume value
   - Guard: if `data.length === 0`, render empty state message

3. Import types from `dashboardData.ts` for both components (StrengthChartPoint, VolumeChartPoint).

4. Run `pnpm run build` to verify both components compile successfully.

## Must-Haves

- [ ] StrengthChart renders a LineChart with scaleUtc, curveNatural, tooltip, and chart config
- [ ] VolumeChart renders an AreaChart with gradient fill, scaleUtc, curveNatural, and tooltip
- [ ] Both components show empty state when data array is empty
- [ ] Both components are wrapped in Card with meaningful headers
- [ ] Both use `Chart.Container` and `Chart.Tooltip` from `@repo/ui` chart wrappers

## Verification

- `pnpm run build` exits 0 — both components compile
- Components are importable from `$lib/components/analytics/StrengthChart.svelte` and `$lib/components/analytics/VolumeChart.svelte`

## Observability Impact

- Signals added/changed: None — pure presentational components
- How a future agent inspects this: read component files to verify data prop shapes and chart configuration
- Failure state exposed: empty state UI renders when data is empty, preventing blank/broken chart display

## Inputs

- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — `StrengthChartPoint`, `VolumeChartPoint` types (from T01)
- `packages/ui/src/components/ui/chart/` — `Chart.Container`, `Chart.Tooltip`, `ChartConfig` type
- `packages/ui/src/components/ui/card/` — `Card` components for wrapping
- `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-line-interactive.svelte` — pattern reference for line chart
- `references/shadcn-svelte/docs/src/lib/registry/blocks/chart-area-interactive.svelte` — pattern reference for area chart

## Expected Output

- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — new, renders LineChart or empty state
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — new, renders AreaChart or empty state
