/**
 * Body weight domain types and Zod v4 validation schemas.
 */

import { z } from 'zod';

import type { SoftDeletable, UUID } from './common.js';

// ── Types ──

/** A single body weight log entry, one per date. */
export interface BodyWeightEntry extends SoftDeletable {
	id: UUID;
	/** Date in YYYY-MM-DD format */
	date: string;
	/** Weight in kilograms */
	weight_kg: number;
}

// ── Schemas ──

/** Schema for inserting/upserting a body weight entry. */
export const bodyWeightInsertSchema = z.object({
	date: z.string(),
	weight_kg: z.number().min(20).max(500)
});

export type BodyWeightInsert = z.infer<typeof bodyWeightInsertSchema>;
