---
estimated_steps: 4
estimated_files: 3
---

# T03: Build BodyWeightChart, FrequencySummary, and ExercisePickerSelect components

**Slice:** S02 — Progress Dashboard with Interactive Charts
**Milestone:** M002

## Description

Completes the remaining dashboard sub-components before final page assembly. BodyWeightChart visualizes weight trends (sparse data handled via curveNatural). FrequencySummary shows session count stats as simple cards. ExercisePickerSelect provides the exercise selection control using the existing Select component, filtered to exercises with actual workout history.

## Steps

1. Create `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte`:
   - Props: `data: BodyWeightChartPoint[]` (from dashboardData)
   - Wrap in Card with "Body Weight (kg)" title
   - Use `Chart.Container` + `LineChart` with `scaleUtc()`, `curveNatural` for smooth interpolation of sparse data points
   - Series config: `weight` key → `--chart-3` color
   - x-axis date format, tooltip showing weight in kg
   - Empty state: if data is empty, show message suggesting user log body weight entries via the Body Weight tab

2. Create `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte`:
   - Props: `totalSessions: number`, `avgPerWeek: number`
   - Render a 2-column grid of stat cards using Card components
   - First card: total sessions count with label
   - Second card: average sessions per week (rounded to 1 decimal) with label
   - If totalSessions is 0, show a single empty state message instead

3. Create `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte`:
   - Props: `exercises: {id: string, name: string}[]`, bindable `value: string` (selected exercise ID)
   - Uses `Select` from `@repo/ui/components/ui/select` (single-select)
   - Renders each exercise as a `Select.Item` with the exercise name as label and ID as value
   - Shows placeholder text "Select exercise" when no exercise is selected
   - Triggers `onchange` or reactive binding so parent can react to selection

4. Run `pnpm run build` to verify all three components compile.

## Must-Haves

- [ ] BodyWeightChart renders LineChart with curveNatural and scaleUtc
- [ ] BodyWeightChart shows empty state pointing to Body Weight tab when no data
- [ ] FrequencySummary renders 2 stat cards or empty state
- [ ] ExercisePickerSelect uses Select component with bindable value
- [ ] All three components compile successfully

## Verification

- `pnpm run build` exits 0 — all three components compile
- Components are importable from their respective paths under `$lib/components/analytics/`

## Observability Impact

- Signals added/changed: None — pure presentational components
- How a future agent inspects this: read component files; props interfaces define data contracts
- Failure state exposed: empty states in BodyWeightChart and FrequencySummary prevent broken displays

## Inputs

- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — `BodyWeightChartPoint` type (from T01)
- `packages/ui/src/components/ui/select/` — Select component
- `packages/ui/src/components/ui/card/` — Card components
- `packages/ui/src/components/ui/chart/` — Chart.Container, Chart.Tooltip

## Expected Output

- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — new, renders LineChart or empty state
- `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte` — new, renders stat cards or empty state
- `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte` — new, exercise selector control
