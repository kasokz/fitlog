# M001: Core Training Engine

**Vision:** Deliver a fully functional offline-first fitness tracking app for iOS and Android. Users can browse exercises, create structured programs with mesocycles, log workouts with a blazing-fast tap-tap-done UX and RIR tracking per set, review their history, and track body weight. The app has a distinctive neobrutalist design, is localized in German and English, and works entirely offline with a sync-ready data model.

## Success Criteria

- User can install the app on iOS or Android and start logging a workout within 2 minutes of first launch
- Workout logging requires minimal taps: sets pre-filled from last session, confirm-or-adjust with steppers
- RIR is tracked per set as a first-class data point
- All data persists across app restarts in SQLite with no network dependency
- Exercise library includes curated exercises with muscle groups and equipment, plus custom exercise creation
- Programs support mesocycle definition with week blocks and deload week positioning
- Workout history is browsable with full session detail
- UI is distinctive and polished — neobrutalist design with dark/light mode and haptic feedback
- App is fully localized in German and English

## Key Risks / Unknowns

- **SQLite plugin integration complexity** — capacitor-community/sqlite has a verbose API and requires manual connection management. A bad abstraction here would make every downstream slice painful.
- **Tap-tap-done UX with pre-fill** — Pre-filling sets from last session's data requires efficient queries during an active workout. If the DB layer is slow or the query pattern wrong, the core UX suffers.
- **Mesocycle data modeling** — Representing the relationship between program templates, active mesocycle instances, and individual workout sessions is non-trivial. Wrong model = painful refactor.

## Proof Strategy

- **SQLite plugin integration** → retire in S01 by proving: exercises CRUD works, data persists across app restart, queries return in <50ms for typical dataset sizes
- **Tap-tap-done pre-fill** → retire in S03 by proving: workout screen loads with pre-filled data from last session in <200ms
- **Mesocycle modeling** → retire in S02 by proving: a program with 6-week mesocycle and deload week can be created, persisted, and drives correct workout day selection

## Verification Classes

- Contract verification: Vitest unit tests for data layer, schema validation
- Integration verification: Full CRUD flows on real SQLite (Capacitor on device/simulator)
- Operational verification: App install, kill, restart — data survives; offline mode works
- UAT / human verification: Workout logging flow on real device, design review, onboarding flow

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 7 slices are complete with passing verification
- A user can complete the full onboarding → program selection → workout logging → history review flow
- Data persists across app kill/restart on both iOS and Android
- The app works in airplane mode (fully offline)
- All screens use the neobrutalist design system with dark/light mode
- Haptic feedback fires on set completion and workout finish
- All user-facing text is localized in de and en
- iOS and Android builds run on simulator/emulator and real device

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R030, R031, R032, R033, R034, R035
- Partially covers: none
- Leaves for later: R013-R029 (M002-M004), R036-R038 (deferred)
- Orphan risks: none

## Slices

- [x] **S01: Data Layer & Exercise Library** `risk:high` `depends:[]`
  > After this: User can browse a curated exercise library with search/filter by muscle group and equipment, create custom exercises, and all data persists in SQLite across app restarts.

- [x] **S02: Programs & Mesocycles** `risk:medium` `depends:[S01]`
  > After this: User can create a training program with named training days, assign exercises with target rep ranges and set counts, and define a mesocycle with week count and deload week position.

- [x] **S03: Workout Logging** `risk:high` `depends:[S01,S02]`
  > After this: User can start a workout from a program day, log sets with weight/reps/RIR using tap-tap-done UX (pre-filled from last session), mark set types, use an optional rest timer, and see workout duration — all persisted to SQLite.

- [x] **S04: Workout History & Body Weight** `risk:low` `depends:[S01,S03]`
  > After this: User can browse past workout sessions with full detail (exercises, sets, weights, reps, RIR), and log/view body weight entries over time.

