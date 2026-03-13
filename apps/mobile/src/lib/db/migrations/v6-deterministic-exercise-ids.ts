/**
 * Schema v6 migration: Re-ID seed exercises with deterministic UUID v5.
 *
 * Existing databases have random UUIDs for seed exercises. Sync requires identical IDs
 * across devices, so we compute UUID v5 from exercise name and cascade the change
 * to exercise_assignments and workout_sets.
 *
 * @module
 */

import { CapgoCapacitorFastSql } from '@capgo/capacitor-fast-sql';
import type { SQLValue } from '@capgo/capacitor-fast-sql';

import { uuidv5 } from '../../utils/uuid-v5.js';
import { SEED_EXERCISES } from '../seed/exercises.js';

/**
 * Migrate seed exercise IDs from random UUIDs to deterministic UUID v5.
 * Cascades ID changes to exercise_assignments.exercise_id and workout_sets.exercise_id.
 * Runs in a transaction — partial failure rolls back.
 */
export async function migrateV6(database: string): Promise<void> {
	console.log('[DB] Running v6 migration: deterministic exercise IDs');

	await CapgoCapacitorFastSql.beginTransaction({ database });

	try {
		let updated = 0;

		for (const exercise of SEED_EXERCISES) {
			const newId = await uuidv5(exercise.name);

			// Find existing seed exercise by name
			const result = await CapgoCapacitorFastSql.execute({
				database,
				statement:
					'SELECT id FROM exercises WHERE name = ? AND is_custom = 0 AND deleted_at IS NULL',
				params: [exercise.name] as SQLValue[]
			});

			if (result.rows.length === 0) {
				// Exercise doesn't exist (user may have deleted it, or fresh install with new IDs)
				continue;
			}

			const oldId = result.rows[0].id as string;

			if (oldId === newId) {
				// Already has the correct deterministic ID (e.g. fresh install after code change)
				continue;
			}

			// Update the exercise ID
			await CapgoCapacitorFastSql.execute({
				database,
				statement: 'UPDATE exercises SET id = ? WHERE id = ?',
				params: [newId, oldId] as SQLValue[]
			});

			// Cascade to exercise_assignments
			await CapgoCapacitorFastSql.execute({
				database,
				statement: 'UPDATE exercise_assignments SET exercise_id = ? WHERE exercise_id = ?',
				params: [newId, oldId] as SQLValue[]
			});

			// Cascade to workout_sets
			await CapgoCapacitorFastSql.execute({
				database,
				statement: 'UPDATE workout_sets SET exercise_id = ? WHERE exercise_id = ?',
				params: [newId, oldId] as SQLValue[]
			});

			updated++;
		}

		await CapgoCapacitorFastSql.commitTransaction({ database });
		console.log(`[DB] v6 migration complete — ${updated} exercise IDs updated`);
	} catch (error) {
		await CapgoCapacitorFastSql.rollbackTransaction({ database }).catch(() => {
			// Rollback may fail if transaction was already aborted — swallow
		});
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`[DB] v6 migration failed, transaction rolled back: ${msg}`);
	}
}
