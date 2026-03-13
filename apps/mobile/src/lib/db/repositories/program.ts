/**
 * ProgramRepository — typed data access for programs, training days,
 * exercise assignments, and mesocycles.
 *
 * All read methods exclude soft-deleted rows.
 * Create/update validate inputs with Zod before touching the database.
 * Multi-table inserts use transactions for atomicity.
 *
 * @module
 */

import type { SQLValue } from '@capgo/capacitor-fast-sql';
import { CapgoCapacitorFastSql } from '@capgo/capacitor-fast-sql';

import type {
	ExerciseAssignment,
	ExerciseAssignmentInsert,
	ExerciseAssignmentUpdate,
	Mesocycle,
	MesocycleInsert,
	MesocycleUpdate,
	Program,
	ProgramInsert,
	ProgramUpdate,
	ProgramWithDays,
	TrainingDay,
	TrainingDayInsert,
	TrainingDayUpdate,
	TrainingDayWithAssignments
} from '../../types/program.js';
import {
	exerciseAssignmentInsertSchema,
	exerciseAssignmentUpdateSchema,
	mesocycleInsertSchema,
	mesocycleUpdateSchema,
	programInsertSchema,
	programUpdateSchema,
	trainingDayInsertSchema,
	trainingDayUpdateSchema
} from '../../types/program.js';
import { dbExecute, dbQuery, getDb } from '../database.js';

// ── Row mapping ──

