# S03: Workout Logging

**Goal:** Users can start a workout from a program training day, log sets with weight/reps/RIR using a tap-tap-done UX (pre-filled from last session), mark set types, use an optional rest timer, and see workout duration — all persisted to SQLite.
**Demo:** From the program detail page, tap "Start Workout" on a training day → active workout screen opens with exercises pre-filled from the template → sets pre-filled from last session (or defaults for first time) → adjust weight/reps via steppers, tap RIR, confirm set → rest timer available → "Finish Workout" → session saved with duration. Kill and reopen app → data persists.

## Must-Haves

- Schema v3 with `workout_sessions` and `workout_sets` tables, proper indexes
- `WorkoutRepository` with createSession, addSet, updateSet, removeSet, completeSession, getLastSessionForDay, getSessionById
- Workout types (`WorkoutSession`, `WorkoutSet`, `SetType`, session status enum) with Zod validation
- Pre-fill from last completed session for same training day (matched by `exercise_id`, single query, no N+1)
- Concurrent session prevention (only one `in_progress` session at a time)
- Active workout screen at `/workout/[sessionId]` with exercise cards, set rows, stepper inputs
- Weight stepper (±2.5 default), reps stepper (±1), both with long-press acceleration
- RIR selector (ToggleGroup, values 0–5+) shown for working sets, hidden for warmup
- Set type toggle (warmup/working/drop/failure) per set
- In-memory working state (`$state`) flushed to DB on set confirm, not on every tap
- "Add set" and "Remove set" per exercise
- Rest timer (manual start/pause/reset, not auto-start)
- Workout duration timer (auto-start, uses `started_at` timestamp for accuracy across backgrounding)
- "Finish Workout" with confirmation dialog → marks session completed, persists duration
- Entry point: "Start Workout" button on program detail page training day cards
- i18n keys for all new UI in `de.json`, with `en.json` translations in a dedicated task
- Unit tests for WorkoutRepository (createSession, addSet, completeSession, pre-fill query, concurrent session check)

## Proof Level

- This slice proves: integration (real repository + in-memory SQL, full CRUD + pre-fill verified via tests; UI route wired to real repository)
- Real runtime required: yes (dev server for UI smoke-test by user; tests run against sql.js mock)
- Human/UAT required: yes (the active workout UX is the most complex interactive surface — must be tested on a running app by user)

## Verification

- `pnpm -F mobile test -- --run apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — all WorkoutRepository unit tests pass (createSession, addSet, updateSet, removeSet, completeSession, getLastSessionForDay, concurrent session prevention)
- `pnpm -F mobile build` — app builds without errors, confirming types, imports, and schema are wired correctly
- Manual (UAT): start workout from program detail → log sets → finish → data persists across page reload

## Observability / Diagnostics

- Runtime signals: `[Workout]` prefixed console.log for session lifecycle events (create, complete, cancel) with session ID and timestamp; `[DB]` schema migration logs version 2→3
- Inspection surfaces: `WorkoutRepository.getSessionById(id)` returns full session with status, duration, set count — inspectable from any context; `dbState()` for connection health
- Failure visibility: WorkoutRepository methods throw typed errors with context (session ID, operation name); pre-fill query returns empty array (not error) when no previous session exists; concurrent session check returns existing session ID on conflict
- Redaction constraints: none — no sensitive data in workout logging

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/database.ts` (dbExecute, dbQuery, getDb), `src/lib/types/program.ts` (TrainingDay, ExerciseAssignment, ProgramWithDays), `src/lib/db/repositories/program.ts` (ProgramRepository.getById for loading training day template), `src/lib/types/exercise.ts` (Exercise type for display), `src/lib/db/repositories/exercise.ts` (ExerciseRepository.getById for resolving exercise names)
- New wiring introduced in this slice: `/workout/[sessionId]` route consuming WorkoutRepository + ProgramRepository; "Start Workout" button on program detail training day cards navigating to new route; schema v3 migration adding workout tables
- What remains before the milestone is truly usable end-to-end: S04 (workout history/body weight), S05 (onboarding/templates), S06 (design polish/haptics/platform builds), S07 (i18n completion)

## Tasks

