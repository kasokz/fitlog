/**
 * BodyWeightRepository — typed data access for the body_weight_entries table.
 *
 * All read methods exclude soft-deleted rows.
 * The `log` method uses INSERT OR REPLACE for upsert on the date UNIQUE constraint,
 * but only targets non-deleted entries — a soft-deleted entry for the same date
 * is left in place, and a new row is created instead.
 *
 * @module
 */

import type { SQLValue } from '@capgo/capacitor-fast-sql';

import type { BodyWeightEntry } from '../../types/bodyweight.js';
import { bodyWeightInsertSchema } from '../../types/bodyweight.js';
import { dbExecute, dbQuery } from '../database.js';

// ── Row mapping ──

/** Raw row shape from SQLite */
type BodyWeightRow = {
	id: string;
	date: string;
	weight_kg: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
};

function rowToEntry(row: BodyWeightRow): BodyWeightEntry {
	return {
		id: row.id,
		date: row.date,
		weight_kg: row.weight_kg,
		created_at: row.created_at,
		updated_at: row.updated_at,
		deleted_at: row.deleted_at
	};
}

// ── Repository ──

export const BodyWeightRepository = {
	/**
	 * Log a body weight entry for a given date.
	 *
	 * If an active (non-deleted) entry already exists for that date, it is updated
	 * (upsert). If the date's entry was soft-deleted, a new entry is created with
	 * a fresh id — the deleted row is left untouched.
	 */
	async log(date: string, weightKg: number): Promise<BodyWeightEntry> {
		const validated = bodyWeightInsertSchema.parse({ date, weight_kg: weightKg });
		const now = new Date().toISOString();

		// Check if there's an active (non-deleted) entry for this date
		const existing = await dbQuery<BodyWeightRow>(
			'SELECT * FROM body_weight_entries WHERE date = ? AND deleted_at IS NULL',
			[validated.date]
		);

		if (existing.length > 0) {
			// Update existing active entry
			await dbExecute(
				'UPDATE body_weight_entries SET weight_kg = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
				[validated.weight_kg, now, existing[0].id]
			);
			console.log(`[BodyWeight] Updated entry for ${validated.date}: ${validated.weight_kg}kg`);

			const updated = await dbQuery<BodyWeightRow>(
				'SELECT * FROM body_weight_entries WHERE id = ?',
				[existing[0].id]
			);
			return rowToEntry(updated[0]);
		}

		// Insert new entry
		const id = crypto.randomUUID();
		await dbExecute(
			`INSERT INTO body_weight_entries (id, date, weight_kg, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)`,
			[id, validated.date, validated.weight_kg, now, now]
		);
		console.log(`[BodyWeight] Logged ${validated.weight_kg}kg for ${validated.date}`);

		const created = await dbQuery<BodyWeightRow>(
			'SELECT * FROM body_weight_entries WHERE id = ?',
			[id]
		);
		if (!created.length) {
			throw new Error(`[BodyWeightRepository] Created entry not found: ${id}`);
		}
		return rowToEntry(created[0]);
	},

	/**
	 * Get all active body weight entries, ordered by date descending (most recent first).
	 * Supports pagination via limit/offset.
	 */
	async getAll(limit = 50, offset = 0): Promise<BodyWeightEntry[]> {
		const params: SQLValue[] = [limit, offset];
		const rows = await dbQuery<BodyWeightRow>(
			'SELECT * FROM body_weight_entries WHERE deleted_at IS NULL ORDER BY date DESC LIMIT ? OFFSET ?',
			params
		);
		return rows.map(rowToEntry);
	},

	/**
	 * Get active body weight entries within a date range (inclusive).
	 * Returned in ascending date order.
	 */
	async getRange(startDate: string, endDate: string): Promise<BodyWeightEntry[]> {
		const rows = await dbQuery<BodyWeightRow>(
			'SELECT * FROM body_weight_entries WHERE date BETWEEN ? AND ? AND deleted_at IS NULL ORDER BY date ASC',
			[startDate, endDate]
		);
		return rows.map(rowToEntry);
	},

	/**
	 * Soft-delete a body weight entry by id.
	 * Returns true if the entry was found and deleted, false otherwise.
	 */
	async deleteEntry(id: string): Promise<boolean> {
		const now = new Date().toISOString();
		const result = await dbExecute(
			'UPDATE body_weight_entries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
			[now, now, id]
		);
		if (result.rowsAffected > 0) {
			console.log(`[BodyWeight] Soft-deleted entry ${id}`);
		}
		return result.rowsAffected > 0;
	}
};
