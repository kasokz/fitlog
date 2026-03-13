---
id: T03
parent: S03
milestone: M001
provides:
  - DurationTimer component deriving elapsed time from started_at timestamp
  - RestTimer component with manual start/pause/reset
  - Finish workout flow with AlertDialog confirmation and completeSession call
  - Start workout entry point on TrainingDayCard in program detail page
  - Pre-population of sets from last completed session (or template defaults for first time)
  - Concurrent session detection with toast and resume option
key_files:
  - apps/mobile/src/lib/components/workout/DurationTimer.svelte
  - apps/mobile/src/lib/components/workout/RestTimer.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
  - apps/mobile/src/routes/programs/[id]/+page.svelte
  - apps/mobile/src/lib/components/programs/TrainingDayCard.svelte
key_decisions:
  - DurationTimer uses useInterval(1000) as a display ticker only — actual elapsed time is always computed from Date.now() - Date.parse(started_at) for accuracy across iOS/Android backgrounding
  - RestTimer is purely UI state with no persistence — a simple stopwatch for rest periods, not auto-started per D006
  - Finish flow allows completion even with unconfirmed sets — shows a warning count but doesn't block
  - Start workout pre-populates sets from last completed session for the same training day; falls back to template-based defaults (target_sets x working sets) for first-time workouts
  - Concurrent session check uses toast.info with an action button for resume navigation
patterns_established:
  - TrainingDayCard accepts optional onstartworkout prop — play button only renders when there are exercises and handler is provided
  - Workout page stores session reference for started_at access and programId for post-completion navigation
observability_surfaces:
  - "[Workout] Session started from program detail" console.log with sessionId, trainingDayId, programId
  - "[Workout] Session completed" console.log with sessionId, trainingDayName, durationSeconds
  - "[Workout] Start workout failed" / "[Workout] Finish workout failed" console.error on failures
  - Toast notifications for all success/error states visible to user
duration: 20min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Rest timer, duration timer, finish workout flow, and start workout entry point

**Built DurationTimer, RestTimer, finish workout confirmation flow, and "Start Workout" entry point — completing the full workout lifecycle from program detail through logging to completion.**

## What Happened

Implemented all five steps of the task plan:

1. **DurationTimer** — Uses `useInterval` from runed as a 1-second display ticker. The actual elapsed time is always computed from `Date.now() - Date.parse(startedAt)`, making it resilient to iOS/Android app backgrounding. Displays `mm:ss` or `h:mm:ss` format.

2. **RestTimer** — Self-contained manual stopwatch with start/pause/reset. Uses `useInterval` from runed with `immediate: false` so it doesn't auto-start (per D006). Renders as a fixed bottom bar on the workout page.

3. **Finish workout flow** — Added "Finish" button in the workout page header. Opens a shadcn-svelte AlertDialog confirming completion. Shows unconfirmed set count as a warning (but allows completion regardless). Calculates `durationSeconds` from timestamp, calls `WorkoutRepository.completeSession`, shows success toast, navigates back to program detail.

4. **Start workout entry point** — Added a play button to TrainingDayCard (only visible when exercises exist). On click: checks for concurrent in-progress session (shows toast with resume action if found), creates new session with mesocycle context, pre-populates sets from last completed session (or template defaults for first time), navigates to workout screen.

5. **Integration** — Wired DurationTimer in the workout header (always visible), RestTimer fixed at bottom, updated page to track session/programId/trainingDayName state for the finish flow.

## Verification

- `pnpm -F mobile build` — builds without errors
- `pnpm -F mobile test -- --run apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — all 154 tests pass (4 test files)
- i18n keys synchronized: de.json and en.json both have 171 keys with zero diff

## Diagnostics

- DurationTimer derives from `started_at` — inspectable via `WorkoutRepository.getSessionById(id).started_at`
- RestTimer is purely UI state (no persistence) — visible on screen only
- Finish flow result visible via `WorkoutRepository.getSessionById(id)` → status=completed, duration_seconds set
- Start flow: `WorkoutRepository.getInProgressSession()` returns null if no active session, or the session for resume
- Console logs: `[Workout] Session started from program detail` and `[Workout] Session completed` with structured data

## Deviations

None — implemented all steps as planned.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/workout/DurationTimer.svelte` — new: duration timer using started_at timestamp
- `apps/mobile/src/lib/components/workout/RestTimer.svelte` — new: manual rest timer with start/pause/reset
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — updated: added timers, finish flow with AlertDialog, session state tracking
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — updated: added WorkoutRepository import, start workout handler with pre-population
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — updated: added optional onstartworkout prop with play button
- `apps/mobile/messages/de.json` — added 13 new i18n keys for timers, finish flow, start workout
- `apps/mobile/messages/en.json` — added matching 13 English translations
