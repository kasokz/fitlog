# S04: RIR Progression Suggestions in Workout — Research

**Date:** 2026-03-12

## Summary

S04 integrates the progression advisor from S01 into the active workout UI. The computation engine (`getProgressionSuggestion()` in `progressionAdvisor.ts`) is fully built and tested (16 tests covering all boundary conditions). The task is pure UI integration: call the advisor per exercise when the workout loads, display non-intrusive banners on exercise cards that have a suggestion, and handle dismissal/loading/error states gracefully.

The integration point is `ExerciseCard.svelte` — the existing component renders per-exercise sections in the workout page (`/workout/[sessionId]/+page.svelte`). The workout page already loads full `Exercise` objects (with `equipment` metadata) into an `exerciseMap`, but the `ExerciseGroup` interface doesn't currently carry `equipment`. This must be extended so the banner can show equipment-aware increment text ("+2.5 kg" for barbell, "+2 kg" for dumbbell). The S03 PR detection integration provides the exact architectural pattern to follow: async detection at page load, non-blocking errors, and a self-contained display component.

The primary risk is **performance** — calling `getProgressionSuggestion()` for each exercise triggers 2-3 DB queries per exercise (exercise lookup, recent sessions, completed working sets). A workout with 5-6 exercises means 10-18 DB calls on load. These should run in parallel via `Promise.all()` and complete well under 1 second, but must not block the initial render. The secondary risk is **UX intrusiveness** — the banner must feel helpful, not annoying. It should be dismissible per-exercise and not shift layout after initial render.

## Recommendation

**Build a thin `ProgressionBanner.svelte` component and a `loadProgressionSuggestions()` orchestrator function.** Follow the exact pattern from S03's `detectSessionPRs()` + `PRCelebrationToast.svelte`:

1. **Orchestrator function** — A new `loadProgressionSuggestions(exerciseIds: UUID[])` that calls `getProgressionSuggestion()` per exercise in parallel, catches per-exercise errors, and returns a `Map<UUID, ProgressionSuggestion>`. Fire-and-forget from the workout page's `loadSession()` — populate a reactive `Map` that the template reads.

2. **Banner component** — `ProgressionBanner.svelte` takes a `ProgressionSuggestion` prop, renders inside `ExerciseCard` above the sets. Uses the existing shadcn `Alert` component (already in `packages/ui`) with a custom variant/color for a non-destructive suggestion appearance. Includes a dismiss button (X icon) that hides it for the current session (in-memory only — no persistence needed).

3. **ExerciseCard integration** — Add an optional `suggestion` prop to `ExerciseCard.svelte`. The workout page passes the suggestion from the reactive Map. This keeps ExerciseCard's interface clean and the suggestion data flow explicit.

