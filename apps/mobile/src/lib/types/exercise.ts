/**
 * Exercise domain types and Zod v4 validation schemas.
 */

import { z } from 'zod';

import type { SoftDeletable, UUID } from './common.js';

// ── Enums ──

export const MuscleGroup = {
	chest: 'chest',
	back: 'back',
	shoulders: 'shoulders',
	biceps: 'biceps',
	triceps: 'triceps',
	forearms: 'forearms',
	quadriceps: 'quadriceps',
	hamstrings: 'hamstrings',
	glutes: 'glutes',
	calves: 'calves',
	abs: 'abs',
	full_body: 'full_body'
} as const;

export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const MUSCLE_GROUPS = Object.values(MuscleGroup) as [MuscleGroup, ...MuscleGroup[]];

export const Equipment = {
	barbell: 'barbell',
	dumbbell: 'dumbbell',
	cable: 'cable',
	machine: 'machine',
	bodyweight: 'bodyweight',
	kettlebell: 'kettlebell',
	band: 'band',
	other: 'other'
} as const;

export type Equipment = (typeof Equipment)[keyof typeof Equipment];

export const EQUIPMENT_LIST = Object.values(Equipment) as [Equipment, ...Equipment[]];

// ── Interface ──

export interface Exercise extends SoftDeletable {
	id: UUID;
	name: string;
	description: string | null;
	muscle_group: MuscleGroup;
	secondary_muscle_groups: MuscleGroup[];
	equipment: Equipment;
	is_custom: boolean;
	is_compound: boolean;
}

// ── Zod Schemas ──

export const muscleGroupSchema = z.enum(MUSCLE_GROUPS);
export const equipmentSchema = z.enum(EQUIPMENT_LIST);

/** Schema for inserting a new exercise (id and timestamps are generated) */
export const exerciseInsertSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.optional(z.nullable(z.string().max(1000))),
	muscle_group: muscleGroupSchema,
	secondary_muscle_groups: z.optional(z.array(muscleGroupSchema)),
	equipment: equipmentSchema,
	is_custom: z.optional(z.boolean()),
	is_compound: z.optional(z.boolean())
});

export type ExerciseInsert = z.infer<typeof exerciseInsertSchema>;

/** Schema for updating an existing exercise (all fields optional except id) */
export const exerciseUpdateSchema = z.object({
	id: z.uuid(),
	name: z.optional(z.string().min(1).max(200)),
	description: z.optional(z.nullable(z.string().max(1000))),
	muscle_group: z.optional(muscleGroupSchema),
	secondary_muscle_groups: z.optional(z.array(muscleGroupSchema)),
	equipment: z.optional(equipmentSchema),
	is_compound: z.optional(z.boolean())
});

export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>;
