---
id: T03
parent: S02
milestone: M002
provides:
  - BodyWeightChart component rendering LineChart with curveNatural, scaleUtc, and empty state
  - FrequencySummary component rendering 2 stat cards or empty state
  - ExercisePickerSelect component with bindable value using shadcn-svelte Select
key_files:
  - apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte
  - apps/mobile/src/lib/components/analytics/FrequencySummary.svelte
  - apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte
key_decisions:
  - BodyWeightChart uses same LineChart pattern as StrengthChart (curveNatural, scaleUtc, --chart-3 color) for visual consistency across the dashboard
  - ExercisePickerSelect uses onValueChange callback plus $bindable for flexibility — parent can either bind or use callback
patterns_established:
  - Stat card pattern for FrequencySummary — 2-column grid of Card with small header title and large bold number, with single empty state card fallback at totalSessions===0
observability_surfaces:
  - none — pure presentational components; empty states prevent broken displays when no data exists
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Build BodyWeightChart, FrequencySummary, and ExercisePickerSelect components

**Created BodyWeightChart (line chart for weight trends), FrequencySummary (stat cards for session count/avg-per-week), and ExercisePickerSelect (exercise dropdown) as thin presentational components with full i18n support.**

## What Happened

Built three remaining dashboard sub-components following the exact patterns from T02's StrengthChart and VolumeChart:

1. **BodyWeightChart** — LineChart with curveNatural for smooth interpolation of sparse body weight data points. Uses `--chart-3` color, scaleUtc x-axis, de-DE date formatting. Empty state message directs users to log weight via the Body Weight tab.

2. **FrequencySummary** — 2-column grid of stat Cards showing total sessions (bold number) and average sessions per week (1 decimal). When totalSessions is 0, renders a single empty state card instead of the grid.

3. **ExercisePickerSelect** — Wraps shadcn-svelte Select.Root in single-select mode. Accepts exercises array and bindable value. Shows placeholder when no selection. Renders exercise names as Select.Item options.

Added 9 i18n keys to both de.json and en.json covering all three components.

## Verification

- `pnpm run build` exits 0 — all three components compile successfully alongside existing StrengthChart and VolumeChart
- Paraglide compilation succeeds with all new i18n keys
- Components are importable from `$lib/components/analytics/`

### Slice-level checks (intermediate — T03 is not final task):
- [x] `pnpm run build` completes with zero errors
- [ ] `pnpm test` — not run (no new testable logic; will verify at T04)
- [ ] Dashboard route at `/history/analytics` — not yet created (T04)
- [ ] All chart sections present — not yet assembled (T04)
- [ ] Exercise picker shows only exercises with history — not yet wired (T04)
- [ ] Time-range selector — not yet created (T04)
- [ ] Empty states render — components support it; not yet verifiable in-page (T04)

## Diagnostics

- Read component files directly to verify data prop shapes and configuration
- BodyWeightChart: `data: BodyWeightChartPoint[]` (date, weight)
- FrequencySummary: `totalSessions: number`, `avgPerWeek: number`
- ExercisePickerSelect: `exercises: {id, name}[]`, `value: string` (bindable)
- Empty state guards: BodyWeightChart at `data.length === 0`, FrequencySummary at `totalSessions === 0`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — new, LineChart with curveNatural for body weight trends
- `apps/mobile/src/lib/components/analytics/FrequencySummary.svelte` — new, 2-column stat cards for training frequency
- `apps/mobile/src/lib/components/analytics/ExercisePickerSelect.svelte` — new, exercise selector using Select component
- `apps/mobile/messages/de.json` — added 9 analytics i18n keys (bodyweight, frequency, exercise picker)
- `apps/mobile/messages/en.json` — added 9 matching English translations
