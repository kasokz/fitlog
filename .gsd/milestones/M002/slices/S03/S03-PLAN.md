# S03: PR Detection, Celebration & History

**Goal:** PRs are automatically detected at session completion with a celebration toast + haptic feedback, and users can view their full PR history per exercise from the history page and exercise detail drawer.
**Demo:** Complete a workout session containing a weight/rep/e1RM personal record → see a celebration toast with haptic feedback listing the PRs achieved. Navigate to History → PRs to see all personal records grouped by exercise. Open an exercise detail drawer → see that exercise's current PR records.

## Must-Haves

- PR detection runs automatically after `completeSession()` succeeds, comparing session sets against historical data (excluding the current session's sets from history)
- Celebration toast with haptic feedback (`impactHeavy()`) appears when PRs are detected — shows exercise names, PR types, and values
- No toast appears when no PRs are detected (silent success — not demoralizing)
- PR detection failure does not block workout completion (try/catch, session is already saved)
- PR history view at `/history/prs` shows all personal records grouped by exercise with dates and values
- PR history is accessible from the History page header
- Exercise detail drawer shows current best PRs (most recent PR per category) for the viewed exercise
- All new user-facing strings added to `de.json` (base locale)
- Parallelized PR detection per exercise via `Promise.all()`

## Proof Level

- This slice proves: integration
- Real runtime required: no (unit tests for orchestration service; build verification for UI components)
- Human/UAT required: yes (visual toast appearance, haptic feedback on device, PR history UX)

## Verification

- `pnpm test -- --grep "sessionPRDetector"` — unit tests for the session PR detection orchestrator (correct filtering of current session from history, exercise name resolution, empty results handling, error resilience)
- `pnpm run build` — all new Svelte components, route, and i18n keys compile without errors
- Manual: Verify i18n key count parity: `cd apps/mobile/messages && jq 'keys | map(select(startswith("pr_"))) | length' de.json` returns ≥12

## Observability / Diagnostics

- Runtime signals: `[PR] Session PR detection` structured console log with sessionId, exercise count, PR count, and duration (ms). `[PR] Detection failed` error log with sessionId and error detail on failure.
- Inspection surfaces: PR history page (`/history/prs`) — a future agent can navigate there to see if PRs are being computed correctly.
- Failure visibility: PR detection errors are logged but never shown to the user (non-blocking). The console log includes the exercise that failed and the error message.
- Redaction constraints: None — no secrets or PII in PR data.

## Integration Closure

- Upstream surfaces consumed:
  - `detectPRs()` and `getPRHistory()` from `prDetector.ts` (S01)
  - `AnalyticsRepository.getExerciseSetsHistory()` (S01)
  - `WorkoutRepository.completeSession()` — hook point in workout page
  - `ExerciseGroup` type/data from workout `[sessionId]/+page.svelte` — exercise names and in-memory sets
  - `impactHeavy()` from `haptics.ts` (M001)
  - `toast.custom()` from `svelte-sonner` (installed)
  - `ExerciseDetail.svelte` — exercise detail drawer (M001)
  - `getExercisesWithHistory()` from `dashboardData.ts` (S02)
- New wiring introduced in this slice:
  - `detectSessionPRs()` orchestration function → called from `handleFinishWorkout()` in workout page
  - `PRCelebrationToast.svelte` → rendered via `toast.custom()` in root layout Toaster
  - `/history/prs` route → linked from history page header
  - PR section in `ExerciseDetail.svelte` → calls `getPRHistory()` on open
- What remains before the milestone is truly usable end-to-end:
  - S04 (progression suggestions in workout)
  - S05 (deload auto-adjustment)
  - S06 (freemium gate on PR history and other analytics)
  - S07 (en.json and other locale translations)

## Tasks

- [x] **T01: Build session PR detection service and unit tests** `est:1h`
  - Why: Core orchestration layer that bridges the S01 `detectPRs()` engine with the workout completion flow. Must handle current-session exclusion, exercise name resolution, parallel per-exercise detection, and error resilience. Tests prove correctness before UI integration.
  - Files: `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts`, `apps/mobile/src/lib/services/analytics/__tests__/sessionPRDetector.test.ts`
  - Do: Create `detectSessionPRs(sessionId, exerciseGroups)` that takes the session ID and in-memory exercise groups (with exercise names), queries historical sets excluding the current session per exercise, calls `detectPRs()` per exercise in parallel via `Promise.all()`, enriches results with exercise names, logs diagnostics, and returns `SessionPRResult`. Wrap entire function in try/catch returning empty result on failure. Write unit tests using the existing sql.js mock pattern covering: PRs detected correctly, current session excluded from history, no PRs when no improvements, error in one exercise doesn't block others, empty session returns empty.
  - Verify: `pnpm test -- --grep "sessionPRDetector"` — all tests pass
  - Done when: `detectSessionPRs()` is tested with ≥5 test cases and handles all edge cases documented in research

- [x] **T02: Build celebration toast component and wire into workout completion** `est:1h`
  - Why: The user-facing celebration moment — toast + haptic feedback when PRs are detected at session completion. Wires `detectSessionPRs()` into `handleFinishWorkout()` and renders results via a custom toast component.
  - Files: `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `PRCelebrationToast.svelte` receiving PR results as props — shows PR count headline, list of exercises with PR types and values, uses Badge components for PR type labels. Wire into `handleFinishWorkout()`: after `completeSession()` succeeds, call `detectSessionPRs()`, if PRs found call `impactHeavy()` + `toast.custom(PRCelebrationToast, { componentProps, duration: 6000 })`. Navigation proceeds immediately (Toaster is in root layout, persists across navigation). Add all celebration i18n keys to `de.json`.
  - Verify: `pnpm run build` succeeds. Check `de.json` contains `pr_celebration_*` keys.
  - Done when: Build passes, celebration toast component exists with proper props interface, `handleFinishWorkout()` calls PR detection after session completion, `de.json` has all celebration keys

- [x] **T03: Build PR history page and link from history** `est:1h`
  - Why: Users need a dedicated view to browse all their personal records across exercises. Accessible from the existing History tab, respecting the 5-tab nav constraint (D036).
  - Files: `apps/mobile/src/routes/history/prs/+page.svelte`, `apps/mobile/src/lib/components/history/PRHistoryCard.svelte`, `apps/mobile/src/routes/history/+page.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `/history/prs` route that loads exercises with history via `getExercisesWithHistory()`, then loads PRs per exercise via `getPRHistory()`. Group PRs by exercise, show most recent PR per category (weight/rep/e1RM) prominently with full chronological list expandable. Use `PRHistoryCard.svelte` per exercise. Add a Trophy icon button in the History page header alongside the existing BarChart3 analytics button. Handle loading/empty states following existing patterns. Add all PR history i18n keys to `de.json`.
  - Verify: `pnpm run build` succeeds. Route file exists at correct path. `de.json` contains `pr_history_*` keys.
  - Done when: Build passes, `/history/prs` route renders PR history grouped by exercise, History page has a link to it, all i18n keys in `de.json`

- [x] **T04: Add PR section to exercise detail drawer** `est:45m`
  - Why: Users should see an exercise's personal records in context when viewing exercise details. Natural discovery point for PR data.
  - Files: `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte`, `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `ExercisePRSection.svelte` that takes an `exerciseId` prop, calls `getPRHistory(exerciseId)` on mount, computes the current best PR per category (latest weight_pr, rep_pr, e1rm_pr), and displays them as a compact card with Badge labels and formatted values. Add this section to `ExerciseDetail.svelte` between the exercise metadata and the footer. Handle loading state (small spinner) and empty state ("Noch keine Rekorde"). Add i18n keys to `de.json`.
  - Verify: `pnpm run build` succeeds. `de.json` contains `pr_detail_*` keys. `ExerciseDetail.svelte` imports and renders `ExercisePRSection`.
  - Done when: Build passes, exercise detail drawer shows PR section with best records per category, all i18n keys in `de.json`

## Files Likely Touched

- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` (new)
- `apps/mobile/src/lib/services/analytics/__tests__/sessionPRDetector.test.ts` (new)
- `apps/mobile/src/lib/components/workout/PRCelebrationToast.svelte` (new)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` (modify)
- `apps/mobile/src/routes/history/prs/+page.svelte` (new)
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte` (new)
- `apps/mobile/src/routes/history/+page.svelte` (modify)
- `apps/mobile/src/lib/components/exercises/ExercisePRSection.svelte` (new)
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` (modify)
- `apps/mobile/messages/de.json` (modify)