- [x] **S05: Onboarding & Program Templates** `risk:medium` `depends:[S02]`
  > After this: First launch presents starter program templates (PPL, Upper/Lower, Full Body). User picks one and has a ready-to-use program with exercises, sets, and rep ranges pre-configured — training-ready in under 2 minutes.

- [x] **S06: Design Polish & Platform Builds** `risk:medium` `depends:[S01,S02,S03,S04,S05]`
  > After this: All screens have polished neobrutalist design, haptic feedback on key actions, dark/light mode fully wired. iOS and Android native projects are scaffolded and the app runs on both platforms.

- [x] **S07: i18n & Launch Readiness** `risk:low` `depends:[S06]`
  > After this: All user-facing text is localized in German (base) and English. App is fully functional and localized on both platforms.

## Boundary Map

### S01 → S02

Produces:
- `src/lib/db/database.ts` → SQLite connection manager (openDb, closeDb, executeQuery, runQuery)
- `src/lib/db/schema.sql` → Full schema DDL with UUID PKs, timestamps, soft delete
- `src/lib/db/repositories/exercise.ts` → ExerciseRepository (getAll, getById, search, filter, create, update, softDelete)
- `src/lib/types/exercise.ts` → Exercise, MuscleGroup, Equipment types/interfaces
- `src/lib/db/seed/exercises.ts` → Curated exercise seed data (~100 exercises)
- Exercise browse/search/filter UI routes

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Same as S01 → S02 (database layer, exercise types, repository pattern)
- `src/lib/types/common.ts` → Shared types (UUID, Timestamp, SoftDeletable)

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `src/lib/db/repositories/program.ts` → ProgramRepository (CRUD for programs, training days, exercise assignments)
- `src/lib/types/program.ts` → Program, TrainingDay, ExerciseAssignment, Mesocycle types
- `src/lib/db/schema.sql` → Program-related tables (programs, training_days, exercise_assignments, mesocycles)
- Program creation/editing UI routes

Consumes from S01:
- database.ts → openDb, executeQuery, runQuery
- exercise.ts → Exercise type, ExerciseRepository for exercise picker

### S02 → S05

Produces:
- Same as S02 → S03 (ProgramRepository, program types)
- Program creation API that templates can feed into

Consumes from S01:
- database.ts, exercise types and repository

### S03 → S04

Produces:
- `src/lib/db/repositories/workout.ts` → WorkoutRepository (createSession, addSet, completeSession, getSessionsByDate, getLastSessionForDay)
- `src/lib/types/workout.ts` → WorkoutSession, WorkoutSet, SetType types
- `src/lib/db/schema.sql` → Workout tables (workout_sessions, workout_sets)
- Active workout logging UI

Consumes from S01:
- database.ts, exercise types
Consumes from S02:
- program.ts types (Program, TrainingDay) for loading the day's template

### S04 → S06

Produces:
- Workout history list and detail views
- Body weight logging and display
- `src/lib/db/repositories/bodyweight.ts` → BodyWeightRepository (log, getAll, getRange)
- `src/lib/types/bodyweight.ts` → BodyWeightEntry type

Consumes from S01:
- database.ts, exercise types
Consumes from S03:
- workout.ts types, WorkoutRepository.getSessionsByDate

### S05 → S06

Produces:
- Onboarding flow UI
- `src/lib/data/templates/` → Program template definitions (PPL, Upper/Lower, Full Body)
- Template selection and program creation from template

Consumes from S02:
- ProgramRepository.create for creating programs from templates
Consumes from S01:
- ExerciseRepository for resolving exercise references in templates

### S06 → S07

Produces:
- Polished UI across all screens
- Native iOS + Android projects (capacitor add ios/android)
- Haptic feedback integration on key actions
- Dark/light mode fully wired
- All visual components finalized

Consumes from S01-S05:
- All existing routes and components for polish pass

### S07 (terminal)

Produces:
- Complete de.json and en.json with all UI strings
- Localized app ready for both platforms

Consumes from S06:
- Finalized UI with all text strings identified
