/**
 * AnalyticsRepository — read-only SQL query layer for analytics computations.
 *
 * Every query enforces the working-set filter:
 *   set_type='working' AND completed=1 AND deleted_at IS NULL
 * as the single source of truth for analytics data.
 *
 * Consumed by all 5 analytics services:
 * - 1RM estimation
 * - PR detection
 * - Volume aggregation
 * - Progression advisor
 * - Deload calculator
 *
 * @module
 */

import type { SQLValue } from '@capgo/capacitor-fast-sql';

import type { AnalyticsDateRange } from '../../types/analytics.js';
import type { UUID } from '../../types/common.js';
import { dbQuery } from '../database.js';

// ── Internal row types ──

/** Raw row from the exercise sets history query */
type ExerciseSetHistoryRow = {
	id: string;
	session_id: string;
	exercise_id: string;
	set_number: number;
	set_type: string;
	weight: number | null;
	reps: number | null;
	rir: number | null;
	completed: number;
	session_started_at: string;
};

/** Raw row from the session ID query */
type SessionIdRow = {
	id: string;
	started_at: string;
};

/** Raw row from the body weight query */
type BodyWeightRow = {
	id: string;
	date: string;
	weight_kg: number;
};

// ── Public result types ──

/** A completed working set with its session timestamp */
export interface ExerciseSetHistory {
	id: string;
	session_id: string;
	exercise_id: string;
	set_number: number;
	set_type: string;
	weight: number | null;
	reps: number | null;
	rir: number | null;
	completed: boolean;
	session_started_at: string;
}

/** A session reference with its start timestamp */
export interface SessionReference {
	id: string;
	started_at: string;
}

/** A body weight entry for analytics */
export interface BodyWeightEntry {
	id: string;
	date: string;
	weight_kg: number;
}

// ── Row mapping ──

function rowToExerciseSetHistory(row: ExerciseSetHistoryRow): ExerciseSetHistory {
	return {
		id: row.id,
		session_id: row.session_id,
		exercise_id: row.exercise_id,
		set_number: row.set_number,
		set_type: row.set_type,
		weight: row.weight,
		reps: row.reps,
		rir: row.rir,
		completed: row.completed === 1,
		session_started_at: row.session_started_at,
	};
}

function rowToSessionReference(row: SessionIdRow): SessionReference {
	return {
		id: row.id,
		started_at: row.started_at,
	};
}

function rowToBodyWeightEntry(row: BodyWeightRow): BodyWeightEntry {
	return {
		id: row.id,
		date: row.date,
		weight_kg: row.weight_kg,
	};
}

// ── Working-set filter (shared WHERE clause fragment) ──

/**
 * Core working-set filter applied to all set queries.
 * Ensures only completed working sets from completed sessions are included.
 */
const WORKING_SET_FILTER = `
	ws.set_type = 'working'
	AND ws.completed = 1
	AND ws.deleted_at IS NULL
	AND s.status = 'completed'
	AND s.deleted_at IS NULL
`;

// ── Repository ──

export const AnalyticsRepository = {
	/**
	 * Get all completed working sets for an exercise, ordered by session date DESC
	 * then set_number ASC.
	 *
	 * JOINs workout_sessions for the started_at timestamp.
	 * Optionally filters by date range (inclusive, using timestamp boundaries).
	 */
	async getExerciseSetsHistory(
		exerciseId: UUID,
		dateRange?: AnalyticsDateRange
	): Promise<ExerciseSetHistory[]> {
		const params: SQLValue[] = [exerciseId];

		let dateFilter = '';
		if (dateRange) {
			dateFilter = `AND s.started_at >= ? AND s.started_at <= ?`;
			params.push(`${dateRange.start}T00:00:00`, `${dateRange.end}T23:59:59`);
		}

		const rows = await dbQuery<ExerciseSetHistoryRow>(
			`SELECT
				ws.id,
				ws.session_id,
				ws.exercise_id,
				ws.set_number,
				ws.set_type,
				ws.weight,
				ws.reps,
				ws.rir,
				ws.completed,
				s.started_at AS session_started_at
			FROM workout_sets ws
			JOIN workout_sessions s ON s.id = ws.session_id
			WHERE ws.exercise_id = ?
				AND ${WORKING_SET_FILTER}
				${dateFilter}
			ORDER BY s.started_at DESC, ws.set_number ASC`,
			params
		);

		return rows.map(rowToExerciseSetHistory);
	},

	/**
	 * Get completed working sets for an exercise within specific sessions.
	 *
	 * Used by PR detector and progression advisor.
	 * Orders by session started_at ASC, then set_number ASC.
	 */
	async getCompletedWorkingSets(
		exerciseId: UUID,
		sessionIds: UUID[]
	): Promise<ExerciseSetHistory[]> {
		if (sessionIds.length === 0) return [];

		const placeholders = sessionIds.map(() => '?').join(', ');
		const params: SQLValue[] = [exerciseId, ...sessionIds];

		const rows = await dbQuery<ExerciseSetHistoryRow>(
			`SELECT
				ws.id,
				ws.session_id,
				ws.exercise_id,
				ws.set_number,
				ws.set_type,
				ws.weight,
				ws.reps,
				ws.rir,
				ws.completed,
				s.started_at AS session_started_at
			FROM workout_sets ws
			JOIN workout_sessions s ON s.id = ws.session_id
			WHERE ws.exercise_id = ?
				AND ws.session_id IN (${placeholders})
				AND ${WORKING_SET_FILTER}
			ORDER BY s.started_at ASC, ws.set_number ASC`,
			params
		);

		return rows.map(rowToExerciseSetHistory);
	},

	/**
	 * Get the N most recent completed session IDs that contain at least one
	 * completed working set for the given exercise.
	 *
	 * Uses rowid DESC as a tiebreaker (D028) for sessions with identical started_at.
	 */
	async getRecentSessionsForExercise(
		exerciseId: UUID,
		count: number
	): Promise<SessionReference[]> {
		const rows = await dbQuery<SessionIdRow>(
			`SELECT DISTINCT s.id, s.started_at
			FROM workout_sessions s
			JOIN workout_sets ws ON ws.session_id = s.id
			WHERE ws.exercise_id = ?
				AND ${WORKING_SET_FILTER}
			ORDER BY s.started_at DESC, s.rowid DESC
			LIMIT ?`,
			[exerciseId, count]
		);

		return rows.map(rowToSessionReference);
	},

	/**
	 * Get body weight entries in ascending date order within a date range.
	 *
	 * Filters deleted_at IS NULL. Uses YYYY-MM-DD date comparison.
	 */
	async getBodyWeightRange(dateRange: AnalyticsDateRange): Promise<BodyWeightEntry[]> {
		const rows = await dbQuery<BodyWeightRow>(
			`SELECT id, date, weight_kg
			FROM body_weight_entries
			WHERE date >= ? AND date <= ?
				AND deleted_at IS NULL
			ORDER BY date ASC`,
			[dateRange.start, dateRange.end]
		);

		return rows.map(rowToBodyWeightEntry);
	},
};
