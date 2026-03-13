---
estimated_steps: 5
estimated_files: 4
---

# T02: Build celebration toast component and wire into workout completion

**Slice:** S03 — PR Detection, Celebration & History
**Milestone:** M002

## Description

Create the `PRCelebrationToast.svelte` component that renders a visually distinctive celebration toast showing PR achievements, then wire it into the `handleFinishWorkout()` flow in the workout session page. After `completeSession()` succeeds, PR detection runs, and if PRs are found, a custom toast with heavy haptic feedback appears. Navigation proceeds immediately since the Toaster is in the root layout and persists across route changes. All new user-facing strings are added to `de.json`.

## Steps

1. Add i18n keys to `apps/mobile/messages/de.json` for the celebration toast:
   - `pr_celebration_title` — e.g. "Neuer Rekord!" (singular) / "Neue Rekorde!" (plural, use count param)
   - `pr_celebration_weight_pr` — e.g. "Gewichts-PR"
   - `pr_celebration_rep_pr` — e.g. "Wiederholungs-PR"
   - `pr_celebration_e1rm_pr` — e.g. "1RM-PR"
   - `pr_celebration_value_kg` — e.g. "{value} kg"
   - `pr_celebration_value_reps` — e.g. "{value} Wdh."
   - `pr_celebration_value_e1rm` — e.g. "~{value} kg (est. 1RM)"

2. Create `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte`:
   - Props: `prs: EnrichedPR[]` (from sessionPRDetector).
   - Layout: A card-like toast with a bold title (count-aware), then a list of PRs grouped by exercise name. Each PR shows a Badge for the PR type (weight/rep/e1RM) and the formatted value.
   - Use shadcn-svelte `Badge` for PR type labels. Use neobrutalist styling consistent with the app (border-2, shadow, bold colors).
   - Show a trophy/star visual indicator (use `Trophy` icon from `@lucide/svelte`).
   - Keep it compact — max 3-4 exercises visible, with a "+N more" indicator if many PRs.

3. Wire PR detection into `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`:
   - Import `detectSessionPRs` and `PRCelebrationToast`.
   - Import `impactHeavy` from haptics service.
   - In `handleFinishWorkout()`, after `completeSession()` succeeds and before `goto()`:
     - Build exercise groups input from the in-memory `exerciseGroups` state (map to `{ exerciseId, exerciseName, sets }` format, converting `WorkingSet` to `WorkoutSet` shape with the session_id added).
     - Call `const prResult = await detectSessionPRs(sessionId, mappedGroups)`.
     - If `prResult.prs.length > 0`: call `impactHeavy()` (instead of `notifySuccess()`), then `toast.custom(PRCelebrationToast, { componentProps: { prs: prResult.prs }, duration: 6000 })`.
     - If no PRs: keep existing `notifySuccess()` + `toast.success()` behavior.
   - Ensure PR detection is inside its own try/catch — failure falls through to the existing toast.success path.

4. Verify the toast component receives correct props by checking the svelte-sonner `toast.custom()` API — the component gets `componentProps` spread as props.

5. Run `pnpm run build` to verify everything compiles.

## Must-Haves

- [ ] `PRCelebrationToast.svelte` renders PR type badges, exercise names, and formatted values
- [ ] `handleFinishWorkout()` calls `detectSessionPRs()` after session completion
- [ ] `impactHeavy()` fires instead of `notifySuccess()` when PRs are detected
- [ ] PR detection failure falls through to existing success toast (never blocks completion)
- [ ] Navigation proceeds immediately after toast (Toaster persists across routes)
- [ ] All celebration i18n keys added to `de.json`

## Verification

- `pnpm run build` succeeds without errors
- `de.json` contains keys matching `pr_celebration_*` pattern (≥6 keys)
- `handleFinishWorkout()` in the workout page source contains `detectSessionPRs` call

## Observability Impact

- Signals added/changed: The PR detection service (T01) already logs `[PR]` diagnostics. The toast itself is the user-facing signal.
- How a future agent inspects this: Check `[PR]` console logs during workout completion, or visually verify the toast appears.
- Failure state exposed: PR detection failure logs to console; user sees normal success toast instead of celebration toast (graceful degradation).

## Inputs

- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` — `detectSessionPRs()`, `EnrichedPR` type (T01)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — existing `handleFinishWorkout()` flow
- `apps/mobile/src/lib/services/haptics.ts` — `impactHeavy()`, `notifySuccess()`
- `svelte-sonner` — `toast.custom()` API

## Expected Output

- `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte` — celebration toast component
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — modified with PR detection wiring
- `apps/mobile/messages/de.json` — updated with `pr_celebration_*` keys