- [x] **T01: Schema v3, workout types, and WorkoutRepository with tests** `est:2h`
  - Why: Foundation for all workout logging — new DB tables, typed interfaces, repository with pre-fill query, and unit tests proving correctness. Tests are the slice's primary contract verification.
  - Files: `apps/mobile/src/lib/db/schema.sql`, `apps/mobile/src/lib/db/database.ts`, `apps/mobile/src/lib/types/workout.ts`, `apps/mobile/src/lib/db/repositories/workout.ts`, `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts`
  - Do: Add workout_sessions + workout_sets tables + indexes to schema.sql. Bump CURRENT_SCHEMA_VERSION to 3. Define WorkoutSession, WorkoutSet, SetType, SessionStatus types + Zod schemas. Build WorkoutRepository with all methods including pre-fill query (single join, not N+1) and concurrent session prevention. Write comprehensive tests.
  - Verify: `pnpm -F mobile test -- --run apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — all pass
  - Done when: All repository methods tested, pre-fill returns correct data from last session matched by exercise_id, concurrent session check works

- [x] **T02: Active workout screen with exercise cards, set rows, and stepper UX** `est:2.5h`
  - Why: The core UI surface — displays exercise cards with set rows, weight/reps steppers, RIR selector, set type toggle, add/remove set. Uses in-memory $state with DB flush on confirm. This is the primary user interaction loop (R003).
  - Files: `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+layout.ts`, `apps/mobile/src/lib/components/workout/ExerciseCard.svelte`, `apps/mobile/src/lib/components/workout/SetRow.svelte`, `apps/mobile/src/lib/components/workout/Stepper.svelte`, `apps/mobile/src/lib/components/workout/RirSelector.svelte`
  - Do: Create `/workout/[sessionId]` route that loads session + training day template + last session sets for pre-fill. Build ExerciseCard (exercise name + muscle group badge + set rows + add set button). Build SetRow (set_number, weight stepper, reps stepper, RIR selector, set type toggle, confirm checkbox). Build reusable Stepper component (±buttons, configurable step, long-press acceleration). Build RirSelector (ToggleGroup 0-5+, hidden for warmup sets). In-memory $state array of working sets, flush to DB on set confirm via checkbox.
  - Verify: `pnpm -F mobile build` passes; route renders exercise cards with pre-filled set data
  - Done when: Active workout screen shows exercises with set rows, steppers work, RIR toggles, set types toggle, sets confirmable, add/remove set works

- [x] **T03: Rest timer, duration timer, finish workout flow, and start workout entry point** `est:1.5h`
  - Why: Completes the workout lifecycle — rest timer between sets (R005), duration tracking (R035), finish flow that persists everything, and the entry point from program detail page. Without this, workouts can't be started or completed.
  - Files: `apps/mobile/src/lib/components/workout/RestTimer.svelte`, `apps/mobile/src/lib/components/workout/DurationTimer.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/src/routes/programs/[id]/+page.svelte`, `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte`
  - Do: Build RestTimer (manual start/pause/reset using runed useInterval, mm:ss display). Build DurationTimer (auto-start, `started_at`-based calculation for background accuracy, mm:ss display). Add "Finish Workout" button with AlertDialog confirmation → calls WorkoutRepository.completeSession → navigates to program page or home. Add "Start Workout" button to TrainingDayCard in program detail → creates session via WorkoutRepository.createSession → navigates to `/workout/[sessionId]`. Handle concurrent session check (show toast if already in progress).
  - Verify: `pnpm -F mobile build` passes; start→log→finish flow is complete end-to-end
  - Done when: User can start workout from program detail, see duration ticking, use rest timer, finish workout with confirmation, session is saved as completed

- [x] **T04: i18n — German (de.json) keys for all workout UI** `est:30m`
  - Why: AGENTS.md requires all new UI to have de.json keys immediately. All workout screens, components, and messages need German translations as the base locale.
  - Files: `apps/mobile/messages/de.json`, `apps/mobile/src/lib/components/workout/*.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/src/routes/programs/[id]/+page.svelte`
  - Do: Add all workout-related i18n keys to de.json (workout_ prefix namespace). Wire all hardcoded strings in workout components and routes to use `m.workout_*()` paraglide messages. Add set type and RIR label maps (like exercises/i18n-maps.ts pattern). Wire the "Start Workout" button label on program detail page.
  - Verify: `pnpm -F mobile build` passes; grep for hardcoded user-facing strings in workout components returns none
  - Done when: All user-facing strings in workout UI use paraglide messages, de.json has all workout_ keys

- [x] **T05: i18n — English (en.json) translations for workout keys** `est:20m`
  - Why: AGENTS.md requires en.json translations. Dedicated task per locale convention to keep context focused.
  - Files: `apps/mobile/messages/en.json`
  - Do: Translate all workout_ keys from de.json to English. Verify key parity between de.json and en.json.
  - Verify: `cd apps/mobile/messages && diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no differences
  - Done when: en.json has all keys from de.json with proper English translations

## Files Likely Touched

- `apps/mobile/src/lib/db/schema.sql` — v3 with workout tables + indexes
- `apps/mobile/src/lib/db/database.ts` — CURRENT_SCHEMA_VERSION bump 2→3
- `apps/mobile/src/lib/types/workout.ts` — new: WorkoutSession, WorkoutSet, SetType, SessionStatus, Zod schemas
- `apps/mobile/src/lib/db/repositories/workout.ts` — new: WorkoutRepository
- `apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — new: repository unit tests
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — new: active workout screen
- `apps/mobile/src/routes/workout/[sessionId]/+layout.ts` — new: SPA prerender config
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — new: exercise card for workout
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — new: single set editing row
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — new: reusable ±stepper
- `apps/mobile/src/lib/components/workout/RirSelector.svelte` — new: RIR toggle group
- `apps/mobile/src/lib/components/workout/RestTimer.svelte` — new: manual rest timer
- `apps/mobile/src/lib/components/workout/DurationTimer.svelte` — new: workout duration display
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — modified: "Start Workout" entry point
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — modified: start workout button
- `apps/mobile/messages/de.json` — add workout_ i18n keys
- `apps/mobile/messages/en.json` — add workout_ i18n translations
