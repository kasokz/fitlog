# S05: Deload Auto-Adjustment — Research

**Date:** 2026-03-12

## Summary

S05 integrates the S01-built deload calculator into the live workout flow. The computation engine (`isDeloadWeek`, `calculateDeloadSets`) is complete and tested (17 tests). The work is **purely integration and UI** — hooking into the session-creation pre-fill path in the program detail page, adding a deload indicator banner on the workout screen, and wiring up the mesocycle lookup.

The integration point is well-defined: `handleStartWorkout()` in `programs/[id]/+page.svelte` already has access to the `mesocycle` state and calls `WorkoutRepository.getLastSessionForDay()` for pre-fill. The deload logic intercepts after pre-fill: if `isDeloadWeek(mesocycle)` returns true, the pre-filled sets are transformed via `calculateDeloadSets()` before being written to the DB. The workout page needs a deload indicator banner (similar to `ProgressionBanner.svelte`) that shows when the session was created during a deload week. The session already stores `mesocycle_week` — this can be compared against the mesocycle's `deload_week_number` to detect deload sessions.

This is low risk. All computation is tested, the pre-fill hook exists, and the banner pattern is established from S04. The main design decisions are: (1) where to detect deload state for the banner (session vs. live mesocycle lookup), and (2) whether to show original weights in the deload banner for user context.

## Recommendation

**Two tasks:**

1. **Pre-fill integration** — Modify `handleStartWorkout()` in `programs/[id]/+page.svelte` to detect deload week and apply `calculateDeloadSets()` to the pre-filled sets. This is a ~20-line change in the existing pre-fill branch.

2. **Deload banner UI** — Create `DeloadBanner.svelte` (following `ProgressionBanner.svelte` pattern) and show it on the workout page when the session is in a deload week. Add a `isDeload` prop to `ExerciseCard` or show a page-level banner above all exercise cards.

**Key design choice:** Show the deload banner at page level (once, above all exercises) rather than per-exercise. Unlike progression suggestions which vary per exercise, deload affects the entire session uniformly. A single page-level banner with "Deload Week — weights reduced to ~60%" is cleaner than per-exercise banners.

