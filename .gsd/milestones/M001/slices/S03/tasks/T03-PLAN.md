---
estimated_steps: 5
estimated_files: 6
---

# T03: Rest timer, duration timer, finish workout flow, and start workout entry point

**Slice:** S03 — Workout Logging
**Milestone:** M001

## Description

Complete the workout lifecycle: add the rest timer between sets (R005), duration timer (R035), "Finish Workout" confirmation flow, and the "Start Workout" entry point from the program detail page. After this task, a user can start a workout from a training day, log sets, use timers, and complete the workout — the full end-to-end flow.

## Steps

1. **Build DurationTimer component** — Create `src/lib/components/workout/DurationTimer.svelte`. Uses the session's `started_at` timestamp as the source of truth. A 1-second `useInterval` from `runed` ticks and recalculates `elapsed = Date.now() - Date.parse(started_at)`. This handles iOS/Android backgrounding correctly — the interval just updates the display, the actual elapsed time is always computed from the timestamp. Display format: `mm:ss` (or `h:mm:ss` if over an hour). Props: `startedAt: string` (ISO timestamp).

2. **Build RestTimer component** — Create `src/lib/components/workout/RestTimer.svelte`. Manual start/pause/reset (not auto-start, per D006). Uses `useInterval` from `runed` with 1-second ticks. State: `running` (boolean), `elapsedSeconds` (number). Start button starts the interval, pause stops it, reset zeroes the counter and stops. Display format: `mm:ss`. Rendered as a floating bottom bar or inline section on the workout page. Props: none (self-contained state). Compact mobile-friendly layout with Start/Pause and Reset buttons.

3. **Add finish workout flow** — In the active workout page (`/workout/[sessionId]/+page.svelte`): Add a "Finish Workout" button in the header area. On click, open an AlertDialog (from shadcn-svelte) confirming completion. On confirm: calculate `durationSeconds` from `Date.now() - Date.parse(session.started_at)`, call `WorkoutRepository.completeSession(sessionId, durationSeconds)`, show success toast, navigate to program detail page (or home). Handle the case where not all sets are confirmed — show a warning in the dialog but still allow completion.

4. **Add "Start Workout" entry point on program detail** — Modify `src/routes/programs/[id]/+page.svelte` and `src/lib/components/programs/TrainingDayCard.svelte`: Add a "Start Workout" button/icon to each TrainingDayCard. On click: check for existing in-progress session via `WorkoutRepository.getInProgressSession()`. If one exists, show toast with option to resume (navigate to existing session). If none, call `WorkoutRepository.createSession({ program_id, training_day_id, mesocycle_id?, mesocycle_week? })` → on success, navigate to `/workout/[sessionId]`. The createSession call should pre-populate sets from the last session (handled by repository method or by the page on load).

5. **Wire timers and integrate everything** — In the active workout page: add DurationTimer in the header (always visible, shows elapsed time). Add RestTimer at the bottom of the page (collapsible or always visible). Ensure the page header shows: training day name, duration timer, "Finish" button. Test the full flow: program detail → start workout → workout screen with timers → log sets → finish → back to program detail.

## Must-Haves

- [ ] DurationTimer component using `started_at` timestamp (not tick counter) for background accuracy
- [ ] RestTimer component with manual start/pause/reset (no auto-start per D006)
- [ ] "Finish Workout" button with AlertDialog confirmation
- [ ] completeSession saves duration_seconds and sets status=completed
- [ ] Navigation back to program detail after completion
- [ ] "Start Workout" button on TrainingDayCard in program detail page
- [ ] Concurrent session check on start (toast if in-progress session exists, option to resume)
- [ ] Session creation with program_id and training_day_id
- [ ] Full start→log→finish flow works end-to-end

## Verification

- `pnpm -F mobile build` — builds without errors
- Manual: from program detail, tap start workout on a training day → workout screen opens with duration timer running → rest timer available → tap finish → confirmation dialog → session saved → navigated back

## Observability Impact

- Signals added/changed: `[Workout]` log on session start (from entry point) and session complete (from finish flow) with session ID and training day name
- How a future agent inspects this: DurationTimer derives from `started_at` (inspectable via WorkoutRepository.getSessionById); RestTimer is purely UI state (no persistence); finish flow result visible via session status in DB
- Failure state exposed: createSession failure shows toast with error; completeSession failure shows toast with error; concurrent session conflict shows toast with existing session info

## Inputs

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — active workout page (T02)
- `apps/mobile/src/lib/db/repositories/workout.ts` — WorkoutRepository (T01)
- `apps/mobile/src/lib/types/workout.ts` — WorkoutSession types (T01)
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — program detail page (S02)
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — training day card (S02)
- `references/runed/packages/runed/src/lib/utilities/use-interval/` — useInterval API reference
- `packages/ui/src/components/ui/alert-dialog/` — AlertDialog component

## Expected Output

- `apps/mobile/src/lib/components/workout/DurationTimer.svelte` — duration timer component
- `apps/mobile/src/lib/components/workout/RestTimer.svelte` — rest timer component
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — updated with timers + finish flow
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — updated with start workout handler
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — updated with start workout button
