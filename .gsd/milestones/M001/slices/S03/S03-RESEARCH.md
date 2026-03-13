# S03: Workout Logging — Research

**Date:** 2026-03-12

## Summary

S03 delivers the core user loop — workout logging with tap-tap-done UX, pre-fill from last session, RIR tracking per set, set types, rest timer, and workout duration. This slice owns R003, R004, R005, R032, R035, and produces the `WorkoutRepository`, `workout.ts` types, workout tables (schema v3), and the active workout logging UI.

The data layer work is straightforward — two new tables (`workout_sessions`, `workout_sets`) following the exact same repository pattern from S01/S02. The real risk is the UX: the active workout screen is the most complex interactive surface in the app, combining pre-fill queries, inline set editing with steppers, RIR input, set type toggling, a rest timer, and a duration timer — all in a single scrollable view that must feel fast on mobile.

The pre-fill query (last session for same training day) is the key performance-sensitive operation. It requires joining `workout_sessions` → `workout_sets` filtered by `training_day_id`, ordered by `started_at DESC LIMIT 1`. With proper indexing on `training_day_id` and `started_at`, this should be well under the 200ms target for typical dataset sizes.

## Recommendation

**Approach:** Build bottom-up: schema v3 + types → WorkoutRepository with pre-fill query → tests → active workout UI route → rest timer + duration timer.

**Architecture:**
- New route: `/workout/[sessionId]` for active workout (parameterized by session ID after creation)
- New route or modal: start workout picker (select program → select training day → create session → navigate to active workout)
- WorkoutRepository: createSession, addSet, updateSet, removeSet, completeSession, getLastSessionForDay (pre-fill), getSessionById
- Active workout state: Svelte 5 runes (`$state`) for the in-memory working copy of exercises/sets, flushed to DB on each set completion
- Rest timer: `useInterval` from `runed` (1-second ticks, manual start, pause/reset)
- Duration timer: `useInterval` from `runed` (1-second ticks, auto-start on workout begin)
- RIR input: ToggleGroup with values 0-5+ for fast tap selection
- Set type: ToggleGroup or Badge-based selector (warmup/working/drop/failure per D005)
- Weight/reps: custom stepper components (- / value / +) with configurable step sizes

