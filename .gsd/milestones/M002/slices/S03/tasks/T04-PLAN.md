---
estimated_steps: 4
estimated_files: 4
---

# T04: Add PR section to exercise detail drawer

**Slice:** S03 — PR Detection, Celebration & History
**Milestone:** M002

## Description

Extend the exercise detail drawer (`ExerciseDetail.svelte`) with a "Personal Records" section that shows the exercise's current best PR per category (weight, rep, e1RM). This is a natural discovery point for PR data — when a user taps on an exercise to see its details, they also see their personal bests. The section loads PRs asynchronously on drawer open and handles loading/empty states gracefully.

## Steps

1. Add i18n keys to `apps/mobile/messages/de.json` for the exercise detail PR section:
   - `pr_detail_title` — "Persönliche Rekorde"
   - `pr_detail_no_records` — "Noch keine Rekorde"
   - `pr_detail_weight_pr` — "Bestes Gewicht"
   - `pr_detail_rep_pr` — "Beste Wiederholungen"
   - `pr_detail_e1rm_pr` — "Bester gesch. 1RM"
   - `pr_detail_kg_value` — "{value} kg"
   - `pr_detail_reps_value` — "{value} Wdh."
   - `pr_detail_e1rm_value` — "~{value} kg"
   - `pr_detail_at_weight` — "bei {weight} kg"
   - `pr_detail_loading` — "Rekorde laden..."

2. Create `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte`:
   - Props: `exerciseId: string`.
   - On mount (`$effect`), call `getPRHistory(exerciseId)` and compute the latest PR per category (the last occurrence of each type in the chronological list, which represents the current record).
   - Display a compact section with the title "Persönliche Rekorde", then up to 3 rows — one per PR category that exists. Each row shows: PR type label (Badge), value, and contextual info (e.g., weight PR shows "100 kg", rep PR shows "12 Wdh. bei 80 kg", e1RM PR shows "~120 kg").
   - Loading state: small inline spinner (Loader2 at size-4).
   - Empty state: muted text "Noch keine Rekorde".
   - Error state: silently show empty state (PRs are supplementary info, not critical).

3. Modify `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte`:
   - Import `ExercisePRSection`.
   - Add the PR section between the existing exercise metadata (type section) and the footer.
   - Pass `exerciseId={exercise.id}` to the component.
   - Add a visual separator (e.g., `Separator` from shadcn-svelte or a simple border-top div) above the PR section.

4. Run `pnpm run build` to verify compilation.

## Must-Haves

- [ ] `ExercisePRSection.svelte` loads and displays current best PR per category for an exercise
- [ ] Section is integrated into `ExerciseDetail.svelte` between metadata and footer
- [ ] Loading and empty states are handled (spinner, "no records" text)
- [ ] PR load errors are caught silently (PRs are supplementary, not critical)
- [ ] All PR detail i18n keys added to `de.json`

## Verification

- `pnpm run build` succeeds without errors
- `de.json` contains keys matching `pr_detail_*` pattern (≥8 keys)
- `ExerciseDetail.svelte` source contains `ExercisePRSection` import and usage

## Observability Impact

- Signals added/changed: None (PR section load failures are silently handled — supplementary UI).
- How a future agent inspects this: Open any exercise detail drawer to see if the PR section renders.
- Failure state exposed: None visible to user. Console.error logged on PR load failure for debugging.

## Inputs

- `apps/mobile/src/lib/services/analytics/prDetector.ts` — `getPRHistory()` (S01)
- `apps/mobile/src/lib/types/analytics.ts` — `PR` type
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — existing drawer to extend

## Expected Output

- `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte` — exercise PR section component
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — modified with PR section
- `apps/mobile/messages/de.json` — updated with `pr_detail_*` keys
