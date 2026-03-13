/**
 * Deload Calculator — weight and volume reduction for deload weeks.
 *
 * Provides two functions:
 * - `isDeloadWeek` checks if the current mesocycle week is the designated deload week
 * - `calculateDeloadSets` transforms previous working sets into deloaded sets
 *   with reduced weight (~60% default) and optional volume reduction (drop last set when >3)
 *
 * Weight is rounded to the nearest 2.5kg (standard plate increment).
 * Non-working sets are filtered out (defense-in-depth).
 * Null weights pass through without modification.
 *
 * @module
 */

import type { DeloadSet } from '../../types/analytics.js';
import type { Mesocycle } from '../../types/program.js';
import type { WorkoutSet } from '../../types/workout.js';
import { SetType } from '../../types/workout.js';

/** Standard plate increment for rounding (kg) */
const PLATE_INCREMENT = 2.5;

/**
 * Round a weight to the nearest plate increment (2.5kg).
 * Example: 49.5 → 50, 48.75 → 50, 47.5 → 47.5, 60 → 60
 */
function roundToPlateIncrement(weight: number): number {
	return Math.round(weight / PLATE_INCREMENT) * PLATE_INCREMENT;
}

/**
 * Check if the current week of a mesocycle is the deload week.
 *
 * Returns `false` when `deload_week_number === 0` (deload disabled, D046).
 * Returns `true` only when `current_week === deload_week_number` and deload is enabled.
 */
export function isDeloadWeek(mesocycle: Mesocycle): boolean {
	if (mesocycle.deload_week_number === 0) return false;
	return mesocycle.current_week === mesocycle.deload_week_number;
}

/** Maximum number of working sets to keep during deload (volume reduction) */
const MAX_DELOAD_SETS = 3;

/**
 * Transform previous session's working sets into deloaded sets.
 *
 * - Filters out non-working sets (defense-in-depth)
 * - Applies `deloadFactor` to weight (default 0.6 = ~60% of original)
 * - Rounds weight to nearest 2.5kg plate increment
 * - Drops sets beyond 3 for volume reduction
 * - Null weights pass through as null
 * - Empty input returns empty array
 */
export function calculateDeloadSets(
	previousSets: WorkoutSet[],
	deloadFactor: number = 0.6
): DeloadSet[] {
	// Filter to working sets only (defense-in-depth)
	const workingSets = previousSets.filter((s) => s.set_type === SetType.WORKING);

	// Volume reduction: keep at most MAX_DELOAD_SETS sets
	const setsToUse = workingSets.length > MAX_DELOAD_SETS
		? workingSets.slice(0, MAX_DELOAD_SETS)
		: workingSets;

	return setsToUse.map((set, index) => ({
		exercise_id: set.exercise_id,
		set_number: index + 1,
		set_type: SetType.WORKING,
		weight: set.weight !== null ? roundToPlateIncrement(set.weight * deloadFactor) : null,
		reps: set.reps,
		original_weight: set.weight
	}));
}