**Pre-fill strategy:** When starting a workout for a training day, query the last completed session for that same `training_day_id`. For each exercise assignment, find matching sets from the previous session (matched by `exercise_id`). Pre-populate weight, reps, and RIR from those sets. If no previous session exists, use empty defaults (weight: 0, reps from assignment's min_reps, RIR: 3).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Interval timer (rest/duration) | `useInterval` from `runed` | Already in deps, Svelte 5 runes-native, auto-cleanup, pause/resume/reset built in |
| Form validation | `sveltekit-superforms` SPA mode + `zod4Client` | Established pattern from S01/S02 forms, inline validation |
| Toast notifications | `svelte-sonner` (already wired in root layout) | App-wide Toaster already in +layout.svelte |
| RIR selector | `ToggleGroup` from shadcn-svelte | Perfect for single-value selection from small fixed set |
| Set type selector | `Badge` toggles or `ToggleGroup` | Matches the muscle group badge toggle pattern from S01 ExerciseFilters |
| Drawers/modals | `Drawer` from shadcn-svelte | Established pattern for mobile forms across S01/S02 |
| Context passing for active workout | `Context` from `runed` | Clean typed context without raw setContext/getContext |

## Existing Code and Patterns

- `src/lib/db/database.ts` — `dbExecute()`, `dbQuery()`, `getDb()` for all DB operations. Transaction pattern: `CapgoCapacitorFastSql.execute({ statement: 'BEGIN TRANSACTION' })` then COMMIT/ROLLBACK (see ProgramRepository.createProgram)
- `src/lib/db/repositories/exercise.ts` — Repository pattern to follow: row types as `type` aliases (not interface), `rowToEntity()` mapper, Zod validation on create/update, soft-delete via `deleted_at`
- `src/lib/db/repositories/program.ts` — `ProgramRepository.getById()` returns `ProgramWithDays` with nested `trainingDays[].assignments[]` — this is the entry point for loading a training day's exercise template
- `src/lib/types/common.ts` — `UUID`, `Timestamp`, `SoftDeletable` shared types to extend
- `src/lib/types/program.ts` — `TrainingDay`, `ExerciseAssignment` types; `Mesocycle` for week tracking
- `src/lib/db/__tests__/test-helpers.ts` — `setupMockDatabase()` / `teardownMockDatabase()` for sql.js backed tests
- `src/lib/db/schema.sql` — Schema v2 (exercises, programs, training_days, exercise_assignments, mesocycles). S03 bumps to v3 with workout tables.
- `src/routes/programs/[id]/+page.svelte` — Detail page pattern: `$effect` for DB init + load, loading/error/content states, FAB + Drawer for creation. The workout start flow may originate from this page or a dedicated route.
- `src/lib/components/programs/ExerciseAssignmentForm.svelte` — Superforms SPA pattern with form-specific Zod `.refine()`, two-step flow. Shows how to compose picker + form.
- `src/lib/components/exercises/ExerciseForm.svelte` — Superforms SPA pattern: `defaults(zod4(schema))` + `superForm({ SPA: true, validators: zod4Client(schema), onUpdate })`. Import from `sveltekit-superforms/adapters` barrel.
- `src/lib/components/exercises/i18n-maps.ts` — i18n label maps for muscle groups and equipment. May need similar maps for set types and RIR labels.
- `src/routes/+layout.svelte` — Root layout with ModeWatcher + Toaster. No navigation bar yet (S06 concern).
- `packages/ui/src/components/ui/` — Available: toggle-group, badge, button, button-group, card, drawer, input, select, separator, progress, tabs, dialog, alert-dialog, slider, switch, scroll-area, collapsible

## Constraints

- **Superforms SPA mode required** for all mutating forms (AGENTS.md). However, the active workout set editing is rapid inline mutation (stepper taps), not a traditional form submit. Superforms is appropriate for the "start workout" and "complete workout" confirmation flows, but individual set edits should use direct repository calls for speed.
- **Zod v4 syntax required** — `z.uuid()`, `z.enum()`, `z.optional()`, not `z.string().uuid()` (AGENTS.md)
- **Schema v3 migration** — `CURRENT_SCHEMA_VERSION` in database.ts must bump from 2→3. The migration system applies all DDL statements, so new tables in schema.sql are additive (IF NOT EXISTS).
- **UUID PKs + timestamps** on all new tables (D002)
- **Set types exactly: warmup, working, drop, failure** (D005). Only working sets count for progression (M002 concern, but data model must distinguish now).
- **RIR per set, range 0-5+** (D004). RIR 0 = failure. Store as integer, allow null for warmup sets.
- **Rest timer: optional/manual, no auto-start** (D006). No haptic on timer completion for now.
- **Workout duration: auto-start on session begin, auto-stop on completion** (R035).
- **Pre-fill from last session for same training day** (D003). Must match by `training_day_id` FK on workout_sessions.
- **No auto-cascade on soft-delete** (D022). Workout sessions reference training_day_id but the FK is logical, not enforced.
- **One active mesocycle per program** (D021). S03 may need to read `mesocycle.current_week` but doesn't modify it.
- **i18n: add de.json keys immediately, en.json in same task or dedicated follow-up** (AGENTS.md)
- **pnpm only** (AGENTS.md)
- **@lucide/svelte for icons** (AGENTS.md)

## Common Pitfalls

- **Stepper rapid-tap DB writes** — Don't write to SQLite on every stepper tap. Use in-memory state ($state) and flush to DB on set "confirm" or when navigating away. Rapid DB writes would cause visible lag and excessive I/O.
- **Pre-fill query N+1** — Don't load last session sets one-by-one per exercise. Use a single query joining workout_sets for the last session, then distribute to exercises in JS.
- **Transaction for session creation** — Creating a session + pre-populating empty set rows should be atomic. Use the BEGIN/COMMIT/ROLLBACK pattern from ProgramRepository.
- **Rest timer cleanup** — `useInterval` from runed auto-cleans up on effect disposal, but make sure the timer is scoped to the workout component lifecycle. If the user navigates away mid-workout, the timer should stop.
- **Duration timer across app background** — On mobile, `setInterval` pauses when the app is backgrounded. For accurate duration, store `started_at` timestamp and calculate elapsed time on resume rather than relying solely on a tick counter. The displayed duration should be `now - started_at`, updated by the interval for smooth display.
- **Schema migration ordering** — The `applySchema()` function runs ALL DDL statements in schema.sql on every migration. Since it uses `CREATE TABLE IF NOT EXISTS`, adding new tables is safe. But CURRENT_SCHEMA_VERSION must bump to 3, or the migration won't run on existing databases.
- **Set sort_order** — Sets within an exercise need ordering. Use a `set_number` or `sort_order` column on workout_sets, auto-incremented within each exercise grouping.
- **Soft-delete vs. hard-delete for sets during active workout** — During an active workout, removing a set should probably hard-delete (or just remove from in-memory state) rather than soft-delete. Soft-delete makes sense for completed sessions but is overhead for in-progress edits. Decide during planning.

## Data Model Design

### workout_sessions table
```sql
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  program_id TEXT,              -- FK to programs (nullable for ad-hoc workouts in future)
  training_day_id TEXT,         -- FK to training_days (nullable for ad-hoc)
  mesocycle_id TEXT,            -- FK to mesocycles (nullable, tracks which meso week)
  mesocycle_week INTEGER,       -- Snapshot of current_week at workout time
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'cancelled'
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_seconds INTEGER,     -- Total duration (computed on completion)
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### workout_sets table
```sql
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,     -- FK to workout_sessions
  exercise_id TEXT NOT NULL,    -- FK to exercises
  assignment_id TEXT,           -- FK to exercise_assignments (nullable, links to program template)
  set_number INTEGER NOT NULL,  -- Order within this exercise in this session
  set_type TEXT NOT NULL DEFAULT 'working', -- 'warmup' | 'working' | 'drop' | 'failure'
  weight REAL,                  -- kg or lbs (user preference, unit tracking deferred)
  reps INTEGER,
  rir INTEGER,                  -- 0-5+, null for warmup sets
  completed INTEGER NOT NULL DEFAULT 0, -- 0 = pending, 1 = done
  rest_seconds INTEGER,         -- Optional rest taken after this set
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
```

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_workout_sessions_training_day_id ON workout_sessions(training_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started_at ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_workout_sets_session_id ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
```

### Pre-fill Query
```sql
-- Get last completed session for a training day
SELECT ws.* FROM workout_sessions ws
WHERE ws.training_day_id = ?
  AND ws.status = 'completed'
  AND ws.deleted_at IS NULL
ORDER BY ws.started_at DESC
LIMIT 1;

-- Get all sets from that session
SELECT wst.* FROM workout_sets wst
WHERE wst.session_id = ?
  AND wst.deleted_at IS NULL
ORDER BY wst.exercise_id, wst.set_number ASC;
```

## UX Architecture

### Route Structure
- `/workout/start` — Select program → training day → start workout (or accessed from program detail page "Start workout" button)
- `/workout/[sessionId]` — Active workout screen (the main UX surface)

### Active Workout Screen Layout
1. **Header**: Training day name, duration timer (mm:ss), "Finish" button
2. **Exercise cards** (scrollable): For each exercise assignment:
   - Exercise name + muscle group badge
   - Set rows: each row = set_number | weight stepper | reps stepper | RIR selector | set_type toggle | confirm checkbox
   - "Add set" button below the last set row
3. **Rest timer** (floating or bottom bar): Start/pause button, reset, elapsed display (mm:ss)
4. **Complete workout**: Confirm dialog → saves all sets, marks session completed, navigates to summary or history

### Stepper UX
- Weight: ±2.5 (configurable step), long-press for faster increment
- Reps: ±1, long-press for faster increment
- Pre-filled values shown, user taps stepper or confirms as-is
- Confirming a set: tap a checkmark button → set marked completed, optional rest timer auto-suggestion

### RIR Input
- ToggleGroup with values: 0, 1, 2, 3, 4, 5+ (6 buttons)
- Default: pre-filled from last session, or 3 for new exercises
- Only shown for working sets (hidden for warmup)

### Set Type Toggle
- Default: "working"
- Toggle between warmup/working/drop/failure via compact Badge-style buttons or ToggleGroup
- Changing to warmup hides RIR input

## Open Risks

- **Active workout state management complexity** — The active workout screen holds a lot of mutable state (multiple exercises, each with multiple sets, each with weight/reps/RIR/type/completed). This needs careful design to avoid re-render storms. Consider a flat `$state` array of sets rather than deeply nested objects.
- **Background/foreground duration accuracy** — `setInterval` pauses on iOS/Android background. The workaround (started_at timestamp + calculation) handles accuracy but may cause a visual "jump" when the app is foregrounded. Consider using `@capacitor/app` lifecycle events to detect foreground and recalculate.
- **Weight unit handling** — The schema stores `REAL` for weight but doesn't track unit (kg vs lbs). For M001, assume kg. Unit preference is a future concern but the column type supports it.
- **Pre-fill with changed assignments** — If the user modifies their program (adds/removes exercises from a training day) between sessions, the pre-fill must gracefully handle mismatches. Match by `exercise_id`, not by array position or assignment_id.
- **Concurrent session prevention** — Should only allow one `in_progress` session at a time. Add a check on session creation.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor | `cap-go/capacitor-skills@capacitor-plugins` (123 installs) | available — relevant for SQLite and haptics |
| Capacitor offline | `cap-go/capgo-skills@capacitor-offline-first` (60 installs) | available — relevant for offline-first patterns |
| Svelte 5 | `autumnsgrove/groveengine@svelte5-development` (55 installs) | available — may help with runes patterns |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` (267 installs) | available — general SvelteKit patterns |

None are critical for S03 — the project already has local reference repos and established patterns. The Capacitor plugins skill from cap-go could be useful for future slices (S06 haptics/builds).

## Sources

- `useInterval` API and behavior (source: `references/runed/packages/runed/src/lib/utilities/use-interval/use-interval.svelte.ts`)
- `Context` utility for typed Svelte context (source: `references/runed/packages/runed/src/lib/utilities/context/context.ts`)
- Superforms SPA pattern (source: S01/T05 and S02/T04 task summaries — `defaults(zod4(schema))` + `superForm({ SPA: true, validators: zod4Client(schema), onUpdate })`)
- Transaction pattern (source: `src/lib/db/repositories/program.ts` — `ProgramRepository.createProgram`)
- Schema migration approach (source: `src/lib/db/database.ts` — version check + DDL application)
- ToggleGroup component availability (source: `packages/ui/src/components/ui/toggle-group/`)
