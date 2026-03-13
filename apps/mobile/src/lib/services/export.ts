/**
 * Export Service — generates CSV and JSON exports of user data.
 *
 * Pure async functions that query SQLite via `dbQuery` and return formatted strings.
 * CSV escaping follows RFC 4180. All queries filter soft-deleted rows.
 *
 * @module
 */

import { dbQuery } from '../db/database.js';
import type { SQLValue } from '@capgo/capacitor-fast-sql';

// ── CSV Helpers ──

/**
 * Escape a value for CSV output per RFC 4180.
 *
 * - null/undefined → empty string
 * - Values containing commas, double quotes, or newlines are wrapped in double quotes
 * - Double quotes within values are escaped by doubling them
 */
export function escapeCSV(value: SQLValue | null | undefined): string {
	if (value === null || value === undefined) return '';

	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Format an array of values into a single CSV row (with trailing newline).
 */
export function formatCSVRow(values: (SQLValue | null | undefined)[]): string {
	return values.map(escapeCSV).join(',') + '\n';
}

// ── Workout CSV ──

const WORKOUT_CSV_HEADERS = [
	'Date',
	'Program',
	'Training Day',
	'Exercise',
	'Set #',
	'Set Type',
	'Weight (kg)',
	'Reps',
	'RIR',
	'Completed'
];

/**
 * Generate a denormalized CSV of all completed workout sessions.
 *
 * Joins sessions → sets → exercises (LEFT JOIN so deleted exercises show as
 * "Unknown Exercise"). Filters: `deleted_at IS NULL` on sessions/sets,
 * `status = 'completed'` on sessions. Orders by date DESC, then set number.
 */
export async function generateWorkoutCSV(): Promise<string> {
	const rows = await dbQuery<{
		date: string;
		program_name: string | null;
		training_day_name: string | null;
		exercise_name: string | null;
		set_number: number;
		set_type: string;
		weight: number | null;
		reps: number | null;
		rir: number | null;
		completed: number;
	}>(
		`SELECT
			ws.started_at AS date,
			p.name AS program_name,
			td.name AS training_day_name,
			COALESCE(e.name, 'Unknown Exercise') AS exercise_name,
			wset.set_number,
			wset.set_type,
			wset.weight,
			wset.reps,
			wset.rir,
			wset.completed
		FROM workout_sessions ws
		JOIN workout_sets wset ON wset.session_id = ws.id AND wset.deleted_at IS NULL
		LEFT JOIN exercises e ON e.id = wset.exercise_id AND e.deleted_at IS NULL
		LEFT JOIN programs p ON p.id = ws.program_id AND p.deleted_at IS NULL
		LEFT JOIN training_days td ON td.id = ws.training_day_id AND td.deleted_at IS NULL
		WHERE ws.deleted_at IS NULL
		  AND ws.status = 'completed'
		ORDER BY ws.started_at DESC, wset.set_number ASC`
	);

	let csv = formatCSVRow(WORKOUT_CSV_HEADERS);
	for (const row of rows) {
		csv += formatCSVRow([
			row.date,
			row.program_name,
			row.training_day_name,
			row.exercise_name,
			row.set_number,
			row.set_type,
			row.weight,
			row.reps,
			row.rir,
			row.completed
		]);
	}

	return csv;
}

// ── Body Weight CSV ──

const BODY_WEIGHT_CSV_HEADERS = ['Date', 'Weight (kg)'];

/**
 * Generate a CSV of all body weight entries.
 * Filters soft-deleted rows. Orders by date DESC.
 */
export async function generateBodyWeightCSV(): Promise<string> {
	const rows = await dbQuery<{ date: string; weight_kg: number }>(
		`SELECT date, weight_kg
		FROM body_weight_entries
		WHERE deleted_at IS NULL
		ORDER BY date DESC`
	);

	let csv = formatCSVRow(BODY_WEIGHT_CSV_HEADERS);
	for (const row of rows) {
		csv += formatCSVRow([row.date, row.weight_kg]);
	}

	return csv;
}

// ── Full JSON Export ──

interface ExportJSON {
	exported_at: string;
	version: number;
	exercises: Record<string, SQLValue>[];
	programs: (Record<string, SQLValue> & {
		training_days: (Record<string, SQLValue> & {
			assignments: Record<string, SQLValue>[];
		})[];
	})[];
	mesocycles: Record<string, SQLValue>[];
	workout_sessions: (Record<string, SQLValue> & {
		sets: Record<string, SQLValue>[];
	})[];
	body_weight_entries: Record<string, SQLValue>[];
}

/**
 * Generate a full JSON export of all user data.
 *
 * Produces a nested, self-contained structure:
 * - Programs contain their training_days, which contain their assignments (with exercise names)
 * - Workout sessions contain their sets (with exercise names)
 * - All entity types included for complete backup/portability
 *
 * Soft-deleted rows are excluded from all arrays.
 */
export async function generateFullJSON(): Promise<string> {
	const [exercises, programs, trainingDays, assignments, mesocycles, sessions, sets, bodyWeight] =
		await Promise.all([
			dbQuery(
				`SELECT id, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, is_compound, created_at, updated_at
				FROM exercises WHERE deleted_at IS NULL ORDER BY name`
			),
			dbQuery(
				`SELECT id, name, description, created_at, updated_at
				FROM programs WHERE deleted_at IS NULL ORDER BY created_at`
			),
			dbQuery(
				`SELECT id, program_id, name, sort_order, created_at, updated_at
				FROM training_days WHERE deleted_at IS NULL ORDER BY sort_order`
			),
			dbQuery(
				`SELECT ea.id, ea.training_day_id, ea.exercise_id, ea.sort_order, ea.target_sets, ea.min_reps, ea.max_reps, ea.created_at, ea.updated_at,
					COALESCE(e.name, 'Unknown Exercise') AS exercise_name
				FROM exercise_assignments ea
				LEFT JOIN exercises e ON e.id = ea.exercise_id AND e.deleted_at IS NULL
				WHERE ea.deleted_at IS NULL
				ORDER BY ea.sort_order`
			),
			dbQuery(
				`SELECT id, program_id, weeks_count, deload_week_number, start_date, current_week, created_at, updated_at
				FROM mesocycles WHERE deleted_at IS NULL ORDER BY created_at`
			),
			dbQuery(
				`SELECT id, program_id, training_day_id, mesocycle_id, mesocycle_week, status, started_at, completed_at, duration_seconds, notes, created_at, updated_at
				FROM workout_sessions WHERE deleted_at IS NULL ORDER BY started_at DESC`
			),
			dbQuery(
				`SELECT ws.id, ws.session_id, ws.exercise_id, ws.assignment_id, ws.set_number, ws.set_type, ws.weight, ws.reps, ws.rir, ws.completed, ws.rest_seconds, ws.created_at, ws.updated_at,
					COALESCE(e.name, 'Unknown Exercise') AS exercise_name
				FROM workout_sets ws
				LEFT JOIN exercises e ON e.id = ws.exercise_id AND e.deleted_at IS NULL
				WHERE ws.deleted_at IS NULL
				ORDER BY ws.set_number`
			),
			dbQuery(
				`SELECT id, date, weight_kg, created_at, updated_at
				FROM body_weight_entries WHERE deleted_at IS NULL ORDER BY date DESC`
			)
		]);

	// Build nested programs → training_days → assignments
	const assignmentsByDay = new Map<string, Record<string, SQLValue>[]>();
	for (const a of assignments) {
		const dayId = a.training_day_id as string;
		if (!assignmentsByDay.has(dayId)) assignmentsByDay.set(dayId, []);
		assignmentsByDay.get(dayId)!.push(a);
	}

	const daysByProgram = new Map<
		string,
		(Record<string, SQLValue> & { assignments: Record<string, SQLValue>[] })[]
	>();
	for (const td of trainingDays) {
		const programId = td.program_id as string;
		if (!daysByProgram.has(programId)) daysByProgram.set(programId, []);
		daysByProgram.get(programId)!.push({
			...td,
			assignments: assignmentsByDay.get(td.id as string) ?? []
		});
	}

	const nestedPrograms = programs.map((p) => ({
		...p,
		training_days: daysByProgram.get(p.id as string) ?? []
	}));

	// Build nested sessions → sets
	const setsBySession = new Map<string, Record<string, SQLValue>[]>();
	for (const s of sets) {
		const sessionId = s.session_id as string;
		if (!setsBySession.has(sessionId)) setsBySession.set(sessionId, []);
		setsBySession.get(sessionId)!.push(s);
	}

	const nestedSessions = sessions.map((s) => ({
		...s,
		sets: setsBySession.get(s.id as string) ?? []
	}));

	const exportData: ExportJSON = {
		exported_at: new Date().toISOString(),
		version: 1,
		exercises,
		programs: nestedPrograms,
		mesocycles,
		workout_sessions: nestedSessions,
		body_weight_entries: bodyWeight
	};

	return JSON.stringify(exportData, null, 2);
}
