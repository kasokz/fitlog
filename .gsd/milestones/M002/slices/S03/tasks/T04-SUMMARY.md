---
id: T04
parent: S03
milestone: M002
provides:
  - ExercisePRSection.svelte component showing current best PRs per category in the exercise detail drawer
key_files:
  - apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte
  - apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - "Used getPRHistory() and computed current bests client-side (last PR per type in chronological list) rather than adding a separate getCurrentBests() query — consistent with PRHistoryCard pattern"
  - "Errors silently fall through to empty state — PRs in the detail drawer are supplementary info, not critical path"
patterns_established:
  - "ExercisePRSection pattern: async $effect load on mount with exerciseId dependency, loading/empty/error states, category-ordered display with icon + badge + value + context"
observability_surfaces:
  - "console.error '[PRDetail] Failed to load PRs for exercise' with exerciseId and error on load failure"
duration: ~8min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Add PR section to exercise detail drawer

**Created ExercisePRSection.svelte with per-category current best display and integrated it into ExerciseDetail.svelte with a Separator divider.**

## What Happened

Added 10 `pr_detail_*` i18n keys to `de.json` for the exercise detail PR section (title, loading, empty state, category labels, value formats, contextual info).

Created `ExercisePRSection.svelte` that:
- Takes `exerciseId` prop and loads PR history via `getPRHistory()` in a reactive `$effect`
- Computes current best per category (weight_pr, rep_pr, e1rm_pr) by iterating chronological PR list (last wins)
- Displays up to 3 rows in category order, each with: icon (Weight/Repeat/TrendingUp), type badge, formatted value, and contextual info (rep PR shows "bei X kg", weight PR shows "X Wdh.")
- Loading state: Loader2 spinner with "Rekorde laden..." text
- Empty state: muted italic "Noch keine Rekorde"
- Error state: silently shows empty state (console.error logged for debugging)

Integrated into `ExerciseDetail.svelte` between the type metadata section and the footer, separated by a shadcn Separator component.

## Verification

- `pnpm run build` — succeeds without errors
- `de.json` contains 10 `pr_detail_*` keys (verified via jq)
- `ExerciseDetail.svelte` contains `ExercisePRSection` import (line 12) and usage (line 80)
- Slice-level: `pnpm test -- --grep "sessionPRDetector"` — 325 tests pass across 14 files
- Slice-level: PR key count in de.json is 32 (≥12 required)

## Diagnostics

- Open any exercise detail drawer to see if the PR section renders below the type badge
- Check browser console for `[PRDetail] Failed to load PRs for exercise` errors on load failure
- PR section will show "Noch keine Rekorde" for exercises without any workout history

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte` — new component: async PR loading with loading/empty/error states and per-category current best display
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — added Separator + ExercisePRSection between metadata and footer
- `apps/mobile/messages/de.json` — added 10 `pr_detail_*` i18n keys
