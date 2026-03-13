---
estimated_steps: 5
estimated_files: 5
---

# T03: Build PR history page and link from history

**Slice:** S03 — PR Detection, Celebration & History
**Milestone:** M002

## Description

Create a dedicated PR history page at `/history/prs` that shows all personal records grouped by exercise. Users access it from a Trophy icon button in the History page header (alongside the existing BarChart3 analytics button). The page loads exercises that have workout history, then lazily computes PRs per exercise. Each exercise shows its current best PR per category (weight, rep, e1RM) prominently, with a collapsible chronological PR timeline.

## Steps

1. Add i18n keys to `apps/mobile/messages/de.json` for the PR history page:
   - `pr_history_title` — "Persönliche Rekorde"
   - `pr_history_loading` — "Rekorde werden geladen..."
   - `pr_history_empty_title` — "Noch keine Rekorde"
   - `pr_history_empty_description` — "Schliesse Trainingseinheiten ab, um deine Rekorde zu sehen."
   - `pr_history_weight_pr` — "Gewicht"
   - `pr_history_rep_pr` — "Wiederholungen"
   - `pr_history_e1rm_pr` — "Gesch. 1RM"
   - `pr_history_kg_value` — "{value} kg"
   - `pr_history_reps_value` — "{value} Wdh."
   - `pr_history_e1rm_value` — "~{value} kg"
   - `pr_history_date_label` — "am {date}"
   - `pr_history_show_all` — "Alle anzeigen"
   - `pr_history_current_best` — "Aktueller Bestwert"

2. Create `apps/mobile/src/lib/components/history/PRHistoryCard.svelte`:
   - Props: `exerciseName: string`, `prs: PR[]` (all PRs for one exercise, chronological).
   - Compute current best per category: find the last (most recent) PR of each type.
   - Display: Card with exercise name as header, then a row of up to 3 Badge-value pairs for current bests (weight, rep, e1RM). Only show categories that have at least one PR.
   - Below the current bests, show a collapsible section (use Collapsible from shadcn-svelte or a simple `{#if expanded}` toggle) with the full chronological list of all PRs for this exercise, showing date + type + value per entry.
   - Format dates using `Intl.DateTimeFormat` (existing pattern in codebase).

3. Create `apps/mobile/src/routes/history/prs/+page.svelte`:
   - Load exercises with history via `getExercisesWithHistory()` from `dashboardData.ts`.
   - For each exercise, call `getPRHistory(exerciseId)` to get its PR timeline.
   - Use `Promise.all()` to load all PR histories in parallel. Handle loading/error/empty states following the existing page patterns (`$effect`, `loading`/`error` state variables, `Loader2` spinner, `Empty` component).
   - Filter out exercises with no PRs (it's possible to have workout history but zero PRs if all sessions used the same weight).
   - Render a `PRHistoryCard` per exercise.
   - Add back navigation button in header (ArrowLeft → `history.back()`).

4. Modify `apps/mobile/src/routes/history/+page.svelte`:
   - Add a Trophy icon button next to the existing BarChart3 analytics button in the header.
   - Import `Trophy` from `@lucide/svelte`.
   - Button navigates to `/history/prs` via `goto()`.

5. Run `pnpm run build` to verify compilation.

## Must-Haves

- [ ] `/history/prs` route exists and renders PR history grouped by exercise
- [ ] `PRHistoryCard` shows current best per category + collapsible full timeline
- [ ] History page header has Trophy button linking to `/history/prs`
- [ ] Loading, empty, and error states handled following existing patterns
- [ ] Exercises with no PRs are filtered out of the view
- [ ] All PR history i18n keys added to `de.json`

## Verification

- `pnpm run build` succeeds without errors
- File exists: `apps/mobile/src/routes/history/prs/+page.svelte`
- `de.json` contains keys matching `pr_history_*` pattern (≥10 keys)
- History page source contains `Trophy` import and `/history/prs` navigation

## Observability Impact

- Signals added/changed: `[PRHistory] Load failed` console.error on data load failure with error details.
- How a future agent inspects this: Navigate to `/history/prs` to see if PR data loads and renders.
- Failure state exposed: Error state rendered in page UI with error message.

## Inputs

- `apps/mobile/src/lib/services/analytics/prDetector.ts` — `getPRHistory()` (S01)
- `apps/mobile/src/lib/services/analytics/dashboardData.ts` — `getExercisesWithHistory()` (S02)
- `apps/mobile/src/lib/types/analytics.ts` — `PR` type
- `apps/mobile/src/routes/history/+page.svelte` — existing history page to add link

## Expected Output

- `apps/mobile/src/routes/history/prs/+page.svelte` — PR history page
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — per-exercise PR card component
- `apps/mobile/src/routes/history/+page.svelte` — modified with Trophy button
- `apps/mobile/messages/de.json` — updated with `pr_history_*` keys
