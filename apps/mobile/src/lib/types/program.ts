/**
 * Program domain types and Zod v4 validation schemas.
 *
 * Programs contain training days, which contain exercise assignments.
 * Mesocycles define periodization parameters for a program.
 */

import { z } from 'zod';

import type { SoftDeletable, UUID } from './common.js';

// ── Interfaces ──

export interface Program extends SoftDeletable {
	id: UUID;
	name: string;
	description: string | null;
}

export interface TrainingDay extends SoftDeletable {
	id: UUID;
	program_id: UUID;
	name: string;
	sort_order: number;
}

export interface ExerciseAssignment extends SoftDeletable {
	id: UUID;
	training_day_id: UUID;
	exercise_id: UUID;
	sort_order: number;
	target_sets: number;
	min_reps: number;
	max_reps: number;
}

export interface Mesocycle extends SoftDeletable {
	id: UUID;
	program_id: UUID;
	weeks_count: number;
	deload_week_number: number;
	start_date: string | null;
	current_week: number;
}

// ── Composite Types ──

export interface TrainingDayWithAssignments extends TrainingDay {
	assignments: ExerciseAssignment[];
}

export interface ProgramWithDays extends Program {
	trainingDays: TrainingDayWithAssignments[];
}

// ── Zod Schemas ──

/** Schema for inserting a new program (id and timestamps are generated) */
export const programInsertSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.optional(z.nullable(z.string().max(1000)))
});

export type ProgramInsert = z.infer<typeof programInsertSchema>;

/** Schema for updating an existing program (all fields optional except id) */
export const programUpdateSchema = z.object({
	id: z.uuid(),
	name: z.optional(z.string().min(1).max(200)),
	description: z.optional(z.nullable(z.string().max(1000)))
});

export type ProgramUpdate = z.infer<typeof programUpdateSchema>;

/** Schema for inserting a new training day */
export const trainingDayInsertSchema = z.object({
	name: z.string().min(1).max(200),
	sort_order: z.optional(z.number().int().min(0))
});

export type TrainingDayInsert = z.infer<typeof trainingDayInsertSchema>;

/** Schema for updating an existing training day */
export const trainingDayUpdateSchema = z.object({
	id: z.uuid(),
	name: z.optional(z.string().min(1).max(200)),
	sort_order: z.optional(z.number().int().min(0))
});

export type TrainingDayUpdate = z.infer<typeof trainingDayUpdateSchema>;

/** Schema for inserting a new exercise assignment */
export const exerciseAssignmentInsertSchema = z.object({
	exercise_id: z.uuid(),
	sort_order: z.optional(z.number().int().min(0)),
	target_sets: z.optional(z.number().int().min(1).max(20)),
	min_reps: z.optional(z.number().int().min(1).max(100)),
	max_reps: z.optional(z.number().int().min(1).max(100))
});

export type ExerciseAssignmentInsert = z.infer<typeof exerciseAssignmentInsertSchema>;

/** Schema for updating an existing exercise assignment */
export const exerciseAssignmentUpdateSchema = z.object({
	id: z.uuid(),
	exercise_id: z.optional(z.uuid()),
	sort_order: z.optional(z.number().int().min(0)),
	target_sets: z.optional(z.number().int().min(1).max(20)),
	min_reps: z.optional(z.number().int().min(1).max(100)),
	max_reps: z.optional(z.number().int().min(1).max(100))
});

export type ExerciseAssignmentUpdate = z.infer<typeof exerciseAssignmentUpdateSchema>;

/** Schema for inserting a new mesocycle */
export const mesocycleInsertSchema = z.object({
	weeks_count: z.optional(z.number().int().min(1).max(52)),
	deload_week_number: z.optional(z.number().int().min(0).max(52)),
	start_date: z.optional(z.nullable(z.string())),
	current_week: z.optional(z.number().int().min(1))
});

export type MesocycleInsert = z.infer<typeof mesocycleInsertSchema>;

/** Schema for updating an existing mesocycle */
export const mesocycleUpdateSchema = z.object({
	id: z.uuid(),
	weeks_count: z.optional(z.number().int().min(1).max(52)),
	deload_week_number: z.optional(z.number().int().min(0).max(52)),
	start_date: z.optional(z.nullable(z.string())),
	current_week: z.optional(z.number().int().min(1))
});

export type MesocycleUpdate = z.infer<typeof mesocycleUpdateSchema>;