**Deload detection for banner:** Use the session's stored `mesocycle_week` compared to the mesocycle's `deload_week_number`. The session already stores both `mesocycle_id` and `mesocycle_week` at creation time (set in `handleStartWorkout`). The workout page can query the mesocycle to get `deload_week_number` and compare. This avoids coupling to live mesocycle state changes that could happen after session creation.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Deload weight/volume calculation | `calculateDeloadSets()` from S01 | Already tested (17 tests), handles plate rounding, volume capping, null weights, set type filtering. |
| Deload week detection | `isDeloadWeek()` from S01 | Handles disabled deload (`deload_week_number === 0`) edge case. |
| Mesocycle lookup | `ProgramRepository.getMesocycleByProgramId()` | Already loaded in program detail page state. |
| Banner component pattern | `ProgressionBanner.svelte` from S04 | Same Alert component + icon + dismiss pattern. Copy and adapt. |
| Pre-fill flow | `getLastSessionForDay()` + `addSet()` loop in `handleStartWorkout()` | Existing hook point — interpose deload transform between fetch and write. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — **The engine.** `isDeloadWeek(mesocycle)` returns boolean, `calculateDeloadSets(previousSets, factor=0.6)` returns `DeloadSet[]` with reduced weight (2.5kg rounding), capped volume (max 3 sets), re-numbered sets. Filters non-working sets as defense-in-depth.
- `apps/mobile/src/lib/types/analytics.ts` — `DeloadSet` type: `{ exercise_id, set_number, set_type, weight, reps, original_weight }`. Note `original_weight` — useful for the banner to show "100kg → 60kg".
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — **Primary integration point.** `handleStartWorkout(trainingDayId)` at ~line 197: creates session with `mesocycle_id` and `mesocycle_week`, fetches `lastSession` via `getLastSessionForDay()`, loops through `lastSession.sets` calling `addSet()` to pre-populate. Deload transform hooks between the fetch and the addSet loop.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — **Banner integration point.** Workout page loads session (which has `mesocycle_id` and `mesocycle_week`), builds `exerciseGroups`, renders `ExerciseCard` components. Deload banner goes in the content section before the `{#each exerciseGroups}` block.
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — **Pattern to follow.** Uses `Alert`, `AlertTitle`, `AlertDescription` from shadcn-svelte, with icon and dismiss button. Deload banner should use same structure with different color theme (blue/amber for deload vs green for progression).
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — Already accepts optional `suggestion` prop. Could accept `isDeload` but **page-level banner is recommended** since deload is session-wide, not per-exercise.
- `apps/mobile/src/lib/db/repositories/program.ts` — `getMesocycleByProgramId(programId)` returns the active mesocycle. Already called in the program detail page on load.
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSession` has `mesocycle_id: UUID | null` and `mesocycle_week: number | null`. These are populated at session creation and available on the workout page.

## Constraints

- **Session stores `mesocycle_week` at creation time.** The deload detection for the banner should use this stored value, not re-query the mesocycle (which could change between creation and viewing). However, for the pre-fill integration, we read the live mesocycle since we're at creation time.
- **`calculateDeloadSets` expects `WorkoutSet[]` input but returns `DeloadSet[]`.** The `DeloadSet` type has `original_weight` but lacks `id`, `session_id`, `completed`, `rir`, `rest_seconds`, `deleted_at`. When writing deload sets to DB via `addSet()`, map from `DeloadSet` fields, using defaults for missing fields (rir: null, completed: false, etc.).
- **Pre-fill path has two branches: last session exists vs first time.** Deload must handle both: if last session exists, transform its sets; if first time (template defaults), transform the template-generated default sets. The template branch creates sets with `weight: 0` — deload of 0 is still 0, which is fine (user will adjust).
- **`calculateDeloadSets` groups by exercise internally** — it takes a flat array and filters to working sets only. When called per-exercise in the pre-fill loop (which already iterates by exercise group), pass only that exercise's sets.
- **Volume reduction caps at 3 sets.** If the last session had 5 working sets for an exercise, deload returns only 3. This means fewer `addSet` calls — the pre-fill loop must iterate over deload output, not the original sets.
- **No auto-advancement of `current_week`.** The mesocycle's `current_week` is manually updated by the user via the MesocycleForm. S05 should not auto-advance it. Deload triggers only when the user has set `current_week` to the `deload_week_number`.
- **i18n keys are S07's scope.** S05 should add temporary English-only keys or placeholder i18n calls that S07 will formalize. However, per AGENTS.md rules, base locale keys (de.json) must be maintained when new UI is added. Add de.json keys for deload banner text.

## Common Pitfalls

- **Applying deload transform to template defaults (weight: 0).** When there's no last session and sets are created from template with `weight: 0`, `calculateDeloadSets` will produce `0 * 0.6 = 0` → still 0. This is correct — the user hasn't logged weights yet, so no reduction is possible. No special handling needed.
- **Forgetting to pass `set_type` from DeloadSet to addSet.** `calculateDeloadSets` always returns `set_type: SetType.WORKING` but the `addSet` schema defaults to `'working'` if omitted, so this is safe but should be explicit.
- **Banner showing on resumed sessions.** If a user starts a deload workout, closes the app, and resumes, the banner should still show. Using the session's `mesocycle_week` + mesocycle's `deload_week_number` comparison is stable across resumes.
- **Mesocycle not found for banner display.** The workout page loads the session but needs the mesocycle to know `deload_week_number`. If `mesocycle_id` is null (program without mesocycle), skip deload banner entirely. If mesocycle was deleted after session creation, also skip gracefully.
- **Per-exercise deload vs session-wide deload.** `calculateDeloadSets` is called per-exercise in the pre-fill loop (since `lastSession.sets` is per-session but the addSet loop processes per-exercise). The function's defense-in-depth filtering will handle mixed set types.

## Open Risks

- **User confusion about deload weights.** Showing "60kg" without context that it was "100kg" may confuse users. The `DeloadSet.original_weight` field enables showing "100kg → 60kg" in the banner or per-set, but adding this to the UI adds scope. **Recommendation:** Show original weight in the deload banner description for clarity, but don't modify SetRow to show dual weights (that's polish).
- **Mesocycle `current_week` drift.** If the user forgets to update `current_week`, deload won't trigger even in the right week. This is a known UX gap — auto-advancement was explicitly not built. S05 should document this limitation but not solve it (scope boundary).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| shadcn-svelte | (already in references) | installed |
| Svelte 5 | (already in references) | installed |
| runed | (already in references) | installed |

No external skills needed — this slice uses only established codebase patterns.

## Sources

- S01 T05 summary: deloadCalculator implementation details and test coverage (17 tests)
- S04 T02 summary: ProgressionBanner integration pattern (non-blocking async, fire-and-forget, dismiss state)
- D046: Deload auto-adjustment hooks into pre-fill at session creation time
- D053: Deload weight rounds to nearest 2.5kg regardless of equipment type
- D012: Deload position defined in program, M002 auto-reduces weight/volume to ~60%
