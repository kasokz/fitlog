---
id: T02
parent: S02
milestone: M002
provides:
  - StrengthChart component rendering LineChart with scaleUtc, curveNatural, tooltip, and empty state
  - VolumeChart component rendering AreaChart with gradient fill, scaleUtc, curveNatural, tooltip, and empty state
  - Analytics i18n keys in de.json (base) and en.json for chart labels, titles, descriptions, and empty states
key_files:
  - apps/mobile/src/lib/components/analytics/StrengthChart.svelte
  - apps/mobile/src/lib/components/analytics/VolumeChart.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Used de-DE locale for chart axis date formatting (toLocaleDateString) to match baseLocale convention
  - VolumeChart uses SVG linearGradient with ChartClipPath animation matching the shadcn-svelte reference pattern for area charts
  - StrengthChart accepts exerciseName as prop for the card title since it's exercise-specific; VolumeChart uses a static i18n title
patterns_established:
  - Analytics chart component pattern — Card wrapper with icon+title header, CardDescription, empty state guard (data.length === 0), Chart.Container with ChartConfig, and Chart.Tooltip snippet
  - Chart config maps data keys to --chart-N CSS variables and i18n labels via ChartConfig type
observability_surfaces:
  - Empty state UI renders when data array is empty — prevents blank/broken chart display
duration: 10min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Build StrengthChart and VolumeChart components

**Created StrengthChart (line chart for est. 1RM) and VolumeChart (area chart with gradient fill) as thin presentational components wrapping LayerChart inside shadcn-svelte Chart/Card wrappers, with empty state guards and full i18n support.**

## What Happened

Built two chart components in `apps/mobile/src/lib/components/analytics/`:

1. **StrengthChart.svelte** — Takes `data: StrengthChartPoint[]` and `exerciseName: string`. Renders a `LineChart` with `scaleUtc()` x-axis, `curveNatural` smoothing, x-axis formatted as "MMM d" (de-DE locale), highlight points on hover, and `Chart.Tooltip`. Wrapped in `Card` with TrendingUp icon, exercise name title, and "Geschätztes 1-Wiederholungsmaximum über Zeit" description.

2. **VolumeChart.svelte** — Takes `data: VolumeChartPoint[]`. Renders an `AreaChart` with SVG `linearGradient` fill (using `ChartClipPath` for animated reveal), `scaleUtc()`, `curveNatural`, and `Chart.Tooltip`. Wrapped in `Card` with BarChart3 icon and i18n-driven title/description.

Both components show a centered empty state message when data is empty.

Added 7 i18n keys to `de.json` (base locale) and `en.json` covering chart labels, titles, descriptions, and empty state messages.

## Verification

- `pnpm run build` exits 0 — both components compile successfully with all LayerChart and chart wrapper imports resolved
- `pnpm test` passes with all 317 tests green — no regressions
- Components exist at `$lib/components/analytics/StrengthChart.svelte` and `$lib/components/analytics/VolumeChart.svelte`
- Paraglide compilation succeeds with all new i18n keys

### Slice-level checks (intermediate task — partial expected):
- ✅ `pnpm run build` completes with zero errors
- ✅ `pnpm test` passes with 317 tests — no regressions
- ⬜ Dashboard route at `/history/analytics` — future task
- ⬜ All chart sections present on dashboard — components built, route pending
- ⬜ Exercise picker — future task
- ⬜ Time-range selector — future task
- ✅ Empty states render when data is empty (both components have guards)

## Diagnostics

- Read component files directly to verify data prop shapes and chart configuration
- StrengthChart: `data: StrengthChartPoint[]` (date, e1rm), `exerciseName: string`
- VolumeChart: `data: VolumeChartPoint[]` (date, totalVolume, setCount)
- Empty state guard: `{#if data.length === 0}` renders fallback text instead of chart

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — new, LineChart component for estimated 1RM strength trends
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — new, AreaChart component with gradient fill for training volume trends
- `apps/mobile/messages/de.json` — added 7 analytics chart i18n keys (base locale)
- `apps/mobile/messages/en.json` — added 7 analytics chart i18n keys (English translations)
