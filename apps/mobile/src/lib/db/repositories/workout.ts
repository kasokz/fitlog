/**
 * WorkoutRepository — typed data access for workout sessions and sets.
 *
 * Sessions track individual workout instances with status transitions:
 * in_progress → completed | cancelled. Only one in_progress session
 * is allowed at a time (concurrent session prevention).
 *
 * Sets are hard-deleted (not soft-deleted) during in-progress editing
 * since they haven't been committed yet.
 *
 * @module
 */

import type { SQLValue } from '@capgo/capacitor-fast-sql';
import { CapgoCapacitorFastSql } from '@capgo/capacitor-fast-sql';

import type {
	SetInsert,
	SetUpdate,
	SessionInsert,
	CompletedSessionSummary,
	SessionDetailWithNames,
	WorkoutSession,
	WorkoutSessionWithSets,
	WorkoutSet
} from '../../types/workout.js';
import {
	SessionStatus,
	setInsertSchema,
	setUpdateSchema,
	sessionInsertSchema
} from '../../types/workout.js';
import type { SetType } from '../../types/workout.js';
import { dbExecute, dbQuery, getDb } from '../database.js';

// ── Row types ──

type SessionRow = {
	id: string;
	program_id: string;
	training_day_id: string;
	mesocycle_id: string | null;
	mesocycle_week: number | null;
	status: string;
	started_at: string;
	completed_at: string | null;
	duration_seconds: number | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

type SetRow = {
	id: string;
	session_id: string;
	exercise_id: string;
	assignment_id: string | null;
	set_number: number;
	set_type: string;
	weight: number | null;
	reps: number | null;
	rir: number | null;
	completed: number;
	rest_seconds: number | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

// ── Row mapping ──

function rowToSession(row: SessionRow): WorkoutSession {
	return {
		id: row.id,
		program_id: row.program_id,
		training_day_id: row.training_day_id,
		mesocycle_id: row.mesocycle_id,
		mesocycle_week: row.mesocycle_week,
		status: row.status as WorkoutSession['status'],
		started_at: row.started_at,
		completed_at: row.completed_at,
		duration_seconds: row.duration_seconds,
		notes: row.notes,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

function rowToSet(row: SetRow): WorkoutSet {
	return {
		id: row.id,
		session_id: row.session_id,
		exercise_id: row.exercise_id,
		assignment_id: row.assignment_id,
		set_number: row.set_number,
		set_type: row.set_type as SetType,
		weight: row.weight,
		reps: row.reps,
		rir: row.rir,
		completed: row.completed === 1,
		rest_seconds: row.rest_seconds,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

// ── Logging ──

function log(message: string, data?: Record<string, unknown>): void {
	const entry = data ? `[Workout] ${message} ${JSON.stringify(data)}` : `[Workout] ${message}`;
	console.log(entry);
}

// ── Repository ──

export const WorkoutRepository = {
	/**
	 * Create a new workout session. Checks for concurrent in_progress sessions first.
	 * Throws if one already exists.
	 */
	async createSession(data: SessionInsert): Promise<WorkoutSession> {
		const validated = sessionInsertSchema.parse(data);

		// Check for concurrent in_progress session
		const existing = await this.getInProgressSession();
		if (existing) {
			throw new Error(
				`[WorkoutRepository] Cannot create session: concurrent in_progress session exists (${existing.id})`
			);
		}

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		await dbExecute(
			`INSERT INTO workout_sessions (id, program_id, training_day_id, mesocycle_id, mesocycle_week, status, started_at, notes, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				validated.program_id,
				validated.training_day_id,
				validated.mesocycle_id ?? null,
				validated.mesocycle_week ?? null,
				SessionStatus.IN_PROGRESS,
				now,
				validated.notes ?? null,
				now,
				now
			]
		);

		log('Session created', { sessionId: id, trainingDayId: validated.training_day_id });

		const session = await this.getSessionById(id);
		if (!session) {
			throw new Error(`[WorkoutRepository] Created session not found: ${id}`);
		}
		return session;
	},

	/**
	 * Get a session by ID with all its sets. Returns null if not found or soft-deleted.
	 */
	async getSessionById(id: string): Promise<WorkoutSessionWithSets | null> {
		const sessionRows = await dbQuery<SessionRow>(
			'SELECT * FROM workout_sessions WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		if (sessionRows.length === 0) return null;

		const session = rowToSession(sessionRows[0]);

		const setRows = await dbQuery<SetRow>(
			'SELECT * FROM workout_sets WHERE session_id = ? AND deleted_at IS NULL ORDER BY exercise_id, set_number ASC',
			[id]
		);

		return {
			...session,
			sets: setRows.map(rowToSet)
		};
	},

	/**
	 * Add a set to a workout session. Auto-assigns set_number (max+1 for that exercise in session).
	 */
	async addSet(sessionId: string, data: SetInsert): Promise<WorkoutSet> {
		const validated = setInsertSchema.parse(data);

		// Auto-assign set_number: max+1 for this exercise in this session
		const rows = await dbQuery<{ max_num: number | null }>(
			'SELECT MAX(set_number) as max_num FROM workout_sets WHERE session_id = ? AND exercise_id = ? AND deleted_at IS NULL',
			[sessionId, validated.exercise_id]
		);
		const setNumber = (rows[0]?.max_num ?? 0) + 1;

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		await dbExecute(
			`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, rest_seconds, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				sessionId,
				validated.exercise_id,
				validated.assignment_id ?? null,
				setNumber,
				validated.set_type ?? 'working',
				validated.weight ?? null,
				validated.reps ?? null,
				validated.rir ?? null,
				validated.completed ? 1 : 0,
				validated.rest_seconds ?? null,
				now,
				now
			]
		);

		const setRows = await dbQuery<SetRow>(
			'SELECT * FROM workout_sets WHERE id = ?',
			[id]
		);
		if (setRows.length === 0) {
			throw new Error(`[WorkoutRepository] Created set not found: ${id}`);
		}
		return rowToSet(setRows[0]);
	},

	/**
	 * Partial update for a workout set. Only updates provided fields.
	 */
	async updateSet(id: string, data: Omit<SetUpdate, 'id'>): Promise<WorkoutSet | null> {
		const validated = setUpdateSchema.parse({ id, ...data });

		const setClauses: string[] = [];
		const params: SQLValue[] = [];

		if (validated.set_type !== undefined) {
			setClauses.push('set_type = ?');
			params.push(validated.set_type);
		}
		if (validated.weight !== undefined) {
			setClauses.push('weight = ?');
			params.push(validated.weight ?? null);
		}
		if (validated.reps !== undefined) {
			setClauses.push('reps = ?');
			params.push(validated.reps ?? null);
		}
		if (validated.rir !== undefined) {
			setClauses.push('rir = ?');
			params.push(validated.rir ?? null);
		}
		if (validated.completed !== undefined) {
			setClauses.push('completed = ?');
			params.push(validated.completed ? 1 : 0);
		}
		if (validated.rest_seconds !== undefined) {
			setClauses.push('rest_seconds = ?');
			params.push(validated.rest_seconds ?? null);
		}

		if (setClauses.length === 0) {
			const setRows = await dbQuery<SetRow>(
				'SELECT * FROM workout_sets WHERE id = ? AND deleted_at IS NULL',
				[id]
			);
			return setRows.length > 0 ? rowToSet(setRows[0]) : null;
		}

		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());
		params.push(id);

		await dbExecute(
			`UPDATE workout_sets SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		const setRows = await dbQuery<SetRow>(
			'SELECT * FROM workout_sets WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return setRows.length > 0 ? rowToSet(setRows[0]) : null;
	},

	/**
	 * Hard-delete a set. Used for in-progress workout edits where sets haven't been committed.
	 */
	async removeSet(id: string): Promise<boolean> {
		const result = await dbExecute(
			'DELETE FROM workout_sets WHERE id = ?',
			[id]
		);
		return result.rowsAffected > 0;
	},

	/**
	 * Complete a session: sets status=completed, completed_at, and duration_seconds.
	 */
	async completeSession(id: string, durationSeconds: number): Promise<WorkoutSession | null> {
		const now = new Date().toISOString();

		await dbExecute(
			`UPDATE workout_sessions SET status = ?, completed_at = ?, duration_seconds = ?, updated_at = ?
			 WHERE id = ? AND deleted_at IS NULL`,
			[SessionStatus.COMPLETED, now, durationSeconds, now, id]
		);

		log('Session completed', { sessionId: id, durationSeconds });

		const session = await this.getSessionById(id);
		return session;
	},

	/**
	 * Get the last completed session for a training day with all its sets.
	 * Used for pre-filling the next workout. Returns null if no completed sessions exist.
	 * Sets are matched by exercise_id and ordered by set_number.
	 */
	async getLastSessionForDay(trainingDayId: string): Promise<WorkoutSessionWithSets | null> {
		const sessionRows = await dbQuery<SessionRow>(
			`SELECT * FROM workout_sessions
			 WHERE training_day_id = ? AND status = ? AND deleted_at IS NULL
			 ORDER BY completed_at DESC, rowid DESC LIMIT 1`,
			[trainingDayId, SessionStatus.COMPLETED]
		);

		if (sessionRows.length === 0) return null;

		const session = rowToSession(sessionRows[0]);

		const setRows = await dbQuery<SetRow>(
			'SELECT * FROM workout_sets WHERE session_id = ? AND deleted_at IS NULL ORDER BY exercise_id, set_number ASC',
			[session.id]
		);

		return {
			...session,
			sets: setRows.map(rowToSet)
		};
	},

	/**
	 * Get paginated list of completed sessions with training day name, exercise count, and set count.
	 * Used for workout history list views.
	 */
	async getCompletedSessions(limit = 20, offset = 0): Promise<CompletedSessionSummary[]> {
		const rows = await dbQuery<{
			id: string;
			started_at: string;
			completed_at: string;
			duration_seconds: number | null;
			training_day_name: string;
			exercise_count: number;
			total_sets: number;
		}>(
			`SELECT
				s.id,
				s.started_at,
				s.completed_at,
				s.duration_seconds,
				td.name AS training_day_name,
				(SELECT COUNT(DISTINCT ws.exercise_id) FROM workout_sets ws WHERE ws.session_id = s.id AND ws.deleted_at IS NULL) AS exercise_count,
				(SELECT COUNT(*) FROM workout_sets ws WHERE ws.session_id = s.id AND ws.deleted_at IS NULL) AS total_sets
			FROM workout_sessions s
			JOIN training_days td ON td.id = s.training_day_id
			WHERE s.status = ? AND s.deleted_at IS NULL
			ORDER BY s.completed_at DESC, s.rowid DESC
			LIMIT ? OFFSET ?`,
			[SessionStatus.COMPLETED, limit, offset]
		);

		return rows.map((row) => ({
			id: row.id,
			started_at: row.started_at,
			completed_at: row.completed_at,
			duration_seconds: row.duration_seconds,
			training_day_name: row.training_day_name,
			exercise_count: row.exercise_count,
			total_sets: row.total_sets
		}));
	},

	/**
	 * Get session detail with sets and a map of exercise IDs to exercise names.
	 * Returns null if session not found.
	 */
	async getSessionDetail(id: string): Promise<SessionDetailWithNames | null> {
		const session = await this.getSessionById(id);
		if (!session) return null;

		// Collect unique exercise IDs from sets
		const exerciseIds = [...new Set(session.sets.map((s) => s.exercise_id))];

		const exerciseNames: Record<string, string> = {};

		if (exerciseIds.length > 0) {
			const placeholders = exerciseIds.map(() => '?').join(', ');
			const exerciseRows = await dbQuery<{ id: string; name: string }>(
				`SELECT id, name FROM exercises WHERE id IN (${placeholders})`,
				exerciseIds
			);

			for (const row of exerciseRows) {
				exerciseNames[row.id] = row.name;
			}

			// Mark unknown/deleted exercises
			for (const eid of exerciseIds) {
				if (!exerciseNames[eid]) {
					exerciseNames[eid] = 'Unknown Exercise';
				}
			}
		}

		return {
			...session,
			exerciseNames
		};
	},

	/**
	 * Get any in_progress session. Returns null if none exists.
	 * Used for concurrent session prevention and session resume.
	 */
	async getInProgressSession(): Promise<WorkoutSessionWithSets | null> {
		const sessionRows = await dbQuery<SessionRow>(
			`SELECT * FROM workout_sessions
			 WHERE status = ? AND deleted_at IS NULL
			 LIMIT 1`,
			[SessionStatus.IN_PROGRESS]
		);

		if (sessionRows.length === 0) return null;

		const session = rowToSession(sessionRows[0]);

		const setRows = await dbQuery<SetRow>(
			'SELECT * FROM workout_sets WHERE session_id = ? AND deleted_at IS NULL ORDER BY exercise_id, set_number ASC',
			[session.id]
		);

		return {
			...session,
			sets: setRows.map(rowToSet)
		};
	}
};
