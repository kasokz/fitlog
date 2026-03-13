/**
 * Volume Aggregation — tonnage trends per exercise, muscle group, and session.
 *
 * Computes total volume (weight × reps) from completed working sets.
 * Uses AnalyticsRepository as the data source — all working-set filtering
 * is enforced at the repository layer.
 *
 * Null weight or null reps contribute 0 to volume (skip, don't crash).
 *
 * @module
 */

import type { AnalyticsDateRange, VolumeDataPoint } from '../../types/analytics.js';
import type { MuscleGroup } from '../../types/exercise.js';
import type { UUID } from '../../types/common.js';
import { AnalyticsRepository } from '../../db/repositories/analytics.js';
import { ExerciseRepository } from '../../db/repositories/exercise.js';
import { dbQuery } from '../../db/database.js';

// ── Helpers ──

/** Extract YYYY-MM-DD date from an ISO timestamp string. */
function toDateKey(timestamp: string): string {
	return timestamp.slice(0, 10);
}

/** Calculate volume for a single set. Returns 0 if weight or reps is null. */
function setVolume(weight: number | null, reps: number | null): number {
	if (weight === null || reps === null) return 0;
	if (weight <= 0 || reps <= 0) return 0;
	return weight * reps;
}

// ── Public API ──

/**
 * Get volume data points for an exercise over time.
 *
 * Groups completed working sets by session date, calculates total volume
 * (sum of weight × reps) per date, and returns sorted ascending by date.
 */
export async function getExerciseVolume(
	exerciseId: UUID,
	dateRange?: AnalyticsDateRange
): Promise<VolumeDataPoint[]> {
	const sets = await AnalyticsRepository.getExerciseSetsHistory(exerciseId, dateRange);

	// Group by date
	const byDate = new Map<string, { totalVolume: number; setCount: number }>();

	for (const set of sets) {
		const date = toDateKey(set.session_started_at);
		const existing = byDate.get(date) ?? { totalVolume: 0, setCount: 0 };
		const vol = setVolume(set.weight, set.reps);
		existing.totalVolume += vol;
		existing.setCount += 1;
		byDate.set(date, existing);
	}

	// Convert to sorted array (ascending by date)
	const result: VolumeDataPoint[] = [];
	for (const [date, data] of byDate) {
		result.push({ date, totalVolume: data.totalVolume, setCount: data.setCount });
	}
	result.sort((a, b) => a.date.localeCompare(b.date));

	return result;
}

/**
 * Get aggregated volume data points for a muscle group over time.
 *
 * Queries all exercises matching the primary muscle group, aggregates
 * volume across all exercises per date.
 */
export async function getMuscleGroupVolume(
	muscleGroup: MuscleGroup,
	dateRange?: AnalyticsDateRange
): Promise<VolumeDataPoint[]> {
	// Get all exercises in this muscle group (primary only)
	const exercises = await ExerciseRepository.filterByMuscleGroup(muscleGroup);

	// Aggregate by date across all exercises
	const byDate = new Map<string, { totalVolume: number; setCount: number }>();

	for (const exercise of exercises) {
		const sets = await AnalyticsRepository.getExerciseSetsHistory(exercise.id, dateRange);

		for (const set of sets) {
			const date = toDateKey(set.session_started_at);
			const existing = byDate.get(date) ?? { totalVolume: 0, setCount: 0 };
			const vol = setVolume(set.weight, set.reps);
			existing.totalVolume += vol;
			existing.setCount += 1;
			byDate.set(date, existing);
		}
	}

	// Convert to sorted array (ascending by date)
	const result: VolumeDataPoint[] = [];
	for (const [date, data] of byDate) {
		result.push({ date, totalVolume: data.totalVolume, setCount: data.setCount });
	}
	result.sort((a, b) => a.date.localeCompare(b.date));

	return result;
}

/**
 * Get total tonnage for a single session.
 *
 * Sums weight × reps for all completed working sets in the session.
 * Returns 0 for sessions with no valid sets.
 */
export async function getSessionTonnage(sessionId: UUID): Promise<number> {
	type SessionSetRow = {
		weight: number | null;
		reps: number | null;
	};

	const rows = await dbQuery<SessionSetRow>(
		`SELECT ws.weight, ws.reps
		FROM workout_sets ws
		JOIN workout_sessions s ON s.id = ws.session_id
		WHERE ws.session_id = ?
			AND ws.set_type = 'working'
			AND ws.completed = 1
			AND ws.deleted_at IS NULL
			AND s.status = 'completed'
			AND s.deleted_at IS NULL`,
		[sessionId]
	);

	let total = 0;
	for (const row of rows) {
		total += setVolume(row.weight, row.reps);
	}

	return total;
}
