# S03: PR Detection, Celebration & History — Research

**Date:** 2026-03-12

## Summary

S03 wires the S01 PR detection engine (`detectPRs`, `getPRHistory`) into three UI surfaces: (1) a celebration toast with haptic feedback when the user completes a workout session containing PRs, (2) a dedicated PR history view accessible from the history section, and (3) per-exercise PR visibility from the exercise detail drawer. The S01 engine is fully implemented and tested — `detectPRs()` is a pure function comparing new sets against historical sets, returning `PR[]` with types `weight_pr`, `rep_pr`, `e1rm_pr`. `getPRHistory()` is async (queries AnalyticsRepository) and returns chronological PR list. The primary integration point is `handleFinishWorkout()` in `routes/workout/[sessionId]/+page.svelte`, where session completion triggers a DB status update, haptic feedback, and navigation. PR detection must run here, after session completion but before navigation away. The toast system (svelte-sonner v1.1.0) supports `toast.custom()` with full Svelte component rendering, enabling a rich celebration toast. The haptics service already has `notifySuccess()` (already called on workout finish) and `impactHeavy()` for emphasis.

The main risks are: (1) performance of PR detection at session completion (computing against potentially large historical datasets should be fast since `getExerciseSetsHistory` uses the indexed working-set filter, but needs to be called once per exercise in the session), (2) UX timing of the celebration toast (it should appear before navigation, with enough time to be read), and (3) exercise name resolution (PRs reference exercise_id but the toast/history needs exercise names, requiring ExerciseRepository lookups).

## Recommendation

**Hook PR detection into the existing workout completion flow and build two new UI views.**

The approach should be:

1. **PR Detection Service** — Create a thin orchestration function `detectSessionPRs(sessionId)` that loads the session's sets, groups by exercise, calls `detectPRs()` per exercise against historical data, and returns all PRs with exercise names resolved. This avoids coupling the detection logic into the page component directly.

