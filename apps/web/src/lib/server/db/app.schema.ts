import { type InferSelectModel, type InferInsertModel } from "drizzle-orm";
import {
	pgTable,
	text,
	integer,
	doublePrecision,
	index,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema";

// ── Exercises ────────────────────────────────────────────────────────────────

export const exercises = pgTable(
	"exercises",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		muscleGroup: text("muscle_group").notNull(),
		secondaryMuscleGroups: text("secondary_muscle_groups"),
		equipment: text("equipment").notNull(),
		isCustom: integer("is_custom").notNull().default(0),
		isCompound: integer("is_compound").notNull().default(0),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("exercises_user_id_idx").on(table.userId),
		index("exercises_muscle_group_idx").on(table.muscleGroup),
		index("exercises_equipment_idx").on(table.equipment),
		index("exercises_name_idx").on(table.name),
	],
);

export type Exercise = InferSelectModel<typeof exercises>;
export type NewExercise = InferInsertModel<typeof exercises>;

// ── Programs ─────────────────────────────────────────────────────────────────

export const programs = pgTable(
	"programs",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [index("programs_user_id_idx").on(table.userId)],
);

export type Program = InferSelectModel<typeof programs>;
export type NewProgram = InferInsertModel<typeof programs>;

// ── Training Days ────────────────────────────────────────────────────────────

export const trainingDays = pgTable(
	"training_days",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		programId: text("program_id").notNull(),
		name: text("name").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("training_days_user_id_idx").on(table.userId),
		index("training_days_program_id_idx").on(table.programId),
	],
);

export type TrainingDay = InferSelectModel<typeof trainingDays>;
export type NewTrainingDay = InferInsertModel<typeof trainingDays>;

// ── Exercise Assignments ─────────────────────────────────────────────────────

export const exerciseAssignments = pgTable(
	"exercise_assignments",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		trainingDayId: text("training_day_id").notNull(),
		exerciseId: text("exercise_id").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		targetSets: integer("target_sets").notNull().default(3),
		minReps: integer("min_reps").notNull().default(8),
		maxReps: integer("max_reps").notNull().default(12),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("exercise_assignments_user_id_idx").on(table.userId),
		index("exercise_assignments_training_day_id_idx").on(table.trainingDayId),
		index("exercise_assignments_exercise_id_idx").on(table.exerciseId),
	],
);

export type ExerciseAssignment = InferSelectModel<typeof exerciseAssignments>;
export type NewExerciseAssignment = InferInsertModel<typeof exerciseAssignments>;

// ── Mesocycles ───────────────────────────────────────────────────────────────

export const mesocycles = pgTable(
	"mesocycles",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		programId: text("program_id").notNull(),
		weeksCount: integer("weeks_count").notNull().default(4),
		deloadWeekNumber: integer("deload_week_number").notNull().default(0),
		startDate: text("start_date"),
		currentWeek: integer("current_week").notNull().default(1),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("mesocycles_user_id_idx").on(table.userId),
		index("mesocycles_program_id_idx").on(table.programId),
	],
);

export type Mesocycle = InferSelectModel<typeof mesocycles>;
export type NewMesocycle = InferInsertModel<typeof mesocycles>;

// ── Workout Sessions ─────────────────────────────────────────────────────────

export const workoutSessions = pgTable(
	"workout_sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		programId: text("program_id").notNull(),
		trainingDayId: text("training_day_id").notNull(),
		mesocycleId: text("mesocycle_id"),
		mesocycleWeek: integer("mesocycle_week"),
		status: text("status").notNull().default("in_progress"),
		startedAt: text("started_at").notNull(),
		completedAt: text("completed_at"),
		durationSeconds: integer("duration_seconds"),
		notes: text("notes"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("workout_sessions_user_id_idx").on(table.userId),
		index("workout_sessions_training_day_id_idx").on(table.trainingDayId),
		index("workout_sessions_started_at_idx").on(table.startedAt),
		index("workout_sessions_status_idx").on(table.status),
	],
);

export type WorkoutSession = InferSelectModel<typeof workoutSessions>;
export type NewWorkoutSession = InferInsertModel<typeof workoutSessions>;

// ── Workout Sets ─────────────────────────────────────────────────────────────

export const workoutSets = pgTable(
	"workout_sets",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		sessionId: text("session_id").notNull(),
		exerciseId: text("exercise_id").notNull(),
		assignmentId: text("assignment_id"),
		setNumber: integer("set_number").notNull(),
		setType: text("set_type").notNull().default("working"),
		weight: doublePrecision("weight"),
		reps: integer("reps"),
		rir: integer("rir"),
		completed: integer("completed").notNull().default(0),
		restSeconds: integer("rest_seconds"),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("workout_sets_user_id_idx").on(table.userId),
		index("workout_sets_session_id_idx").on(table.sessionId),
		index("workout_sets_exercise_id_idx").on(table.exerciseId),
	],
);

export type WorkoutSet = InferSelectModel<typeof workoutSets>;
export type NewWorkoutSet = InferInsertModel<typeof workoutSets>;

// ── Body Weight Entries ──────────────────────────────────────────────────────

export const bodyWeightEntries = pgTable(
	"body_weight_entries",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: text("date").notNull(),
		weightKg: doublePrecision("weight_kg").notNull(),
		createdAt: text("created_at").notNull(),
		updatedAt: text("updated_at").notNull(),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("body_weight_entries_user_id_idx").on(table.userId),
		index("body_weight_entries_date_idx").on(table.date),
		uniqueIndex("body_weight_entries_user_date_idx").on(table.userId, table.date),
	],
);

export type BodyWeightEntry = InferSelectModel<typeof bodyWeightEntries>;
export type NewBodyWeightEntry = InferInsertModel<typeof bodyWeightEntries>;
