---
estimated_steps: 4
estimated_files: 3
---

# T03: Create curated exercise seed data and seeding mechanism

**Slice:** S01 — Data Layer & Exercise Library
**Milestone:** M001

## Description

Create ~60 curated exercises covering all major muscle groups and equipment types, and wire the seeding mechanism into the database initialization flow. The seed data is the content that makes the exercise library immediately useful — without it, users face an empty library. Exercises must cover compound and isolation movements across barbell, dumbbell, cable, machine, and bodyweight categories.

## Steps

1. **Create seed data** in `src/lib/db/seed/exercises.ts`: Define ~60 exercises as an array of objects with: name, description (brief movement cue, 1-2 sentences), muscle_group (primary), secondary_muscle_groups (array), equipment, is_compound (boolean). Organize by muscle group to ensure coverage:
   - **Chest** (~6): Bench Press, Incline Bench Press, Dumbbell Fly, Cable Crossover, Push-Up, Chest Dip
   - **Back** (~8): Deadlift, Barbell Row, Pull-Up, Lat Pulldown, Cable Row, Dumbbell Row, T-Bar Row, Face Pull
   - **Shoulders** (~6): Overhead Press, Lateral Raise, Front Raise, Reverse Fly, Arnold Press, Upright Row
   - **Biceps** (~4): Barbell Curl, Dumbbell Curl, Hammer Curl, Cable Curl
   - **Triceps** (~4): Tricep Pushdown, Overhead Tricep Extension, Skull Crusher, Close-Grip Bench Press
   - **Quadriceps** (~5): Squat, Front Squat, Leg Press, Leg Extension, Bulgarian Split Squat
   - **Hamstrings** (~4): Romanian Deadlift, Leg Curl, Nordic Curl, Good Morning
   - **Glutes** (~4): Hip Thrust, Glute Bridge, Cable Kickback, Step-Up
   - **Calves** (~2): Standing Calf Raise, Seated Calf Raise
   - **Abs** (~4): Hanging Leg Raise, Cable Crunch, Plank, Ab Wheel Rollout
   - **Forearms** (~2): Wrist Curl, Reverse Wrist Curl
   - **Full Body** (~2): Clean and Press, Thruster
   Export as a typed array and a `seedExercises(db)` function that uses `executeBatch()` within a transaction for efficient bulk insert.

2. **Wire seeding into database initialization** in `database.ts`: After schema migration, check if exercises table is empty (`SELECT COUNT(*) FROM exercises`). If empty, call `seedExercises()`. This ensures seed data loads on first launch but doesn't re-seed if user has already modified data.

3. **Add seed verification test** in `exercise-repository.test.ts`: Add a test suite that verifies: seed data loads, exercise count is approximately 60, all muscle groups are represented, all equipment types are represented, exercises have descriptions, secondary muscle groups are properly parsed as arrays.

4. **Verify exercise names are English** (display names — the app will show these directly; i18n for exercise names is out of scope for S01 since exercise names are typically used as-is in fitness contexts even in German-speaking markets).

## Must-Haves

- [ ] ~60 curated exercises covering all MuscleGroup enum values
- [ ] Mix of equipment types (barbell, dumbbell, cable, machine, bodyweight, kettlebell)
- [ ] Each exercise has description, primary muscle group, secondary muscle groups, equipment, is_compound flag
- [ ] `seedExercises()` uses `executeBatch()` in a transaction for performance
- [ ] Seeding wired into database init (only seeds if exercises table is empty)
- [ ] Test verifies seed data loads correctly with proper muscle group and equipment coverage

## Verification

- `pnpm --filter mobile test -- --run` — seed tests pass
- Test confirms: exercise count ≥ 55, all MuscleGroup values have at least one exercise, all Equipment values have at least one exercise

## Observability Impact

- Signals added/changed: Console log `[DB] Seeding X exercises` when seed runs; skips silently if table already has data
- How a future agent inspects this: `ExerciseRepository.getAll()` returns all seeded exercises; `getCount()` returns total count
- Failure state exposed: Seed failures throw with batch operation context; partial seeds are rolled back via transaction

## Inputs

- `src/lib/db/database.ts` — `getDb()`, `dbExecute()` from T01 (will be modified to add seed-on-init)
- `src/lib/db/repositories/exercise.ts` — ExerciseRepository for test verification from T02
- `src/lib/types/exercise.ts` — MuscleGroup, Equipment enums from T01

## Expected Output

- `apps/mobile/src/lib/db/seed/exercises.ts` — curated exercise data + `seedExercises()` function
- `apps/mobile/src/lib/db/database.ts` — updated with seed-on-first-open logic
- `apps/mobile/src/lib/db/__tests__/exercise-repository.test.ts` — updated with seed verification tests
