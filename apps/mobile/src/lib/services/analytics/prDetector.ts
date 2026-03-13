/**
 * PR Detection — 3-category personal record detection.
 *
 * Detects weight PRs, rep PRs, and estimated 1RM PRs by comparing new sets
 * against historical data. Uses AnalyticsRepository for history access and
 * estimateOneRepMax for e1RM comparison.
 *
 * PR categories:
 * - weight_pr: new set has higher weight than any historical set
 * - rep_pr: new set has higher reps at same or higher weight than historical best at that weight
 * - e1rm_pr: new set produces higher estimated 1RM than any historical set (reps ≤ 10 only)
 *
 * @module
 */

import type { PR } from '../../types/analytics.js';
import type { UUID } from '../../types/common.js';
import type { WorkoutSet } from '../../types/workout.js';
import { AnalyticsRepository } from '../../db/repositories/analytics.js';
import { estimateOneRepMax } from './oneRepMax.js';

/** The three PR categories */
export type PRType = 'weight_pr' | 'rep_pr' | 'e1rm_pr';

// ── Helpers ──

/** Filter to only completed working sets (defense in depth). */
function filterWorkingSets(sets: WorkoutSet[]): WorkoutSet[] {
	return sets.filter((s) => s.set_type === 'working' && s.completed === true);
}

// ── Core Detection ──

/**
 * Detect PRs by comparing new completed working sets against historical completed working sets.
 *
 * Both inputs are filtered to working + completed as defense in depth.
 * A single set can trigger multiple PR types simultaneously.
 *
 * @param exerciseId - The exercise these sets belong to
 * @param newSets - Sets from the current/new session
 * @param historicalSets - All prior completed working sets for this exercise
 * @returns Array of detected PR objects
 */
export function detectPRs(
	exerciseId: UUID,
	newSets: WorkoutSet[],
	historicalSets: WorkoutSet[]
): PR[] {
	const filteredNew = filterWorkingSets(newSets);
	const filteredHistory = filterWorkingSets(historicalSets);

	// Pre-compute historical bests
	let histMaxWeight = -Infinity;
	let histMaxE1RM = -Infinity;
	// Map: for each weight level, track the max reps achieved
	const histMaxRepsByWeight = new Map<number, number>();

	for (const set of filteredHistory) {
		if (set.weight !== null && set.weight > 0) {
			histMaxWeight = Math.max(histMaxWeight, set.weight);
		}

		if (set.weight !== null && set.reps !== null && set.weight > 0 && set.reps > 0) {
			const current = histMaxRepsByWeight.get(set.weight) ?? 0;
			if (set.reps > current) {
				histMaxRepsByWeight.set(set.weight, set.reps);
			}
		}

		const e1rm = estimateOneRepMax(set.weight, set.reps);
		if (e1rm !== null) {
			histMaxE1RM = Math.max(histMaxE1RM, e1rm);
		}
	}

	const prs: PR[] = [];

	for (const set of filteredNew) {
		// Weight PR: new set has higher weight than any historical set
		if (set.weight !== null && set.weight > 0 && set.weight > histMaxWeight) {
			prs.push({
				id: crypto.randomUUID(),
				exercise_id: exerciseId,
				type: 'weight_pr',
				value: set.weight,
				weight: set.weight,
				reps: set.reps ?? 0,
				date: '',
				session_id: set.session_id
			});
		}

		// Rep PR: new set has higher reps at same or higher weight than any historical set at that weight
		if (set.weight !== null && set.reps !== null && set.weight > 0 && set.reps > 0) {
			let isRepPR = false;

			// Check against each historical weight level that is ≤ the new set's weight
			// A rep PR means: at this weight (or higher), we got more reps than ever before
			// Simpler interpretation: at the SAME weight, more reps than the historical best
			const histBestReps = histMaxRepsByWeight.get(set.weight) ?? 0;
			if (set.reps > histBestReps) {
				// Also check: no historical set at a HIGHER weight had these or more reps
				// (that would mean this isn't truly a rep record)
				// Actually, per spec: "new set has higher reps at the same or higher weight than any historical set at that weight"
				// This means: we compare the new set against historical sets at the same weight.
				// If the new set's reps exceed the historical max reps at the same weight, it's a rep PR.
				isRepPR = true;
			}

			if (isRepPR) {
				prs.push({
					id: crypto.randomUUID(),
					exercise_id: exerciseId,
					type: 'rep_pr',
					value: set.reps,
					weight: set.weight,
					reps: set.reps,
					date: '',
					session_id: set.session_id
				});
			}
		}

		// e1RM PR: new set produces higher estimated 1RM than any historical set (reps ≤ 10 only)
		const newE1RM = estimateOneRepMax(set.weight, set.reps);
		if (newE1RM !== null && newE1RM > histMaxE1RM) {
			prs.push({
				id: crypto.randomUUID(),
				exercise_id: exerciseId,
				type: 'e1rm_pr',
				value: newE1RM,
				weight: set.weight ?? 0,
				reps: set.reps ?? 0,
				date: '',
				session_id: set.session_id
			});
		}
	}

	return prs;
}

// ── History ──

/**
 * Compute the full PR history for an exercise by processing all historical sets chronologically.
 *
 * For each set, checks if it was a PR relative to all sets that came before it.
 * Returns a chronological list of all PRs ever achieved.
 *
 * Uses AnalyticsRepository.getExerciseSetsHistory() which returns sets ordered
 * by session date DESC — we reverse to process chronologically.
 */
export async function getPRHistory(exerciseId: UUID): Promise<PR[]> {
	const allSets = await AnalyticsRepository.getExerciseSetsHistory(exerciseId);

	// Reverse to chronological order (repo returns DESC)
	const chronological = [...allSets].reverse();

	// Running bests
	let maxWeight = -Infinity;
	let maxE1RM = -Infinity;
	const maxRepsByWeight = new Map<number, number>();

	const prs: PR[] = [];

	for (const set of chronological) {
		const weight = set.weight;
		const reps = set.reps;

		// Weight PR
		if (weight !== null && weight > 0 && weight > maxWeight) {
			prs.push({
				id: crypto.randomUUID(),
				exercise_id: exerciseId,
				type: 'weight_pr',
				value: weight,
				weight,
				reps: reps ?? 0,
				date: set.session_started_at,
				session_id: set.session_id
			});
			maxWeight = weight;
		} else if (weight !== null && weight > 0) {
			maxWeight = Math.max(maxWeight, weight);
		}

		// Rep PR at this weight
		if (weight !== null && reps !== null && weight > 0 && reps > 0) {
			const bestReps = maxRepsByWeight.get(weight) ?? 0;
			if (reps > bestReps) {
				prs.push({
					id: crypto.randomUUID(),
					exercise_id: exerciseId,
					type: 'rep_pr',
					value: reps,
					weight,
					reps,
					date: set.session_started_at,
					session_id: set.session_id
				});
				maxRepsByWeight.set(weight, reps);
			} else {
				maxRepsByWeight.set(weight, Math.max(bestReps, reps));
			}
		}

		// e1RM PR
		const e1rm = estimateOneRepMax(weight, reps);
		if (e1rm !== null && e1rm > maxE1RM) {
			prs.push({
				id: crypto.randomUUID(),
				exercise_id: exerciseId,
				type: 'e1rm_pr',
				value: e1rm,
				weight: weight ?? 0,
				reps: reps ?? 0,
				date: set.session_started_at,
				session_id: set.session_id
			});
			maxE1RM = e1rm;
		} else if (e1rm !== null) {
			maxE1RM = Math.max(maxE1RM, e1rm);
		}
	}

	return prs;
}