4. **i18n** — Add ~5 de.json keys for the banner text (suggestion message with weight placeholder, dismiss label, loading indicator text if needed). English translations go in S07.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Non-intrusive banner styling | `Alert` + `AlertTitle` + `AlertDescription` from `@repo/ui/components/ui/alert` | Already in the design system. Default variant provides a card-like container with proper spacing. Add an icon (TrendingUp from lucide) for visual recognition. |
| Parallel async with error isolation | `Promise.all()` + per-item try/catch | Exact pattern from S03's `detectSessionPRs()`. Each exercise failure is caught individually — one missing exercise doesn't block others. |
| Dismissible state | In-memory `Set<UUID>` of dismissed exercise IDs | No persistence needed — suggestions reappear next session. Simple `$state(new Set())` in the workout page. |
| Weight formatting | Existing `toFixed(1)` pattern used in SetRow stepper | Consistent with how weight values display elsewhere. No special formatter needed. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` — **The engine.** `getProgressionSuggestion(exerciseId, thresholds?)` returns `ProgressionSuggestion | null`. Fully tested. Handles bodyweight skip (D052), null RIR, insufficient data. Returns `suggested_weight`, `increment_kg`, `current_weight`, `avg_rir`, `sessions_analyzed`, `reason`. No changes needed to this file.
- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` — **Pattern to follow.** Parallel per-exercise async calls with individual error handling, structured console logging, timing measurement, and a graceful empty-result fallback. The `ExerciseGroup` input type avoids redundant DB lookups by reusing in-memory data from the workout page.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — **Integration target.** The `loadSession()` function already resolves `exerciseMap: Map<string, Exercise>` with full metadata including `equipment`. The `ExerciseGroup` interface needs `equipment` added. The template iterates `exerciseGroups` rendering `ExerciseCard` per group — suggestion data flows through here.
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — **Display integration point.** Currently takes `exerciseName`, `muscleGroup`, `sets`, and event handlers. Will add optional `suggestion: ProgressionSuggestion | null` prop. Banner renders above the sets list in `CardContent`.
- `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte` — **UI pattern reference.** Shows how to build a compact, badge-heavy display component with i18n for analytics data. The progression banner should be visually lighter (alert, not toast) but follow the same composition patterns.
- `packages/ui/src/components/ui/alert/` — **Banner container.** `Alert`, `AlertTitle`, `AlertDescription` with `default` variant. Use with a `TrendingUp` icon from lucide for the suggestion context.
- `apps/mobile/src/lib/types/analytics.ts` — **Contract.** `ProgressionSuggestion` interface: `exercise_id`, `suggested_weight`, `increment_kg`, `current_weight`, `reason`, `sessions_analyzed`, `avg_rir`. No changes needed.
- `apps/mobile/messages/de.json` — **i18n base.** No existing `progression_*` keys. Need to add ~5 keys for banner text: suggestion title, message with weight parameter, dismiss action label, and an optional loading placeholder.

## Constraints

- **ExerciseCard must remain reusable.** The suggestion prop must be optional (`suggestion?: ProgressionSuggestion | null`). ExerciseCard is used only in the workout page currently, but it should not hard-depend on analytics imports.
- **No layout shift after initial render.** The banner must either render from the start (with a loading placeholder) or gracefully appear without pushing sets down unexpectedly. Recommendation: reserve no space — let the banner animate in when data arrives. Users scroll through exercises, so a subtle appearance is acceptable.
- **Progression detection must not block workout rendering.** The workout sets must render immediately. Suggestions load asynchronously after the session data is ready. Pattern: `loadSession()` completes → exerciseGroups render → `loadSuggestions()` fires in parallel → reactive Map updates → banners appear.
- **Only working sets from completed sessions count (D051).** Already enforced by `getProgressionSuggestion()` via `AnalyticsRepository`. No additional filtering needed in the UI layer.
- **Bodyweight exercises return null (D052).** Already handled by the advisor. The UI should simply not show a banner when suggestion is null.
- **Equipment-based weight increments (D045).** The advisor already computes equipment-specific increments. The banner text should include both the suggested weight and the increment for clarity: "Erhöhe auf 102.5 kg (+2.5 kg)".
- **In-progress session sets are not in the advisor's dataset.** `getRecentSessionsForExercise` only returns completed sessions (`s.status = 'completed'`). The current in-progress session won't affect the suggestion. This is correct behavior.
- **The workout page has no `+page.ts` load function.** It's a fully client-side page with `loadSession()` called from `$effect`. The progression loading must follow the same pattern — `$effect` or called within `loadSession()`.
- **5-tab nav constraint (D036).** No navigation changes needed — this is inline within the existing workout page.

## Common Pitfalls

