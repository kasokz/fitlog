/**
 * 1RM Estimation — Epley formula with guard rails.
 *
 * Pure math module with zero dependencies. Provides estimated one-rep max
 * calculation and best-e1RM selection across a set of data points.
 *
 * Guard rails:
 * - Returns null for reps > 10 (D043: Epley inaccurate beyond 10 reps)
 * - Returns weight directly for reps === 1 (1RM IS the 1RM)
 * - Returns null for null, zero, or negative inputs
 *
 * @module
 */

/**
 * Estimate one-rep max using the Epley formula: weight × (1 + reps / 30).
 *
 * @returns Estimated 1RM rounded to 1 decimal place, or null if inputs are invalid.
 */
export function estimateOneRepMax(weight: number | null, reps: number | null): number | null {
	if (weight === null || reps === null) return null;
	if (weight <= 0 || reps <= 0) return null;
	if (reps > 10) return null;
	if (reps === 1) return weight;

	const e1rm = weight * (1 + reps / 30);
	return Math.round(e1rm * 10) / 10;
}

/** Input shape for bestEstimatedOneRM — a set with weight, reps, and date. */
interface SetDataPoint {
	weight: number | null;
	reps: number | null;
	date: string;
}

/** Result of bestEstimatedOneRM — the set that produced the highest e1RM. */
interface BestE1RMResult {
	e1rm: number;
	weight: number;
	reps: number;
	date: string;
}

/**
 * Find the set with the highest estimated 1RM from a collection.
 *
 * Iterates all sets, computes e1RM for each, and returns the best one.
 * Returns null if no valid estimates exist (all inputs invalid or empty array).
 */
export function bestEstimatedOneRM(sets: SetDataPoint[]): BestE1RMResult | null {
	let best: BestE1RMResult | null = null;

	for (const set of sets) {
		const e1rm = estimateOneRepMax(set.weight, set.reps);
		if (e1rm === null) continue;

		if (best === null || e1rm > best.e1rm) {
			best = {
				e1rm,
				weight: set.weight!,
				reps: set.reps!,
				date: set.date
			};
		}
	}

	return best;
}