type ProgramRow = {
	id: string;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

type TrainingDayRow = {
	id: string;
	program_id: string;
	name: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

type ExerciseAssignmentRow = {
	id: string;
	training_day_id: string;
	exercise_id: string;
	sort_order: number;
	target_sets: number;
	min_reps: number;
	max_reps: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

type MesocycleRow = {
	id: string;
	program_id: string;
	weeks_count: number;
	deload_week_number: number;
	start_date: string | null;
	current_week: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

function rowToProgram(row: ProgramRow): Program {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

function rowToTrainingDay(row: TrainingDayRow): TrainingDay {
	return {
		id: row.id,
		program_id: row.program_id,
		name: row.name,
		sort_order: row.sort_order,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

function rowToExerciseAssignment(row: ExerciseAssignmentRow): ExerciseAssignment {
	return {
		id: row.id,
		training_day_id: row.training_day_id,
		exercise_id: row.exercise_id,
		sort_order: row.sort_order,
		target_sets: row.target_sets,
		min_reps: row.min_reps,
		max_reps: row.max_reps,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

function rowToMesocycle(row: MesocycleRow): Mesocycle {
	return {
		id: row.id,
		program_id: row.program_id,
		weeks_count: row.weeks_count,
		deload_week_number: row.deload_week_number,
		start_date: row.start_date,
		current_week: row.current_week,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

// ── Repository ──

export const ProgramRepository = {
	// ── Program CRUD ──

	/**
	 * Create a new program with optional training days.
	 * Uses a transaction for atomicity when training days are provided.
	 */
	async createProgram(
		data: ProgramInsert,
		trainingDays?: TrainingDayInsert[]
	): Promise<Program> {
		const validated = programInsertSchema.parse(data);

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const database = await getDb();

		if (trainingDays && trainingDays.length > 0) {
			// Transaction for multi-table insert
			await CapgoCapacitorFastSql.execute({
				database,
				statement: 'BEGIN TRANSACTION'
			});

			try {
				await dbExecute(
					`INSERT INTO programs (id, name, description, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?)`,
					[id, validated.name, validated.description ?? null, now, now]
				);

				for (let i = 0; i < trainingDays.length; i++) {
					const dayData = trainingDayInsertSchema.parse(trainingDays[i]);
					const dayId = crypto.randomUUID();
					await dbExecute(
						`INSERT INTO training_days (id, program_id, name, sort_order, created_at, updated_at)
						 VALUES (?, ?, ?, ?, ?, ?)`,
						[dayId, id, dayData.name, dayData.sort_order ?? i, now, now]
					);
				}

				await CapgoCapacitorFastSql.execute({
					database,
					statement: 'COMMIT'
				});
			} catch (error) {
				await CapgoCapacitorFastSql.execute({
					database,
					statement: 'ROLLBACK'
				});
				throw error;
			}
		} else {
			await dbExecute(
				`INSERT INTO programs (id, name, description, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?)`,
				[id, validated.name, validated.description ?? null, now, now]
			);
		}

		const program = await this.getProgram(id);
		if (!program) {
			throw new Error(`[ProgramRepository] Created program not found: ${id}`);
		}
		return program;
	},

	/**
	 * Get all active programs, ordered by name.
	 */
	async getAll(): Promise<Program[]> {
		const rows = await dbQuery<ProgramRow>(
			'SELECT * FROM programs WHERE deleted_at IS NULL ORDER BY name ASC'
		);
		return rows.map(rowToProgram);
	},

	/**
	 * Get all active programs with their training days (and assignments).
	 * Useful for list views that need training day counts or mesocycle info.
	 */
	async getAllWithDays(): Promise<ProgramWithDays[]> {
		const programs = await this.getAll();
		const result: ProgramWithDays[] = [];

		for (const program of programs) {
			const dayRows = await dbQuery<TrainingDayRow>(
				'SELECT * FROM training_days WHERE program_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC',
				[program.id]
			);

			const trainingDays: TrainingDayWithAssignments[] = [];

			for (const dayRow of dayRows) {
				const day = rowToTrainingDay(dayRow);
				const assignmentRows = await dbQuery<ExerciseAssignmentRow>(
					'SELECT * FROM exercise_assignments WHERE training_day_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC',
					[day.id]
				);
				trainingDays.push({
					...day,
					assignments: assignmentRows.map(rowToExerciseAssignment)
				});
			}

			result.push({ ...program, trainingDays });
		}

		return result;
	},

	/**
	 * Get a single program by ID (without nested data). Returns null if not found or soft-deleted.
	 */
	async getProgram(id: string): Promise<Program | null> {
		const rows = await dbQuery<ProgramRow>(
			'SELECT * FROM programs WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return rows.length > 0 ? rowToProgram(rows[0]) : null;
	},

	/**
	 * Get a program by ID with all nested training days and their exercise assignments.
	 * Returns null if not found or soft-deleted.
	 */
	async getById(id: string): Promise<ProgramWithDays | null> {
		const programRows = await dbQuery<ProgramRow>(
			'SELECT * FROM programs WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		if (programRows.length === 0) return null;

		const program = rowToProgram(programRows[0]);

		// Load training days
		const dayRows = await dbQuery<TrainingDayRow>(
			'SELECT * FROM training_days WHERE program_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC',
			[id]
		);

		const trainingDays: TrainingDayWithAssignments[] = [];

		for (const dayRow of dayRows) {
			const day = rowToTrainingDay(dayRow);

			// Load assignments for this day
			const assignmentRows = await dbQuery<ExerciseAssignmentRow>(
				'SELECT * FROM exercise_assignments WHERE training_day_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC',
				[day.id]
			);

			trainingDays.push({
				...day,
				assignments: assignmentRows.map(rowToExerciseAssignment)
			});
		}

		return {
			...program,
			trainingDays
		};
	},

	/**
	 * Update an existing program. Only updates provided fields.
	 * Returns the updated program or null if not found.
	 */
	async updateProgram(id: string, data: Omit<ProgramUpdate, 'id'>): Promise<Program | null> {
		const validated = programUpdateSchema.parse({ id, ...data });

		const setClauses: string[] = [];
		const params: SQLValue[] = [];

		if (validated.name !== undefined) {
			setClauses.push('name = ?');
			params.push(validated.name);
		}
		if (validated.description !== undefined) {
			setClauses.push('description = ?');
			params.push(validated.description ?? null);
		}

		if (setClauses.length === 0) {
			return this.getProgram(id);
		}

		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());
		params.push(id);

		await dbExecute(
			`UPDATE programs SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		return this.getProgram(id);
	},

	/**
	 * Soft-delete a program. Does not cascade to training days or mesocycles.
	 */
	async softDeleteProgram(id: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await dbExecute(
			'UPDATE programs SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
			[now, now, id]
		);
		return result.rowsAffected > 0;
	},

	// ── Training Day management ──

	/**
	 * Add a training day to a program. Auto-assigns sort_order if not provided (max+1).
	 */
	async addTrainingDay(programId: string, data: TrainingDayInsert): Promise<TrainingDay> {
		const validated = trainingDayInsertSchema.parse(data);

		let sortOrder = validated.sort_order;
		if (sortOrder === undefined) {
			const rows = await dbQuery<{ max_order: number | null }>(
				'SELECT MAX(sort_order) as max_order FROM training_days WHERE program_id = ? AND deleted_at IS NULL',
				[programId]
			);
			sortOrder = (rows[0]?.max_order ?? -1) + 1;
		}

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		await dbExecute(
			`INSERT INTO training_days (id, program_id, name, sort_order, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			[id, programId, validated.name, sortOrder, now, now]
		);

		const rows = await dbQuery<TrainingDayRow>(
			'SELECT * FROM training_days WHERE id = ?',
			[id]
		);
		if (rows.length === 0) {
			throw new Error(`[ProgramRepository] Created training day not found: ${id}`);
		}
		return rowToTrainingDay(rows[0]);
	},

	/**
	 * Update a training day. Only updates provided fields.
	 */
	async updateTrainingDay(
		id: string,
		data: Omit<TrainingDayUpdate, 'id'>
	): Promise<TrainingDay | null> {
		const validated = trainingDayUpdateSchema.parse({ id, ...data });

		const setClauses: string[] = [];
		const params: SQLValue[] = [];

		if (validated.name !== undefined) {
			setClauses.push('name = ?');
			params.push(validated.name);
		}
		if (validated.sort_order !== undefined) {
			setClauses.push('sort_order = ?');
			params.push(validated.sort_order);
		}

		if (setClauses.length === 0) {
			const rows = await dbQuery<TrainingDayRow>(
				'SELECT * FROM training_days WHERE id = ? AND deleted_at IS NULL',
				[id]
			);
			return rows.length > 0 ? rowToTrainingDay(rows[0]) : null;
		}

		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());
		params.push(id);

		await dbExecute(
			`UPDATE training_days SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		const rows = await dbQuery<TrainingDayRow>(
			'SELECT * FROM training_days WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return rows.length > 0 ? rowToTrainingDay(rows[0]) : null;
	},

	/**
	 * Soft-delete a training day.
	 */
	async removeTrainingDay(id: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await dbExecute(
			'UPDATE training_days SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
			[now, now, id]
		);
		return result.rowsAffected > 0;
	},

	/**
	 * Reorder training days for a program. Updates sort_order based on array position.
	 */
	async reorderTrainingDays(programId: string, orderedIds: string[]): Promise<void> {
		for (let i = 0; i < orderedIds.length; i++) {
			await dbExecute(
				'UPDATE training_days SET sort_order = ?, updated_at = ? WHERE id = ? AND program_id = ?',
				[i, new Date().toISOString(), orderedIds[i], programId]
			);
		}
	},

	// ── Exercise Assignment management ──

	/**
	 * Add an exercise assignment to a training day. Auto-assigns sort_order if not provided.
	 */
	async addExerciseAssignment(
		trainingDayId: string,
		data: ExerciseAssignmentInsert
	): Promise<ExerciseAssignment> {
		const validated = exerciseAssignmentInsertSchema.parse(data);

		let sortOrder = validated.sort_order;
		if (sortOrder === undefined) {
			const rows = await dbQuery<{ max_order: number | null }>(
				'SELECT MAX(sort_order) as max_order FROM exercise_assignments WHERE training_day_id = ? AND deleted_at IS NULL',
				[trainingDayId]
			);
			sortOrder = (rows[0]?.max_order ?? -1) + 1;
		}

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		await dbExecute(
			`INSERT INTO exercise_assignments (id, training_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				trainingDayId,
				validated.exercise_id,
				sortOrder,
				validated.target_sets ?? 3,
				validated.min_reps ?? 8,
				validated.max_reps ?? 12,
				now,
				now
			]
		);

		const rows = await dbQuery<ExerciseAssignmentRow>(
			'SELECT * FROM exercise_assignments WHERE id = ?',
			[id]
		);
		if (rows.length === 0) {
			throw new Error(`[ProgramRepository] Created exercise assignment not found: ${id}`);
		}
		return rowToExerciseAssignment(rows[0]);
	},

	/**
	 * Update an exercise assignment. Only updates provided fields.
	 */
	async updateExerciseAssignment(
		id: string,
		data: Omit<ExerciseAssignmentUpdate, 'id'>
	): Promise<ExerciseAssignment | null> {
		const validated = exerciseAssignmentUpdateSchema.parse({ id, ...data });

		const setClauses: string[] = [];
		const params: SQLValue[] = [];

		if (validated.exercise_id !== undefined) {
			setClauses.push('exercise_id = ?');
			params.push(validated.exercise_id);
		}
		if (validated.sort_order !== undefined) {
			setClauses.push('sort_order = ?');
			params.push(validated.sort_order);
		}
		if (validated.target_sets !== undefined) {
			setClauses.push('target_sets = ?');
			params.push(validated.target_sets);
		}
		if (validated.min_reps !== undefined) {
			setClauses.push('min_reps = ?');
			params.push(validated.min_reps);
		}
		if (validated.max_reps !== undefined) {
			setClauses.push('max_reps = ?');
			params.push(validated.max_reps);
		}

		if (setClauses.length === 0) {
			const rows = await dbQuery<ExerciseAssignmentRow>(
				'SELECT * FROM exercise_assignments WHERE id = ? AND deleted_at IS NULL',
				[id]
			);
			return rows.length > 0 ? rowToExerciseAssignment(rows[0]) : null;
		}

		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());
		params.push(id);

		await dbExecute(
			`UPDATE exercise_assignments SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		const rows = await dbQuery<ExerciseAssignmentRow>(
			'SELECT * FROM exercise_assignments WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return rows.length > 0 ? rowToExerciseAssignment(rows[0]) : null;
	},

	/**
	 * Soft-delete an exercise assignment.
	 */
	async removeExerciseAssignment(id: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await dbExecute(
			'UPDATE exercise_assignments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
			[now, now, id]
		);
		return result.rowsAffected > 0;
	},

	/**
	 * Reorder exercise assignments for a training day. Updates sort_order based on array position.
	 */
	async reorderExerciseAssignments(
		trainingDayId: string,
		orderedIds: string[]
	): Promise<void> {
		for (let i = 0; i < orderedIds.length; i++) {
			await dbExecute(
				'UPDATE exercise_assignments SET sort_order = ?, updated_at = ? WHERE id = ? AND training_day_id = ?',
				[i, new Date().toISOString(), orderedIds[i], trainingDayId]
			);
		}
	},

	// ── Mesocycle management ──

	/**
	 * Create a mesocycle for a program.
	 */
	async createMesocycle(
		programId: string,
		data: MesocycleInsert
	): Promise<Mesocycle> {
		const validated = mesocycleInsertSchema.parse(data);

		const id = crypto.randomUUID();
		const now = new Date().toISOString();

		await dbExecute(
			`INSERT INTO mesocycles (id, program_id, weeks_count, deload_week_number, start_date, current_week, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				programId,
				validated.weeks_count ?? 4,
				validated.deload_week_number ?? 0,
				validated.start_date ?? null,
				validated.current_week ?? 1,
				now,
				now
			]
		);

		const rows = await dbQuery<MesocycleRow>(
			'SELECT * FROM mesocycles WHERE id = ?',
			[id]
		);
		if (rows.length === 0) {
			throw new Error(`[ProgramRepository] Created mesocycle not found: ${id}`);
		}
		return rowToMesocycle(rows[0]);
	},

	/**
	 * Get the active mesocycle for a program. Returns null if none exists.
	 */
	async getMesocycleByProgramId(programId: string): Promise<Mesocycle | null> {
		const rows = await dbQuery<MesocycleRow>(
			'SELECT * FROM mesocycles WHERE program_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1',
			[programId]
		);
		return rows.length > 0 ? rowToMesocycle(rows[0]) : null;
	},

	/**
	 * Update a mesocycle. Only updates provided fields.
	 */
	async updateMesocycle(
		id: string,
		data: Omit<MesocycleUpdate, 'id'>
	): Promise<Mesocycle | null> {
		const validated = mesocycleUpdateSchema.parse({ id, ...data });

		const setClauses: string[] = [];
		const params: SQLValue[] = [];

		if (validated.weeks_count !== undefined) {
			setClauses.push('weeks_count = ?');
			params.push(validated.weeks_count);
		}
		if (validated.deload_week_number !== undefined) {
			setClauses.push('deload_week_number = ?');
			params.push(validated.deload_week_number);
		}
		if (validated.start_date !== undefined) {
			setClauses.push('start_date = ?');
			params.push(validated.start_date ?? null);
		}
		if (validated.current_week !== undefined) {
			setClauses.push('current_week = ?');
			params.push(validated.current_week);
		}

		if (setClauses.length === 0) {
			const rows = await dbQuery<MesocycleRow>(
				'SELECT * FROM mesocycles WHERE id = ? AND deleted_at IS NULL',
				[id]
			);
			return rows.length > 0 ? rowToMesocycle(rows[0]) : null;
		}

		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());
		params.push(id);

		await dbExecute(
			`UPDATE mesocycles SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		const rows = await dbQuery<MesocycleRow>(
			'SELECT * FROM mesocycles WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return rows.length > 0 ? rowToMesocycle(rows[0]) : null;
	}
};