- **Calling `getProgressionSuggestion()` sequentially per exercise.** With 5-6 exercises, sequential calls add up (each makes 2-3 DB queries). **Avoid:** Use `Promise.all()` to parallelize all calls. The DB queries are independent per exercise.
- **Showing stale suggestions after the user adds weight mid-workout.** If a user increases weight based on the suggestion and confirms sets, the suggestion is stale but still visible. **Avoid:** This is acceptable — the suggestion is based on completed historical sessions, not the current one. The banner shows "consider" language, not "you must." Dismissal handles the UX concern.
- **Blocking workout rendering on suggestion loading.** If the advisor queries are slow, the workout page should still be usable. **Avoid:** Load suggestions in a separate async flow after `loadSession()` completes. Use a reactive `suggestionsLoading` state only if a loading indicator is desired (likely unnecessary — the banner just appears when ready).
- **Forgetting to pass equipment to ExerciseGroup.** The `ExerciseGroup` interface in the workout page currently lacks `equipment`. Without it, the banner can't show equipment-specific text. **Avoid:** Add `equipment: Equipment` to the interface and populate it from `exerciseMap` during group construction.
- **Overcomplicating dismissal persistence.** Storing dismissed suggestions in Preferences or DB is unnecessary — the suggestion reappearing on the next workout session is desired behavior (it's a per-session nudge). **Avoid:** Use a simple `$state(new Set<string>())` of dismissed exerciseIds, scoped to the component instance.
- **Not handling the case where a new first-time exercise has no history.** `getProgressionSuggestion()` returns null when there aren't enough sessions. The banner simply doesn't render. But the orchestrator should gracefully handle this — no error, just null. **Avoid:** This is already handled by the advisor, but the orchestrator's try/catch per-exercise pattern ensures robustness.

## Open Risks

- **Multiple rapid DB calls on workout load.** The workout page already makes several DB calls to load the session, program, and exercises. Adding 5-6 more parallel calls for suggestions increases the burst. On low-end devices via the Capacitor HTTP bridge, this could add noticeable latency. **Mitigation:** Measure total load time. If >500ms, consider batching suggestion queries into a single SQL query that returns all exercises at once (would require a new AnalyticsRepository method).
- **UX of the banner competing with set editing.** The banner appears above sets in ExerciseCard. On small screens, it takes vertical space that could be used for sets. **Mitigation:** Keep the banner compact (1-2 lines max). Use AlertDescription for the suggestion text and a small dismiss button. Test on mobile viewport.
- **S06 freemium gate will need to suppress suggestions for free users.** The banner component and orchestrator should be built so S06 can wrap them in a premium check without restructuring. **Mitigation:** The orchestrator function can accept a `premiumEnabled` flag, or S06 can simply not call it for free users. Design the API to be easily gateable.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 | `sveltejs/ai-tools@svelte-code-writer` | available (2.5K installs) — general Svelte code generation |
| Svelte 5 | `ejirocodes/agent-skills@svelte5-best-practices` | available (2.1K installs) — Svelte 5 best practices |
| shadcn-svelte | (already in codebase + references/) | installed |
| runed | (already in codebase + references/) | installed |

No additional skills needed for this slice. The work is straightforward Svelte component composition + async data loading, well-covered by the existing codebase patterns and references.

## Sources

- Progression advisor algorithm and thresholds — S01/T04 implementation and 16 passing tests in `progressionAdvisor.test.ts` (source: codebase)
- Session PR detection integration pattern — S03/T01+T02 implementation in `sessionPRDetector.ts` and workout page integration (source: codebase)
- Alert component API — `packages/ui/src/components/ui/alert/` with `Alert`, `AlertTitle`, `AlertDescription`, `alertVariants` (source: codebase)
- ExerciseCard current interface — `exerciseName`, `muscleGroup`, `sets`, `onconfirm`, `onadd`, `onremove` props (source: codebase)
- Workout page data flow — `loadSession()` builds `exerciseMap: Map<string, Exercise>` and `exerciseGroups: ExerciseGroup[]` (source: codebase)
- Equipment-based weight increments — `WEIGHT_INCREMENTS` constant in progressionAdvisor.ts: barbell 2.5kg, dumbbell 2kg, cable/machine 2.5kg (source: codebase, D045)
