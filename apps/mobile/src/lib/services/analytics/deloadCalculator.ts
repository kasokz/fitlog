/**
 * Deload Calculator — weight and volume reduction for deload weeks.
 *
 * Provides three main functions:
 * - `isDeloadWeek` checks if the current mesocycle week is the designated deload week
 * - `calculateDeloadSets` transforms previous working sets into deloaded sets
 *   with reduced weight (~60% default) and optional volume reduction (drop last set when >3)
 * - `applyDeloadTransform` takes candidate sets (pre-fill data) and a mesocycle,
 *   returns transformed sets when in a deload week — the integration point for workout start
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

// ── Candidate Set — pre-fill intermediate type ──

/** A set prepared for pre-fill before writing to the DB */
export interface CandidateSet {
	exercise_id: string;
	assignment_id: string | null;
	set_type: string;
	weight: number | null;
	reps: number | null;
	rir: number | null;
}

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

// ── Pre-fill deload transform ──

/**
 * Apply deload transformation to candidate sets when the mesocycle is in its deload week.
 *
 * This is the integration point between the workout start pre-fill and the deload calculator.
 * When `isDeloadWeek(mesocycle)` is true, candidate sets are grouped by exercise_id,
 * each group is transformed via `calculateDeloadSets()`, and the results are mapped back
 * to CandidateSet format for writing to the DB.
 *
 * When not in a deload week (or mesocycle is null), returns the original sets unchanged.
 *
 * @param candidates — pre-fill sets collected from either the last-session or template branch
 * @param mesocycle — current mesocycle state (null if no mesocycle configured)
 * @returns transformed candidate sets (deloaded or unchanged)
 */
export function applyDeloadTransform(
	candidates: CandidateSet[],
	mesocycle: Mesocycle | null
): CandidateSet[] {
	// No mesocycle or not a deload week → pass through unchanged
	if (!mesocycle || !isDeloadWeek(mesocycle)) {
		return candidates;
	}

	// Group candidates by exercise_id (preserving order)
	const grouped = new Map<string, CandidateSet[]>();
	for (const c of candidates) {
		const group = grouped.get(c.exercise_id);
		if (group) {
			group.push(c);
		} else {
			grouped.set(c.exercise_id, [c]);
		}
	}

	// Transform each exercise group through calculateDeloadSets
	const result: CandidateSet[] = [];
	for (const [exerciseId, group] of grouped) {
		// Build WorkoutSet-shaped objects for calculateDeloadSets
		const asWorkoutSets = group.map((c, i) => ({
			id: '',
			session_id: '',
			exercise_id: c.exercise_id,
			assignment_id: c.assignment_id,
			set_number: i + 1,
			set_type: c.set_type as WorkoutSet['set_type'],
			weight: c.weight,
			reps: c.reps,
			rir: c.rir,
			completed: false,
			rest_seconds: null,
			deleted_at: null
		})) satisfies WorkoutSet[];

		const deloadSets = calculateDeloadSets(asWorkoutSets);

		// Map DeloadSet back to CandidateSet, preserving assignment_id from original group
		for (const ds of deloadSets) {
			// Find matching original candidate for assignment_id lookup
			const originalIdx = ds.set_number - 1;
			const original = group[originalIdx];
			result.push({
				exercise_id: ds.exercise_id,
				assignment_id: original?.assignment_id ?? null,
				set_type: ds.set_type,
				weight: ds.weight,
				reps: ds.reps,
				rir: null // Deload sets don't carry RIR targets
			});
		}
	}

	return result;
}
