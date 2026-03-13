/**
 * Progression Advisor — RIR-driven weight increase suggestions.
 *
 * Analyzes recent sessions for an exercise and suggests a weight increase
 * when the athlete demonstrates readiness (low RIR across multiple sessions
 * with sufficient working sets).
 *
 * Heuristic: "≥ minSessions consecutive sessions with avg RIR ≥ minAvgRir
 * across ≥ minWorkingSetsPerSession working sets per session"
 *
 * Equipment-based weight increments ensure suggestions are practical
 * (e.g., barbell +2.5kg, dumbbell +2kg).
 *
 * @module
 */

import type { ProgressionSuggestion, ProgressionThresholds, WeightIncrement } from '../../types/analytics.js';
import type { Equipment } from '../../types/exercise.js';
import type { UUID } from '../../types/common.js';
import { AnalyticsRepository, type ExerciseSetHistory } from '../../db/repositories/analytics.js';
import { ExerciseRepository } from '../../db/repositories/exercise.js';

// ── Constants ──

/** Default thresholds for the progression heuristic. */
export const DEFAULT_THRESHOLDS: ProgressionThresholds = {
	minSessions: 2,
	minAvgRir: 2,
	minWorkingSetsPerSession: 3,
};

/** Standard weight increments per equipment type (kg). */
export const WEIGHT_INCREMENTS: WeightIncrement = {
	barbell: 2.5,
	dumbbell: 2,
	cable: 2.5,
	machine: 2.5,
	bodyweight: 0,
	kettlebell: 2.5,
	band: 2.5,
	other: 2.5,
};

// ── Helpers ──

/**
 * Find the mode (most common value) in a list of numbers.
 * Returns the first mode encountered if there are ties.
 */
function mode(values: number[]): number {
	if (values.length === 0) return 0;

	const counts = new Map<number, number>();
	let maxCount = 0;
	let modeValue = values[0];

	for (const v of values) {
		const count = (counts.get(v) ?? 0) + 1;
		counts.set(v, count);
		if (count > maxCount) {
			maxCount = count;
			modeValue = v;
		}
	}

	return modeValue;
}

/**
 * Round a weight to the nearest increment step.
 * E.g., roundToIncrement(102.3, 2.5) → 102.5
 */
function roundToIncrement(weight: number, increment: number): number {
	if (increment <= 0) return weight;
	return Math.round(weight / increment) * increment;
}

/**
 * Group sets by session ID.
 */
function groupBySession(sets: ExerciseSetHistory[]): Map<string, ExerciseSetHistory[]> {
	const grouped = new Map<string, ExerciseSetHistory[]>();
	for (const set of sets) {
		const existing = grouped.get(set.session_id) ?? [];
		existing.push(set);
		grouped.set(set.session_id, existing);
	}
	return grouped;
}

// ── Public API ──

/**
 * Get a progression suggestion for an exercise based on recent RIR data.
 *
 * Algorithm:
 * 1. Look up exercise metadata for equipment type
 * 2. Skip bodyweight exercises (D045)
 * 3. Get recent sessions and their working sets
 * 4. Verify each session has ≥ minWorkingSetsPerSession
 * 5. Calculate average RIR across all qualifying sets (null RIR excluded)
 * 6. If avg RIR ≥ minAvgRir, suggest a weight increase
 *
 * @returns ProgressionSuggestion or null if criteria aren't met
 */
export async function getProgressionSuggestion(
	exerciseId: UUID,
	thresholds?: Partial<ProgressionThresholds>
): Promise<ProgressionSuggestion | null> {
	const mergedThresholds: ProgressionThresholds = {
		...DEFAULT_THRESHOLDS,
		...thresholds,
	};

	// 1. Get exercise metadata for equipment type
	const exercise = await ExerciseRepository.getById(exerciseId);
	if (!exercise) return null;

	// 2. Skip bodyweight exercises (D045)
	if (exercise.equipment === 'bodyweight') return null;

	// 3. Get recent sessions
	const recentSessions = await AnalyticsRepository.getRecentSessionsForExercise(
		exerciseId,
		mergedThresholds.minSessions
	);

	// 4. Check we have enough sessions
	if (recentSessions.length < mergedThresholds.minSessions) return null;

	// 5. Get working sets for these sessions
	const sessionIds = recentSessions.map((s) => s.id);
	const allSets = await AnalyticsRepository.getCompletedWorkingSets(exerciseId, sessionIds);

	// Group sets by session
	const setsBySession = groupBySession(allSets);

	// 6. Verify each session has enough working sets
	for (const sessionId of sessionIds) {
		const sessionSets = setsBySession.get(sessionId) ?? [];
		if (sessionSets.length < mergedThresholds.minWorkingSetsPerSession) {
			return null;
		}
	}

	// 7. Calculate average RIR across all sets (null RIR excluded)
	const allRirValues: number[] = [];
	for (const set of allSets) {
		if (set.rir !== null) {
			allRirValues.push(set.rir);
		}
	}

	// If no sets have RIR data, we can't make a suggestion
	if (allRirValues.length === 0) return null;

	const avgRir = allRirValues.reduce((sum, v) => sum + v, 0) / allRirValues.length;

	// 8. Check RIR threshold
	if (avgRir < mergedThresholds.minAvgRir) return null;

	// 9. Calculate current weight as mode of most recent session's working sets
	// recentSessions are ordered DESC by started_at, so index 0 is the most recent
	const mostRecentSessionId = recentSessions[0].id;
	const mostRecentSets = setsBySession.get(mostRecentSessionId) ?? [];
	const weights = mostRecentSets
		.filter((s) => s.weight !== null && s.weight > 0)
		.map((s) => s.weight!);
	const currentWeight = mode(weights);

	// 10. Get increment for this equipment type
	const incrementKg = WEIGHT_INCREMENTS[exercise.equipment as Equipment];

	// 11. Calculate suggested weight, rounded to equipment increment
	const suggestedWeight = roundToIncrement(currentWeight + incrementKg, incrementKg);

	// 12. Build and return suggestion
	return {
		exercise_id: exerciseId,
		suggested_weight: suggestedWeight,
		increment_kg: incrementKg,
		current_weight: currentWeight,
		reason: `Average RIR of ${avgRir.toFixed(1)} across ${recentSessions.length} sessions indicates readiness for progression`,
		sessions_analyzed: recentSessions.length,
		avg_rir: Math.round(avgRir * 10) / 10,
	};
}
