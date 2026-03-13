/**
 * Workout domain types and Zod v4 validation schemas.
 *
 * Workout sessions track individual training instances. Each session contains
 * workout sets with weight/reps/RIR data. Sessions support status transitions:
 * in_progress → completed | cancelled.
 *
 * @module
 */

import { z } from 'zod';

import type { SoftDeletable, UUID } from './common.js';

// ── Enums ──

export const SessionStatus = {
	IN_PROGRESS: 'in_progress',
	COMPLETED: 'completed',
	CANCELLED: 'cancelled'
} as const;

export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SetType = {
	WARMUP: 'warmup',
	WORKING: 'working',
	DROP: 'drop',
	FAILURE: 'failure'
} as const;

export type SetType = (typeof SetType)[keyof typeof SetType];

// ── Interfaces ──

export interface WorkoutSession extends SoftDeletable {
	id: UUID;
	program_id: UUID;
	training_day_id: UUID;
	mesocycle_id: UUID | null;
	mesocycle_week: number | null;
	status: SessionStatus;
	started_at: string;
	completed_at: string | null;
	duration_seconds: number | null;
	notes: string | null;
}

export interface WorkoutSet extends SoftDeletable {
	id: UUID;
	session_id: UUID;
	exercise_id: UUID;
	assignment_id: UUID | null;
	set_number: number;
	set_type: SetType;
	weight: number | null;
	reps: number | null;
	rir: number | null;
	completed: boolean;
	rest_seconds: number | null;
}

// ── Composite Types ──

export interface WorkoutSessionWithSets extends WorkoutSession {
	sets: WorkoutSet[];
}

/** Summary of a completed workout session for history list views. */
export interface CompletedSessionSummary {
	id: UUID;
	started_at: string;
	completed_at: string;
	duration_seconds: number | null;
	training_day_name: string;
	exercise_count: number;
	total_sets: number;
}

/** Session with sets plus a map of exercise IDs to exercise names. */
export interface SessionDetailWithNames extends WorkoutSessionWithSets {
	exerciseNames: Record<string, string>;
}

// ── Zod Schemas ──

const sessionStatusSchema = z.enum(['in_progress', 'completed', 'cancelled']);
const setTypeSchema = z.enum(['warmup', 'working', 'drop', 'failure']);

/** Schema for creating a new workout session */
export const sessionInsertSchema = z.object({
	program_id: z.uuid(),
	training_day_id: z.uuid(),
	mesocycle_id: z.optional(z.nullable(z.uuid())),
	mesocycle_week: z.optional(z.nullable(z.number().int().min(1).max(52))),
	notes: z.optional(z.nullable(z.string().max(2000)))
});

export type SessionInsert = z.infer<typeof sessionInsertSchema>;

/** Schema for updating a workout session */
export const sessionUpdateSchema = z.object({
	id: z.uuid(),
	status: z.optional(sessionStatusSchema),
	completed_at: z.optional(z.nullable(z.string())),
	duration_seconds: z.optional(z.nullable(z.number().int().min(0))),
	notes: z.optional(z.nullable(z.string().max(2000)))
});

export type SessionUpdate = z.infer<typeof sessionUpdateSchema>;

/** Schema for adding a set to a workout session */
export const setInsertSchema = z.object({
	exercise_id: z.uuid(),
	assignment_id: z.optional(z.nullable(z.uuid())),
	set_type: z.optional(setTypeSchema),
	weight: z.optional(z.nullable(z.number().min(0).max(9999))),
	reps: z.optional(z.nullable(z.number().int().min(0).max(999))),
	rir: z.optional(z.nullable(z.number().int().min(0).max(10))),
	completed: z.optional(z.boolean()),
	rest_seconds: z.optional(z.nullable(z.number().int().min(0).max(3600)))
});

export type SetInsert = z.infer<typeof setInsertSchema>;

/** Schema for updating a workout set */
export const setUpdateSchema = z.object({
	id: z.uuid(),
	set_type: z.optional(setTypeSchema),
	weight: z.optional(z.nullable(z.number().min(0).max(9999))),
	reps: z.optional(z.nullable(z.number().int().min(0).max(999))),
	rir: z.optional(z.nullable(z.number().int().min(0).max(10))),
	completed: z.optional(z.boolean()),
	rest_seconds: z.optional(z.nullable(z.number().int().min(0).max(3600)))
});

export type SetUpdate = z.infer<typeof setUpdateSchema>;
