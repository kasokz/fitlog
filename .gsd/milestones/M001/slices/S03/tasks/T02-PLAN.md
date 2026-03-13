---
estimated_steps: 5
estimated_files: 8
---

# T02: Active workout screen with exercise cards, set rows, and stepper UX

**Slice:** S03 — Workout Logging
**Milestone:** M001

## Description

Build the core workout logging UI — the active workout screen at `/workout/[sessionId]`. This is the app's most important interactive surface: exercise cards with inline set editing rows, weight/reps steppers with long-press acceleration, RIR toggle selector, set type toggles, add/remove set, and a confirm mechanism. All editing happens on an in-memory `$state` working copy that flushes to the database only on set confirmation — never on individual stepper taps.

## Steps

1. **Create the route scaffold** — Add `/workout/[sessionId]/+layout.ts` (SSR disabled, prerender false — same pattern as other routes). Create `/workout/[sessionId]/+page.svelte` with the session loading logic: on mount, call `getDb()`, then `WorkoutRepository.getSessionById(sessionId)` to get the session. Load the training day template via `ProgramRepository.getById(session.program_id)` to get exercise names and assignment details. Build in-memory working state: a `$state` array of exercise groups, each containing exercise info + an array of working set objects. Pre-fill from session sets (which were populated by `createSession` in T01 or from `getLastSessionForDay`). Handle loading/error/not-found states.

2. **Build the Stepper component** — Create `src/lib/components/workout/Stepper.svelte`: a reusable numeric stepper with minus button, value display, plus button. Props: `value` (bindable), `step` (default 1), `min` (default 0), `max` (optional), `format` (optional display formatter). Implement long-press acceleration: on pointer-down, start incrementing after 400ms, accelerating every 100ms. Clean up on pointer-up/leave. Use shadcn Button components for ± buttons. The stepper fires `onchange` callback but does NOT write to DB — it only updates the in-memory state.

3. **Build the RirSelector component** — Create `src/lib/components/workout/RirSelector.svelte`: a ToggleGroup with values 0, 1, 2, 3, 4, "5+". Props: `value` (bindable), `disabled` (for warmup sets). Use `ToggleGroup` from shadcn-svelte (`@repo/ui/components/ui/toggle-group`). Compact sizing for mobile. When set type is warmup, the selector is hidden.

4. **Build SetRow component** — Create `src/lib/components/workout/SetRow.svelte`: a single set editing row containing: set number label, weight Stepper (step=2.5), reps Stepper (step=1), RirSelector, set type selector (compact badge-style toggles for warmup/working/drop/failure — use shadcn Badge or ToggleGroup), and a confirm/checkmark button. Props: the working set object (bindable), `onconfirm` callback, `onremove` callback. When confirmed: call `onconfirm` which triggers the parent to flush that set to DB via `WorkoutRepository.updateSet`. Visual state change on confirm (muted/checked appearance). Set type change to warmup hides RIR selector.

5. **Build ExerciseCard and wire the page** — Create `src/lib/components/workout/ExerciseCard.svelte`: card showing exercise name + muscle group badge (reuse badge pattern from exercise detail), then renders SetRow for each set, plus an "Add Set" button at the bottom. Props: exercise info, working sets array, callbacks for confirm/add/remove. Wire into the page: render ExerciseCard for each exercise group. "Add Set" calls `WorkoutRepository.addSet()` and appends to in-memory state. "Remove Set" calls `WorkoutRepository.removeSet()` (hard delete) and removes from in-memory state. Set confirm calls `WorkoutRepository.updateSet()` to flush that single set to DB.

## Must-Haves

- [ ] `/workout/[sessionId]` route loads session and displays exercise cards
- [ ] Stepper component with configurable step size and long-press acceleration
- [ ] RirSelector using ToggleGroup (0-5+), hidden for warmup sets
- [ ] SetRow with weight stepper (±2.5), reps stepper (±1), RIR, set type, confirm button
- [ ] Set type toggle: warmup/working/drop/failure
- [ ] In-memory `$state` working copy — no DB writes on stepper taps
- [ ] DB flush only on set confirm (updateSet), add set (addSet), remove set (removeSet)
- [ ] ExerciseCard renders sets + add/remove controls
- [ ] Loading/error/not-found states handled
- [ ] Uses shadcn-svelte components (Card, Button, ToggleGroup, Badge)

## Verification

- `pnpm -F mobile build` — builds without errors
- Route exists and renders when navigated to with a valid session ID (manual check in dev server)

## Observability Impact

- Signals added/changed: None — UI layer delegates all persistence to WorkoutRepository which already logs lifecycle events
- How a future agent inspects this: Component tree is discoverable via route file; in-memory state is standard Svelte `$state` — inspectable via Svelte DevTools
- Failure state exposed: Error state rendered in UI when session load fails; console.error on DB operation failures in event handlers

## Inputs

- `apps/mobile/src/lib/db/repositories/workout.ts` — WorkoutRepository (T01)
- `apps/mobile/src/lib/types/workout.ts` — WorkoutSession, WorkoutSet, SetType types (T01)
- `apps/mobile/src/lib/db/repositories/program.ts` — ProgramRepository.getById for exercise template
- `apps/mobile/src/lib/db/repositories/exercise.ts` — ExerciseRepository.getById for exercise names
- `apps/mobile/src/lib/types/exercise.ts` — Exercise type, MuscleGroup for badge display
- `packages/ui/src/components/ui/toggle-group/` — ToggleGroup component
- `packages/ui/src/components/ui/card/` — Card component
- `packages/ui/src/components/ui/badge/` — Badge component
- `apps/mobile/src/lib/components/exercises/ExerciseCard.svelte` — badge/muscle group display pattern

## Expected Output

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — active workout screen
- `apps/mobile/src/routes/workout/[sessionId]/+layout.ts` — SPA layout config
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — reusable numeric stepper
- `apps/mobile/src/lib/components/workout/RirSelector.svelte` — RIR toggle selector
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — set editing row
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — exercise card with sets
