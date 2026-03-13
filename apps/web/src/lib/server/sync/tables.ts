/**
 * Sync table registry — maps client table names to Drizzle schema objects
 * and defines which columns are accepted on push / returned on pull.
 *
 * `user_id` is server-attached (never accepted from client, always injected).
 * `id`, `created_at`, `updated_at`, `deleted_at` are common to all tables.
 *
 * @module
 */

import {
	exercises,
	programs,
	trainingDays,
	exerciseAssignments,
	mesocycles,
	workoutSessions,
	workoutSets,
	bodyWeightEntries,
} from "$lib/server/db/app.schema";
import type { PgTable } from "drizzle-orm/pg-core";

/** Columns that every syncable table shares (besides user_id which is server-attached). */
const COMMON_COLUMNS = ["id", "created_at", "updated_at", "deleted_at"] as const;

export interface SyncTableDef {
	/** Drizzle table object for queries */
	table: PgTable;
	/** Data columns accepted from client on push (excludes user_id, includes id + timestamps) */
	pushColumns: readonly string[];
	/** All columns returned on pull (excludes user_id) */
	pullColumns: readonly string[];
}

function defineTable(
	table: PgTable,
	dataColumns: readonly string[],
): SyncTableDef {
	const pushColumns = [...COMMON_COLUMNS, ...dataColumns];
	// Pull returns same columns (user_id stripped separately)
	const pullColumns = [...pushColumns];
	return { table, pushColumns, pullColumns };
}

/**
 * Registry of all syncable tables keyed by their SQLite/Postgres table name.
 * Order matters for push (FK dependencies): parents before children.
 */
export const SYNC_TABLES: Record<string, SyncTableDef> = {
	exercises: defineTable(exercises, [
		"name",
		"description",
		"muscle_group",
		"secondary_muscle_groups",
		"equipment",
		"is_custom",
		"is_compound",
	]),

	programs: defineTable(programs, ["name", "description"]),

	training_days: defineTable(trainingDays, [
		"program_id",
		"name",
		"sort_order",
	]),

	exercise_assignments: defineTable(exerciseAssignments, [
		"training_day_id",
		"exercise_id",
		"sort_order",
		"target_sets",
		"min_reps",
		"max_reps",
	]),

	mesocycles: defineTable(mesocycles, [
		"program_id",
		"weeks_count",
		"deload_week_number",
		"start_date",
		"current_week",
	]),

	workout_sessions: defineTable(workoutSessions, [
		"program_id",
		"training_day_id",
		"mesocycle_id",
		"mesocycle_week",
		"status",
		"started_at",
		"completed_at",
		"duration_seconds",
		"notes",
	]),

	workout_sets: defineTable(workoutSets, [
		"session_id",
		"exercise_id",
		"assignment_id",
		"set_number",
		"set_type",
		"weight",
		"reps",
		"rir",
		"completed",
		"rest_seconds",
	]),

	body_weight_entries: defineTable(bodyWeightEntries, [
		"date",
		"weight_kg",
	]),
};

/** Table names in push order (FK-safe: parents first). */
export const SYNC_TABLE_NAMES = Object.keys(SYNC_TABLES);
