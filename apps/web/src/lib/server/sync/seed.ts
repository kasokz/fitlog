/**
 * Server-side seed exercise ID generator.
 *
 * Produces a Map<name, deterministic UUID> for all curated seed exercises.
 * Used by the push endpoint to recognize seed exercise IDs as valid.
 *
 * The exercise list must stay in sync with apps/mobile/src/lib/db/seed/exercises.ts.
 *
 * @module
 */

import { uuidv5 } from "./uuid-v5";

/**
 * All seed exercise names — canonical list matching the mobile seed data.
 * Sorted by muscle group, same order as mobile seed.
 */
const SEED_EXERCISE_NAMES = [
	// Chest
	"Bench Press",
	"Incline Bench Press",
	"Dumbbell Fly",
	"Cable Crossover",
	"Push-Up",
	"Chest Dip",
	// Back
	"Deadlift",
	"Barbell Row",
	"Pull-Up",
	"Lat Pulldown",
	"Cable Row",
	"Dumbbell Row",
	"T-Bar Row",
	"Face Pull",
	// Shoulders
	"Overhead Press",
	"Lateral Raise",
	"Front Raise",
	"Reverse Fly",
	"Arnold Press",
	"Upright Row",
	// Biceps
	"Barbell Curl",
	"Dumbbell Curl",
	"Hammer Curl",
	"Cable Curl",
	// Triceps
	"Tricep Pushdown",
	"Overhead Tricep Extension",
	"Skull Crusher",
	"Close-Grip Bench Press",
	// Quadriceps
	"Squat",
	"Front Squat",
	"Leg Press",
	"Leg Extension",
	"Bulgarian Split Squat",
	// Hamstrings
	"Romanian Deadlift",
	"Leg Curl",
	"Nordic Curl",
	"Good Morning",
	// Glutes
	"Hip Thrust",
	"Glute Bridge",
	"Cable Kickback",
	"Step-Up",
	// Calves
	"Standing Calf Raise",
	"Seated Calf Raise",
	// Abs
	"Hanging Leg Raise",
	"Cable Crunch",
	"Plank",
	"Ab Wheel Rollout",
	// Forearms
	"Wrist Curl",
	"Reverse Wrist Curl",
	// Full Body
	"Clean and Press",
	"Thruster",
	// Kettlebell / Band
	"Kettlebell Swing",
	"Kettlebell Goblet Squat",
	"Band Pull-Apart",
	"Band Face Pull",
] as const;

/** Cached result — generated once per process. */
let cached: Map<string, string> | null = null;

/**
 * Returns a Map of exercise name → deterministic UUID v5.
 * Result is cached after first call (UUIDs are deterministic, no need to recompute).
 */
export async function getSeedExerciseIds(): Promise<Map<string, string>> {
	if (cached) return cached;

	const map = new Map<string, string>();
	for (const name of SEED_EXERCISE_NAMES) {
		map.set(name, await uuidv5(name));
	}
	cached = map;
	return map;
}

/**
 * Returns a Set of all seed exercise UUIDs for quick membership checks.
 */
export async function getSeedExerciseIdSet(): Promise<Set<string>> {
	const map = await getSeedExerciseIds();
	return new Set(map.values());
}
