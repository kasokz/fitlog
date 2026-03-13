---
id: T02
parent: S04
milestone: M002
provides:
  - Full workout page integration of progression suggestions with non-blocking async loading
  - ExerciseCard optional suggestion/ondismiss props with ProgressionBanner rendering
  - equipment field on ExerciseGroup interface populated from exerciseMap
  - In-memory dismiss state for progression banners (Set<string>)
key_files:
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
  - apps/mobile/src/lib/components/workout/ExerciseCard.svelte
key_decisions:
  - Fire-and-forget pattern for suggestion loading — loadProgressionSuggestions runs after exerciseGroups assignment, so UI renders immediately and banners appear reactively when data arrives
  - dismissedSuggestions uses Set spread for reactivity (new Set([...old, id])) since Svelte 5 tracks assignment
  - Renamed local variable to groupExerciseIds to avoid shadowing the outer exerciseIds Set in loadSession scope
patterns_established:
  - Non-blocking async data enrichment post-render — load primary data, render UI, then fire-and-forget secondary data that updates UI reactively when ready
observability_surfaces:
  - "[Progression]" prefixed console logs now fire during real workout page loads — exerciseCount, suggestionCount, durationMs, and per-exercise failures visible in browser console
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Integrate suggestions into workout page and ExerciseCard

**Wired progression suggestion loader and ProgressionBanner into live workout flow with non-blocking async loading, optional ExerciseCard props, and in-memory dismiss state.**

## What Happened

Modified the workout page (`+page.svelte`) to:
1. Add `equipment: Equipment` field to `ExerciseGroup` interface, populated from `exerciseMap.get(eid)?.equipment ?? 'other'` in both the template-based and remaining-exercises group construction paths.
2. Add reactive `progressionSuggestions` Map and `dismissedSuggestions` Set state variables.
3. Fire `loadProgressionSuggestions(groupExerciseIds)` as a non-blocking `.then()` after `exerciseGroups = groups`, so workout UI renders immediately and banners appear reactively when data arrives.
4. Add `dismissSuggestion(exerciseId)` function that creates a new Set for reactivity.
5. Pass `suggestion` and `ondismiss` props to each `ExerciseCard` in the template, with dismissed exercises filtered out.

Modified `ExerciseCard.svelte` to:
1. Add optional `suggestion?: ProgressionSuggestion | null` (default `null`) and `ondismiss?: () => void` props.
2. Import and render `ProgressionBanner` inside `CardContent` above the sets `{#each}` block when suggestion is non-null.

## Verification

- `pnpm run build` — zero errors, all imports and types resolve ✅
- `pnpm test -- progression` — 16/16 progressionAdvisor tests pass (no regression) ✅
- `grep -c 'progression_' apps/mobile/messages/de.json` — returns 5 (i18n keys present) ✅

## Diagnostics

- Open browser console on a workout page, filter for `[Progression]` to see:
  - `[Progression] Loading suggestions { exerciseCount: N }` — start signal
  - `[Progression] Suggestions loaded { exerciseCount: N, suggestionCount: N, durationMs: N }` — end with timing
  - `[Progression] Exercise suggestion failed { exerciseId, error }` — per-exercise failure
- Banner absence on an exercise is the visible failure state (graceful degradation)
- Suggestion loading never blocks workout UI rendering — sets are visible before suggestions arrive

## Deviations

- Renamed local variable from `exerciseIds` to `groupExerciseIds` to avoid shadowing the outer `exerciseIds` Set declared earlier in `loadSession()`. Same behavior, cleaner scope.
- Slice plan uses `--grep` for vitest which is not valid in vitest 4; used positional filter argument `pnpm test -- progression` instead.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Added equipment to ExerciseGroup, progression state, non-blocking loader call, dismiss function, and suggestion/ondismiss props on ExerciseCard
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — Added optional suggestion/ondismiss props and ProgressionBanner rendering above sets
