/**
 * Dashboard Data Service — transforms raw analytics outputs into chart-ready shapes.
 *
 * Single bridge between the S01 analytics engine and chart components.
 * Chart components stay thin: data in → render.
 *
 * All date strings are converted to `Date` objects for LayerChart's `scaleUtc()` compatibility.
 * Each function logs errors with a `[Dashboard]` prefix and returns empty data on failure.
 *
 * @module
 */

import type { AnalyticsDateRange } from '../../types/analytics.js';
import type { UUID } from '../../types/common.js';
import { AnalyticsRepository } from '../../db/repositories/analytics.js';
import { ExerciseRepository } from '../../db/repositories/exercise.js';
import { estimateOneRepMax } from './oneRepMax.js';
import { getExerciseVolume } from './volumeAggregator.js';
import { dbQuery } from '../../db/database.js';

// ── Chart Point Types ──

/** Data point for estimated 1RM strength trend charts */
export interface StrengthChartPoint {
	date: Date;
	e1rm: number;
}

/** Data point for volume/tonnage trend charts */
export interface VolumeChartPoint {
	date: Date;
	totalVolume: number;
	setCount: number;
}

/** Data point for body weight trend charts */
export interface BodyWeightChartPoint {
	date: Date;
	weight: number;
}

/** Aggregate training frequency data for a date range */
export interface TrainingFrequencyData {
	totalSessions: number;
	avgPerWeek: number;
}

/** Exercise option for the exercise picker */
export interface ExerciseOption {
	id: UUID;
	name: string;
}

// ── Helpers ──

/** Extract YYYY-MM-DD date key from an ISO timestamp string. */
function toDateKey(timestamp: string): string {
	return timestamp.slice(0, 10);
}

/** Parse a YYYY-MM-DD string to a Date at midnight UTC. */
function parseDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

/** Calculate the number of weeks (fractional) between two YYYY-MM-DD date strings. */
function weeksBetween(start: string, end: string): number {
	const startDate = parseDate(start);
	const endDate = parseDate(end);
	const diffMs = endDate.getTime() - startDate.getTime();
	const weeks = diffMs / (7 * 24 * 60 * 60 * 1000);
	return Math.max(weeks, 1); // At least 1 week to avoid division by zero
}

// ── Public API ──

/**
 * Get strength chart data: best estimated 1RM per date for an exercise.
 *
 * Fetches all completed working sets, groups by date (YYYY-MM-DD),
 * computes e1RM for each set, keeps only the best per date.
 * Returns sorted ascending by date with Date objects.
 */
export async function getStrengthChartData(
	exerciseId: UUID,
	dateRange?: AnalyticsDateRange
): Promise<StrengthChartPoint[]> {
	try {
		const sets = await AnalyticsRepository.getExerciseSetsHistory(exerciseId, dateRange);

		// Group by date, keep best e1RM per date
		const bestByDate = new Map<string, number>();

		for (const set of sets) {
			const dateKey = toDateKey(set.session_started_at);
			const e1rm = estimateOneRepMax(set.weight, set.reps);
			if (e1rm === null) continue;

			const current = bestByDate.get(dateKey);
			if (current === undefined || e1rm > current) {
				bestByDate.set(dateKey, e1rm);
			}
		}

		// Convert to sorted array with Date objects
		const result: StrengthChartPoint[] = [];
		for (const [dateStr, e1rm] of bestByDate) {
			result.push({ date: parseDate(dateStr), e1rm });
		}
		result.sort((a, b) => a.date.getTime() - b.date.getTime());

		return result;
	} catch (error) {
		console.error(
			`[Dashboard] Failed to load strength chart data`,
			{ exerciseId, dateRange, error }
		);
		return [];
	}
}

/**
 * Get volume chart data: total volume and set count per date for an exercise.
 *
 * Delegates to `getExerciseVolume()` from the volume aggregator,
 * then converts date strings to Date objects for chart compatibility.
 */
export async function getVolumeChartData(
	exerciseId: UUID,
	dateRange?: AnalyticsDateRange
): Promise<VolumeChartPoint[]> {
	try {
		const volumePoints = await getExerciseVolume(exerciseId, dateRange);

		return volumePoints.map((point) => ({
			date: parseDate(point.date),
			totalVolume: point.totalVolume,
			setCount: point.setCount,
		}));
	} catch (error) {
		console.error(
			`[Dashboard] Failed to load volume chart data`,
			{ exerciseId, dateRange, error }
		);
		return [];
	}
}

/**
 * Get body weight chart data: weight entries over time.
 *
 * Fetches body weight entries within the date range and converts
 * date strings to Date objects.
 */
export async function getBodyWeightChartData(
	dateRange: AnalyticsDateRange
): Promise<BodyWeightChartPoint[]> {
	try {
		const entries = await AnalyticsRepository.getBodyWeightRange(dateRange);

		return entries.map((entry) => ({
			date: parseDate(entry.date),
			weight: entry.weight_kg,
		}));
	} catch (error) {
		console.error(
			`[Dashboard] Failed to load body weight chart data`,
			{ dateRange, error }
		);
		return [];
	}
}

/**
 * Get training frequency: total completed sessions and average per week within a date range.
 *
 * Counts completed sessions directly via SQL for efficiency (avoids paginated fetch).
 */
export async function getTrainingFrequency(
	dateRange: AnalyticsDateRange
): Promise<TrainingFrequencyData> {
	try {
		const rows = await dbQuery<{ count: number }>(
			`SELECT COUNT(*) as count
			FROM workout_sessions
			WHERE status = 'completed'
				AND deleted_at IS NULL
				AND started_at >= ?
				AND started_at <= ?`,
			[`${dateRange.start}T00:00:00`, `${dateRange.end}T23:59:59`]
		);

		const totalSessions = rows[0]?.count ?? 0;
		const weeks = weeksBetween(dateRange.start, dateRange.end);
		const avgPerWeek = Math.round((totalSessions / weeks) * 10) / 10;

		return { totalSessions, avgPerWeek };
	} catch (error) {
		console.error(
			`[Dashboard] Failed to load training frequency`,
			{ dateRange, error }
		);
		return { totalSessions: 0, avgPerWeek: 0 };
	}
}

/**
 * Get exercises that have at least one completed working set.
 *
 * Queries distinct exercise IDs from workout_sets (with the standard working-set filter),
 * then joins with exercises table for names. Returns sorted by name.
 */
export async function getExercisesWithHistory(): Promise<ExerciseOption[]> {
	try {
		const rows = await dbQuery<{ id: string; name: string }>(
			`SELECT DISTINCT e.id, e.name
			FROM exercises e
			JOIN workout_sets ws ON ws.exercise_id = e.id
			JOIN workout_sessions s ON s.id = ws.session_id
			WHERE ws.set_type = 'working'
				AND ws.completed = 1
				AND ws.deleted_at IS NULL
				AND s.status = 'completed'
				AND s.deleted_at IS NULL
				AND e.deleted_at IS NULL
			ORDER BY e.name ASC`
		);

		return rows.map((row) => ({ id: row.id, name: row.name }));
	} catch (error) {
		console.error(
			`[Dashboard] Failed to load exercises with history`,
			{ error }
		);
		return [];
	}
}
