/**
 * Analytics domain types — shared contract for analytics computation engine.
 *
 * These types form the interface between the AnalyticsRepository (SQL queries),
 * analytics service modules (pure computation), and downstream UI slices (S02–S05).
 * All types are output-only — no Zod schemas needed.
 *
 * @module
 */

import type { UUID } from './common.js';
import type { Equipment } from './exercise.js';
import type { SetType } from './workout.js';

// ── Date Range ──

/** Inclusive date range using YYYY-MM-DD strings */
export interface AnalyticsDateRange {
	start: string;
	end: string;
}

// ── Chart Data Points ──

/** Single data point for strength curve / estimated 1RM trend charts */
export interface StrengthDataPoint {
	date: string;
	estimatedOneRM: number;
	weight: number;
	reps: number;
}

/** Single data point for volume trend charts */
export interface VolumeDataPoint {
	date: string;
	totalVolume: number;
	setCount: number;
}

// ── Personal Records ──

/** PR record — a detected personal record across three categories */
export interface PR {
	id: UUID;
	exercise_id: UUID;
	type: 'weight_pr' | 'rep_pr' | 'e1rm_pr';
	value: number;
	weight: number;
	reps: number;
	date: string;
	session_id: UUID;
}

// ── Progression ──

/** Output of the progression advisor — a weight increase suggestion */
export interface ProgressionSuggestion {
	exercise_id: UUID;
	suggested_weight: number;
	increment_kg: number;
	current_weight: number;
	reason: string;
	sessions_analyzed: number;
	avg_rir: number;
}

/** Configurable thresholds for the progression advisor heuristic */
export interface ProgressionThresholds {
	minSessions: number;
	minAvgRir: number;
	minWorkingSetsPerSession: number;
}

// ── Deload ──

/** A single set adjusted for a deload week */
export interface DeloadSet {
	exercise_id: UUID;
	set_number: number;
	set_type: SetType;
	weight: number | null;
	reps: number | null;
	original_weight: number | null;
}

// ── Weight Increments ──

/** Mapping of equipment type to standard weight increment in kg */
export type WeightIncrement = Record<Equipment, number>;