2. **Celebration Toast** — After `WorkoutRepository.completeSession()` succeeds, call the PR detection service. If PRs are found, show a custom toast via `toast.custom(PRCelebrationToast, { componentProps, duration: 5000 })` with `impactHeavy()` haptic. The toast component shows PR count, exercise names, and PR types with visual flair. Delay navigation by a short period (or use toast's `onDismiss`/`onAutoClose` callback) so the user sees the celebration before leaving the page.

3. **PR History View** — New route at `/history/prs` (or Drawer from history page) showing all PRs across exercises, grouped by exercise, with date and value. Uses `getPRHistory()` per exercise. Accessible from history page header (alongside the existing analytics button).

4. **Exercise Detail PR Section** — Extend `ExerciseDetail.svelte` drawer to show recent PRs for the selected exercise via `getPRHistory(exerciseId)`. Adds a "Personal Records" section with the most recent PR per category (weight, rep, e1RM).

**i18n:** Per AGENTS.md, add `de.json` keys immediately for all new UI text. S07 handles en.json and other locales.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Toast notifications with custom components | `svelte-sonner` v1.1.0 `toast.custom()` | Already installed and wired into layout. Supports full Svelte component rendering with `componentProps`. |
| Haptic feedback on PR celebration | `@capacitor/haptics` via `haptics.ts` service | `notifySuccess()` and `impactHeavy()` are fire-and-forget, already tested. Use `impactHeavy()` for PR emphasis (stronger than the existing `notifySuccess()` on workout finish). |
| PR detection algorithm | `detectPRs()` from `prDetector.ts` (S01) | Pure function, fully tested with 10+ test cases covering all 3 PR categories, edge cases, and defense-in-depth filtering. |
| PR history computation | `getPRHistory()` from `prDetector.ts` (S01) | Async function using `AnalyticsRepository.getExerciseSetsHistory()`, chronological order, tested. |
| Exercise name resolution | `ExerciseRepository.getById()` | Already used in workout page for exercise name lookup. Same pattern for PR display. |
| Date formatting | `Intl.DateTimeFormat` | Already used throughout codebase. No date library. |
| UI components (Badge, Drawer, Card, Tabs) | shadcn-svelte components from `@repo/ui` | Already used extensively. PR history and detail views should compose from these. |

## Existing Code and Patterns

### Integration Points

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — **Primary hook point.** `handleFinishWorkout()` at line ~260 calls `WorkoutRepository.completeSession()`, then `notifySuccess()`, then navigates. PR detection inserts between completion and navigation. The function already has access to `exerciseGroups` (with `exerciseId` and `sets` per exercise) and `sessionId`.

- `apps/mobile/src/lib/services/analytics/prDetector.ts` — **Core engine.** `detectPRs(exerciseId, newSets, historicalSets): PR[]` is pure, synchronous. `getPRHistory(exerciseId): Promise<PR[]>` is async (DB queries). Both filter to completed working sets as defense-in-depth.

- `apps/mobile/src/lib/db/repositories/analytics.ts` — **Data source.** `AnalyticsRepository.getExerciseSetsHistory(exerciseId)` returns all historical completed working sets for an exercise, ordered by session date DESC. Used internally by `getPRHistory()`.

- `apps/mobile/src/lib/services/haptics.ts` — **Haptic feedback.** `notifySuccess()` is already called on workout finish. `impactHeavy()` available for stronger PR celebration haptic. All fire-and-forget.

- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — **Exercise detail drawer.** Currently shows muscle groups, equipment, type. Natural place to add a "Personal Records" section showing PRs for the viewed exercise.

- `apps/mobile/src/routes/history/+page.svelte` — **History page.** Has a header with an analytics button (`BarChart3` icon) linking to `/history/analytics`. A PR history button can be added alongside it or as a sub-section.

### Patterns to Follow

- **Toast pattern:** `toast.success(m.key(), { description: '...', duration: 5000 })` or `toast.custom(Component, { componentProps: {...} })` for rich content. The `ExternalToast` type supports `description`, `action`, `duration`, `class`, `onDismiss`, `onAutoClose`.

- **Data loading pattern:** All pages use `$effect(() => { loadData(); })` with `loading`/`error` state, `getDb()` call at the start. PR history should follow the same pattern.

- **Component file naming:** PascalCase for non-route components (e.g., `PRCelebrationToast.svelte`, `PRHistoryCard.svelte`).

- **i18n usage:** All user-facing strings use `m.key_name()` from `$lib/paraglide/messages.js`. Keys added to `de.json` (base locale) first.

- **Drawer pattern:** `ExerciseDetail.svelte` uses `Drawer.Root` with `bind:open` + `Drawer.Content/Header/Footer`. PR history could use the same Drawer pattern or a dedicated route.

## Constraints

- **PR detection must not block workout completion.** If PR detection fails (e.g., DB query error), the session should still be marked complete. Wrap in try/catch, log errors, and proceed. The toast is a nice-to-have, not a gate.

- **Session data is available before navigation.** After `completeSession()`, the session status is `completed` in the DB. PR detection can query historical sets (which now includes the just-completed session, since `completeSession` writes `status = 'completed'` and `detectPRs` uses `AnalyticsRepository` which filters on `s.status = 'completed'`). **Important:** The just-completed session's sets ARE now included in `getExerciseSetsHistory()` after completion, so `detectPRs` should compare the session's sets against sets from OTHER sessions (all historical minus the current session's). Either: (a) filter current session out of the historical query, or (b) use the in-memory `exerciseGroups` data as `newSets` and query only sets from older sessions.

- **Toast visibility before navigation.** The `goto()` call after workout completion navigates away from the page. The Toaster is in the root layout, so toasts persist across navigation. No need to delay navigation — the toast will remain visible after navigation.

- **No dedicated PR storage table.** PRs are computed on-the-fly from set data. `getPRHistory()` reprocesses all historical sets chronologically. For the history view, this means computing PRs per exercise on demand. For the celebration toast, `detectPRs()` is called once per exercise at session completion.

- **5-tab bottom nav constraint (D036).** PR history cannot be a new tab. It must be accessible from the existing History tab/section or from the exercise detail drawer.

- **i18n: de.json is base locale.** New keys go to `de.json` immediately. Other locales are S07 scope.

- **svelte-sonner `toast.custom()` API.** The first argument is a Svelte component, and `componentProps` is passed via `ExternalToast`. The component receives props directly. The toast `id` is automatically managed.

## Common Pitfalls

- **Double-counting current session in PR detection.** After `completeSession()`, the session's status is `completed`, so `getExerciseSetsHistory()` includes its sets. If we then call `detectPRs(exerciseId, sessionSets, allHistoricalSets)` where `allHistoricalSets` includes the session's own sets, the comparison would be new vs. (new + old), never detecting PRs because the "new" sets are already in history. **Mitigation:** Use the in-memory set data from `exerciseGroups` as `newSets`, and query historical sets with a date range ending BEFORE the current session's started_at, OR filter the current session_id out of the historical query result.

- **Performance with many exercises per session.** A session with 6-8 exercises means 6-8 calls to `AnalyticsRepository.getExerciseSetsHistory()`. Each is a single indexed SQL query — should be fast (<10ms each on SQLite), but worth batching with `Promise.all()`. **Mitigation:** Parallelize all per-exercise PR detection calls.

- **Exercise name resolution for toast.** PR objects contain `exercise_id` but the toast needs exercise names. The workout page already has `exerciseGroups` with `exerciseName` per group. Pass this map to the PR detection orchestrator to avoid redundant `ExerciseRepository.getById()` calls.

- **Empty PR result (no celebration).** Most sessions won't produce PRs (intermediate lifters may PR every few weeks, not every session). The celebration toast should only appear when PRs are detected. No toast = no action. Don't show a "no PRs" message — that would be demoralizing.

- **Toast auto-dismiss timing.** Default svelte-sonner duration is ~4 seconds. For a celebration toast, use a longer duration (5-6 seconds) so the user has time to read multiple PRs. Set `duration: 5000` or `6000`.

- **getPRHistory performance for many exercises.** The PR history view may need to call `getPRHistory()` for each exercise the user has trained. With 20+ exercises, this could be slow. **Mitigation:** For the PR history page, only load exercises with workout history (use `getExercisesWithHistory()` from dashboardData), then lazy-load PRs per exercise on demand or show a summary first.

## Open Risks

- **PR detection race condition at session completion.** Between `completeSession()` (which writes status=completed) and the PR detection query, there's a theoretical window where the session's sets are in the DB as completed. The mitigation (using in-memory sets as newSets and filtering current session from history) eliminates this, but must be implemented correctly.

- **Toast.custom component rendering.** The `toast.custom()` API passes `componentProps` to the Svelte component. This works with svelte-sonner v1.1.0, but the exact prop interface needs testing. The component receives standard toast props (`id`, `closeToast`, etc.) in addition to custom props.

- **Celebration UX on web vs native.** Haptic feedback only works on native (Capacitor). On web preview, `impactHeavy()` silently no-ops. The visual toast must carry the celebration on its own without relying on haptics.

- **Large PR history for active users.** A user training consistently for 6+ months could have hundreds of PRs across exercises. The history view needs pagination or a "show recent" default to avoid rendering too many items.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| svelte-sonner | (none found) | none found |
| Capacitor Haptics | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) — general Capacitor best practices |
| shadcn-svelte | (already in references) | installed |
| Svelte 5 | (already in references) | installed |

No directly relevant skills for this slice's specific concerns (toast customization, PR celebration UX). The existing codebase patterns and reference docs are sufficient.

## Sources

- svelte-sonner v1.1.0 `toast.custom()` API — supports Svelte component as first arg with `componentProps` in ExternalToast options. Also supports `description`, `duration`, `action`, `onDismiss`, `onAutoClose`. (source: `node_modules/svelte-sonner/dist/toast-state.svelte.d.ts` and `types.d.ts`)
- `detectPRs()` pure function — tested with 10+ cases covering all 3 PR types, defense-in-depth filtering, edge cases (empty history, first-ever set, reps >10 exclusion). (source: `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts`)
- `getPRHistory()` async function — tested with multi-session chronological PR tracking, progressive weight PRs, non-improving set exclusion. (source: same test file)
- Haptics service — fire-and-forget pattern with `notifySuccess()` and `impactHeavy()`, web fallback silently no-ops. (source: `apps/mobile/src/lib/services/haptics.ts`)
- Workout completion flow — `handleFinishWorkout()` calls `completeSession()` → `notifySuccess()` → `toast.success()` → `goto()`. (source: `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` line ~260)
- `AnalyticsRepository.getExerciseSetsHistory()` — returns sets from COMPLETED sessions with working-set filter. After `completeSession()`, the current session's sets ARE included in results. (source: `apps/mobile/src/lib/db/repositories/analytics.ts` — WORKING_SET_FILTER includes `s.status = 'completed'`)
