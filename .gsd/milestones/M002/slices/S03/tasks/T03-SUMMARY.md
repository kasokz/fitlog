---
id: T03
parent: S03
milestone: M002
provides:
  - "/history/prs" route page displaying all PRs grouped by exercise
  - PRHistoryCard.svelte component for per-exercise PR display with collapsible timeline
  - Trophy icon button in History page header linking to PR history
key_files:
  - apps/mobile/src/routes/history/prs/+page.svelte
  - apps/mobile/src/lib/components/history/PRHistoryCard.svelte
  - apps/mobile/src/routes/history/+page.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Used bits-ui v2 Collapsible primitives directly (no asChild/builders pattern from v1) for the expandable PR timeline in PRHistoryCard
  - Per-exercise PR loading errors are caught individually with console.warn — a single exercise failure doesn't block the rest of the page
  - Timeline shown in reverse chronological order (newest first) for quick scanning
patterns_established:
  - Sub-page linked from header icon buttons pattern (Trophy for PRs alongside BarChart3 for analytics)
  - PRHistoryCard pattern: current bests as badges + collapsible chronological timeline
observability_surfaces:
  - "[PRHistory] Load failed" console.error on data load failure with error details
  - "[PRHistory] Failed to load PRs for exercise {name}" console.warn for individual exercise failures
  - Error state rendered in page UI with error message
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Build PR history page and link from history

**Created `/history/prs` route with exercise-grouped PR history, PRHistoryCard component with current-best badges and collapsible timeline, and Trophy icon button in History page header.**

## What Happened

1. Added 13 `pr_history_*` i18n keys to `de.json` covering page title, loading, empty states, PR category labels, value formatting, and date labels.

2. Created `PRHistoryCard.svelte` component that:
   - Takes `exerciseName` and chronological `prs` array as props
   - Computes current best PR per category (weight, rep, e1RM) by iterating chronologically (last wins)
   - Displays current bests as Badge components with category icons (Weight, Repeat, TrendingUp)
   - Provides a collapsible section (via shadcn-svelte Collapsible) showing the full PR timeline in reverse chronological order with type labels, values, and dates

3. Created `/history/prs/+page.svelte` route that:
   - Loads exercises with workout history via `getExercisesWithHistory()`
   - Loads PR history per exercise in parallel via `Promise.all()` with individual error handling
   - Filters out exercises with no PRs
   - Renders `PRHistoryCard` per exercise with loading/error/empty states following existing page patterns
   - Has back navigation via `history.back()`

4. Modified History page header to include Trophy icon button (alongside existing BarChart3 analytics button) navigating to `/history/prs`.

## Verification

- `pnpm run build` — passes (all components compile)
- File exists: `apps/mobile/src/routes/history/prs/+page.svelte` — confirmed
- `de.json` contains 13 `pr_history_*` keys (≥10 required) — confirmed
- `de.json` contains 22 total `pr_*` keys (≥12 required for slice check) — confirmed
- History page source contains `Trophy` import and `/history/prs` navigation — confirmed
- All 325 existing tests pass — confirmed

### Slice-level verification status

- `pnpm test` (sessionPRDetector tests) — PASS (all 325 tests pass)
- `pnpm run build` — PASS
- i18n key count `pr_*` ≥ 12 — PASS (22 keys)

## Diagnostics

- Navigate to `/history/prs` to inspect PR data loading and rendering
- Check browser console for `[PRHistory] Load failed` on data load errors
- Check browser console for `[PRHistory] Failed to load PRs for exercise` warnings on per-exercise failures
- Error state is rendered in the page UI when the top-level load fails

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/history/prs/+page.svelte` — new PR history page route
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — new per-exercise PR card with collapsible timeline
- `apps/mobile/src/routes/history/+page.svelte` — added Trophy button linking to `/history/prs`
- `apps/mobile/messages/de.json` — added 13 `pr_history_*` i18n keys
