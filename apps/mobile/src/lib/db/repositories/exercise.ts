/**
 * ExerciseRepository — typed data access for the exercises table.
 *
 * All read methods exclude soft-deleted rows.
 * Create/update validate inputs with Zod before touching the database.
 * Secondary muscle groups are stored as JSON and parsed on read.
 *
 * @module
 */

import type { SQLValue } from '@capgo/capacitor-fast-sql';

import type { Exercise, ExerciseInsert, ExerciseUpdate, Equipment, MuscleGroup } from '../../types/exercise.js';
import { exerciseInsertSchema, exerciseUpdateSchema } from '../../types/exercise.js';
import { dbExecute, dbQuery } from '../database.js';

// ── Row mapping ──

/** Raw row shape from SQLite (booleans as 0/1, JSON as string) */
type ExerciseRow = {
	id: string;
	name: string;
	description: string | null;
	muscle_group: string;
	secondary_muscle_groups: string | null;
	equipment: string;
	is_custom: number;
	is_compound: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

function rowToExercise(row: ExerciseRow): Exercise {
	return {
		id: row.id,
		name: row.name,
		description: row.description,
		muscle_group: row.muscle_group as MuscleGroup,
		secondary_muscle_groups: parseSecondaryMuscleGroups(row.secondary_muscle_groups),
		equipment: row.equipment as Equipment,
		is_custom: row.is_custom === 1,
		is_compound: row.is_compound === 1,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

function parseSecondaryMuscleGroups(raw: string | null): MuscleGroup[] {
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

// ── Repository ──

export const ExerciseRepository = {
	/**
	 * Get all active exercises, ordered by name.
	 * Supports pagination via limit/offset.
	 */
	async getAll(options?: { limit?: number; offset?: number }): Promise<Exercise[]> {
		let sql = 'SELECT * FROM exercises WHERE deleted_at IS NULL ORDER BY name ASC';
		const params: SQLValue[] = [];

		if (options?.limit != null) {
			sql += ' LIMIT ?';
			params.push(options.limit);
		}
		if (options?.offset != null) {
			sql += ' OFFSET ?';
			params.push(options.offset);
		}

		const rows = await dbQuery<ExerciseRow>(sql, params);
		return rows.map(rowToExercise);
	},

	/**
	 * Get a single exercise by ID. Returns null if not found or soft-deleted.
	 */
	async getById(id: string): Promise<Exercise | null> {
		const rows = await dbQuery<ExerciseRow>(
			'SELECT * FROM exercises WHERE id = ? AND deleted_at IS NULL',
			[id]
		);
		return rows.length > 0 ? rowToExercise(rows[0]) : null;
	},

	/**
	 * Get a single exercise by exact name match. Returns null if not found or soft-deleted.
	 * Uses exact equality (not LIKE) to avoid false positives like "Curl" matching "Barbell Curl".
	 */
	async getByName(name: string): Promise<Exercise | null> {
		const rows = await dbQuery<ExerciseRow>(
			'SELECT * FROM exercises WHERE name = ? AND deleted_at IS NULL LIMIT 1',
			[name]
		);
		return rows.length > 0 ? rowToExercise(rows[0]) : null;
	},

	/**
	 * Search exercises by name (case-insensitive LIKE). Excludes soft-deleted.
	 */
	async search(query: string): Promise<Exercise[]> {
		const rows = await dbQuery<ExerciseRow>(
			'SELECT * FROM exercises WHERE name LIKE ? AND deleted_at IS NULL ORDER BY name ASC',
			[`%${query}%`]
		);
		return rows.map(rowToExercise);
	},

	/**
	 * Filter exercises by primary muscle group. Excludes soft-deleted.
	 */
	async filterByMuscleGroup(muscleGroup: MuscleGroup): Promise<Exercise[]> {
		const rows = await dbQuery<ExerciseRow>(
			'SELECT * FROM exercises WHERE muscle_group = ? AND deleted_at IS NULL ORDER BY name ASC',
			[muscleGroup]
		);
		return rows.map(rowToExercise);
	},

	/**
	 * Filter exercises by equipment type. Excludes soft-deleted.
	 */
	async filterByEquipment(equipment: Equipment): Promise<Exercise[]> {
		const rows = await dbQuery<ExerciseRow>(
			'SELECT * FROM exercises WHERE equipment = ? AND deleted_at IS NULL ORDER BY name ASC',
			[equipment]
		);
		return rows.map(rowToExercise);
	},

	/**
	 * Combined filtering with optional search, muscle group, and equipment.
	 * Builds WHERE clause dynamically. All params are optional.
	 */
	async combinedFilter(options: {
		search?: string;
		muscleGroup?: MuscleGroup;
		equipment?: Equipment;
	}): Promise<Exercise[]> {
		const conditions: string[] = ['deleted_at IS NULL'];
		const params: SQLValue[] = [];

		if (options.search) {
			conditions.push('name LIKE ?');
			params.push(`%${options.search}%`);
		}
		if (options.muscleGroup) {
			conditions.push('muscle_group = ?');
			params.push(options.muscleGroup);
		}
		if (options.equipment) {
			conditions.push('equipment = ?');
			params.push(options.equipment);
		}

		const sql = `SELECT * FROM exercises WHERE ${conditions.join(' AND ')} ORDER BY name ASC`;
		const rows = await dbQuery<ExerciseRow>(sql, params);
		return rows.map(rowToExercise);
	},

	/**
	 * Create a new exercise. Validates input with Zod, generates UUID and timestamps.
	 * Returns the created exercise.
	 */
	async create(data: ExerciseInsert): Promise<Exercise> {
		const validated = exerciseInsertSchema.parse(data);

		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		const secondaryJson = validated.secondary_muscle_groups?.length
			? JSON.stringify(validated.secondary_muscle_groups)
			: null;

		await dbExecute(
			`INSERT INTO exercises (id, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, is_compound, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				validated.name,
				validated.description ?? null,
				validated.muscle_group,
				secondaryJson,
				validated.equipment,
				validated.is_custom === false ? 0 : 1,
				validated.is_compound ? 1 : 0,
				now,
				now
			]
		);

		// Return the created exercise
		const exercise = await this.getById(id);
		if (!exercise) {
			throw new Error(`[ExerciseRepository] Created exercise not found: ${id}`);
		}
		return exercise;
	},

	/**
	 * Update an existing exercise. Only updates provided fields.
	 * Validates input with Zod. Returns the updated exercise or null if not found.
	 */
	async update(id: string, data: ExerciseUpdate): Promise<Exercise | null> {
		const validated = exerciseUpdateSchema.parse({ id, ...data });

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
		if (validated.muscle_group !== undefined) {
			setClauses.push('muscle_group = ?');
			params.push(validated.muscle_group);
		}
		if (validated.secondary_muscle_groups !== undefined) {
			setClauses.push('secondary_muscle_groups = ?');
			params.push(
				validated.secondary_muscle_groups.length
					? JSON.stringify(validated.secondary_muscle_groups)
					: null
			);
		}
		if (validated.equipment !== undefined) {
			setClauses.push('equipment = ?');
			params.push(validated.equipment);
		}
		if (validated.is_compound !== undefined) {
			setClauses.push('is_compound = ?');
			params.push(validated.is_compound ? 1 : 0);
		}

		if (setClauses.length === 0) {
			return this.getById(id);
		}

		// Always update the timestamp
		setClauses.push('updated_at = ?');
		params.push(new Date().toISOString());

		params.push(id);

		await dbExecute(
			`UPDATE exercises SET ${setClauses.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
			params
		);

		return this.getById(id);
	},

	/**
	 * Soft-delete an exercise by setting deleted_at to current timestamp.
	 * Returns true if the exercise was found and deleted, false otherwise.
	 */
	async softDelete(id: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await dbExecute(
			'UPDATE exercises SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
			[now, id]
		);
		return result.rowsAffected > 0;
	},

	/**
	 * Get count of active exercises, optionally filtered by muscle group and/or equipment.
	 * Useful for filter badge display.
	 */
	async getCount(options?: {
		muscleGroup?: MuscleGroup;
		equipment?: Equipment;
	}): Promise<number> {
		const conditions: string[] = ['deleted_at IS NULL'];
		const params: SQLValue[] = [];

		if (options?.muscleGroup) {
			conditions.push('muscle_group = ?');
			params.push(options.muscleGroup);
		}
		if (options?.equipment) {
			conditions.push('equipment = ?');
			params.push(options.equipment);
		}

		const sql = `SELECT COUNT(*) as count FROM exercises WHERE ${conditions.join(' AND ')}`;
		const rows = await dbQuery<{ count: number }>(sql, params);
		return rows[0]?.count ?? 0;
	}
};
