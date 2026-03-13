---
estimated_steps: 5
estimated_files: 2
---

# T02: Integrate suggestions into workout page and ExerciseCard

**Slice:** S04 — RIR Progression Suggestions in Workout
**Milestone:** M002

## Description

Wire the progression suggestion loader and banner into the live workout flow. Extend the ExerciseGroup interface with `equipment`, add reactive state for suggestions and dismissals in the workout page, call the loader after session data is ready, pass suggestions through to ExerciseCard, and render the ProgressionBanner inside ExerciseCard above the sets list.

## Steps

1. Modify `ExerciseGroup` interface in `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`:
   - Add `equipment: Exercise['equipment']` field (import `Equipment` type if needed)
   - In the group-building loop (both template-based and remaining-exercises paths), populate `equipment` from `exerciseMap.get(eid)?.equipment ?? 'other'`

2. Add progression state and loader to the workout page:
   - Import `loadProgressionSuggestions` from `$lib/services/analytics/progressionSuggestionLoader.js`
   - Import `ProgressionSuggestion` type from `$lib/types/analytics.js`
   - Add `let progressionSuggestions = $state<Map<string, ProgressionSuggestion>>(new Map())`
   - Add `let dismissedSuggestions = $state(new Set<string>())`
   - After `loadSession()` completes (after `exerciseGroups = groups`), fire a non-blocking suggestion load:
     ```
     const exerciseIds = groups.map(g => g.exerciseId);
     loadProgressionSuggestions(exerciseIds).then(suggestions => {
       progressionSuggestions = suggestions;
     });
     ```
   - This runs after `loading = false`, so workout UI renders immediately
   - Add a `dismissSuggestion(exerciseId: string)` function that adds to `dismissedSuggestions` set and triggers reactivity

3. Modify `ExerciseCard.svelte` Props interface:
   - Add `suggestion?: ProgressionSuggestion | null` optional prop (default `null`)
   - Add `ondismiss?: () => void` optional prop (default undefined)
   - Import `ProgressionBanner` from `./ProgressionBanner.svelte`
   - Import `ProgressionSuggestion` type from `$lib/types/analytics.js`
   - In the template, inside `CardContent` before the sets `{#each}` block, add:
     ```svelte
     {#if suggestion}
       <ProgressionBanner {suggestion} ondismiss={() => ondismiss?.()} />
     {/if}
     ```

4. Wire suggestions into ExerciseCard rendering in the workout page template:
   - In the `{#each exerciseGroups as group}` block, compute the suggestion for each group:
   - Pass `suggestion={dismissedSuggestions.has(group.exerciseId) ? null : (progressionSuggestions.get(group.exerciseId) ?? null)}`
   - Pass `ondismiss={() => dismissSuggestion(group.exerciseId)}`

5. Verify the full integration:
   - Run `pnpm run build` — zero errors
   - Run `pnpm test -- --grep "progression"` — S01 tests still pass
   - Manual: on dev server, open workout with qualifying exercises → banners appear → dismiss works → non-qualifying exercises show nothing → sets visible before suggestions load

## Must-Haves

- [ ] `equipment` field added to ExerciseGroup and populated from exerciseMap
- [ ] Suggestion loading is non-blocking (fire-and-forget after loadSession)
- [ ] `progressionSuggestions` state is reactive — banners appear when data arrives
- [ ] `dismissedSuggestions` state is in-memory Set — no persistence
- [ ] ExerciseCard `suggestion` prop is optional with null default
- [ ] ProgressionBanner renders above sets inside ExerciseCard when suggestion is non-null
- [ ] Dismissed suggestions are excluded from ExerciseCard rendering
- [ ] No changes to progressionAdvisor.ts or ProgressionSuggestion type

## Verification

- `pnpm run build` — zero errors
- `pnpm test -- --grep "progression"` — all S01 progression tests pass (no regression)
- Manual on dev server: progression banners appear on qualifying exercises, are dismissible, don't block set rendering

## Observability Impact

- Signals added/changed: The loader's `[Progression]` logs now fire during real workout page loads — visible in browser console
- How a future agent inspects this: Open browser console, navigate to a workout page, filter for `[Progression]` to see suggestion count and timing
- Failure state exposed: Loader errors surfaced in console; UI shows no banner (graceful degradation) — banner absence is the visible failure state

## Inputs

- `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts` — T01 output
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — T01 output
- `apps/mobile/messages/de.json` — T01 added keys
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — existing workout page (M001/S03)
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — existing component (M001/S03)

## Expected Output

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — modified with equipment in ExerciseGroup, progression state, loader call, and suggestion + dismiss props passed to ExerciseCard
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — modified with optional suggestion/ondismiss props and ProgressionBanner rendering
