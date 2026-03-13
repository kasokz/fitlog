import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, dbQuery, _resetForTesting } = await import('../database.js');
const { BodyWeightRepository } = await import('../repositories/bodyweight.js');

// ── Helpers ──

/** Clear all body weight entries so tests start from a known empty state */
async function clearAll() {
	await dbExecute('DELETE FROM body_weight_entries');
}

// ── Tests ──

describe('BodyWeightRepository', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── log ──

	describe('log', () => {
		it('creates a new entry with correct fields', async () => {
			const entry = await BodyWeightRepository.log('2025-06-15', 82.5);

			expect(entry.id).toBeTruthy();
			expect(entry.date).toBe('2025-06-15');
			expect(entry.weight_kg).toBe(82.5);
			expect(entry.created_at).toBeTruthy();
			expect(entry.updated_at).toBeTruthy();
			expect(entry.deleted_at).toBeNull();
		});

		it('updates existing entry on same date (upsert)', async () => {
			const first = await BodyWeightRepository.log('2025-06-15', 82.5);

			// Small delay to ensure updated_at differs
			await new Promise((r) => setTimeout(r, 10));

			const second = await BodyWeightRepository.log('2025-06-15', 83.0);

			// Should be the same entry (same id), just updated weight
			expect(second.id).toBe(first.id);
			expect(second.weight_kg).toBe(83.0);
			expect(second.updated_at).not.toBe(first.updated_at);

			// Only one entry should exist
			const all = await BodyWeightRepository.getAll();
			expect(all).toHaveLength(1);
		});

		it('rejects weight below minimum (20kg)', async () => {
			await expect(BodyWeightRepository.log('2025-06-15', 10)).rejects.toThrow();
		});

		it('rejects weight above maximum (500kg)', async () => {
			await expect(BodyWeightRepository.log('2025-06-15', 600)).rejects.toThrow();
		});
	});

	// ── getAll ──

	describe('getAll', () => {
		it('returns entries in descending date order', async () => {
			await BodyWeightRepository.log('2025-06-13', 81.0);
			await BodyWeightRepository.log('2025-06-15', 82.5);
			await BodyWeightRepository.log('2025-06-14', 82.0);

			const all = await BodyWeightRepository.getAll();

			expect(all).toHaveLength(3);
			expect(all[0].date).toBe('2025-06-15');
			expect(all[1].date).toBe('2025-06-14');
			expect(all[2].date).toBe('2025-06-13');
		});

		it('respects limit/offset pagination', async () => {
			await BodyWeightRepository.log('2025-06-10', 80.0);
			await BodyWeightRepository.log('2025-06-11', 80.5);
			await BodyWeightRepository.log('2025-06-12', 81.0);
			await BodyWeightRepository.log('2025-06-13', 81.5);
			await BodyWeightRepository.log('2025-06-14', 82.0);

			const page1 = await BodyWeightRepository.getAll(2, 0);
			const page2 = await BodyWeightRepository.getAll(2, 2);
			const page3 = await BodyWeightRepository.getAll(2, 4);

			expect(page1).toHaveLength(2);
			expect(page2).toHaveLength(2);
			expect(page3).toHaveLength(1);

			// DESC order: 14, 13, 12, 11, 10
			expect(page1[0].date).toBe('2025-06-14');
			expect(page1[1].date).toBe('2025-06-13');
			expect(page2[0].date).toBe('2025-06-12');
			expect(page2[1].date).toBe('2025-06-11');
			expect(page3[0].date).toBe('2025-06-10');
		});

		it('returns empty array when no entries exist', async () => {
			const all = await BodyWeightRepository.getAll();
			expect(all).toEqual([]);
		});
	});

	// ── getRange ──

	describe('getRange', () => {
		beforeEach(async () => {
			await BodyWeightRepository.log('2025-06-10', 80.0);
			await BodyWeightRepository.log('2025-06-12', 81.0);
			await BodyWeightRepository.log('2025-06-14', 82.0);
			await BodyWeightRepository.log('2025-06-16', 83.0);
			await BodyWeightRepository.log('2025-06-18', 84.0);
		});

		it('returns entries within date range only', async () => {
			const range = await BodyWeightRepository.getRange('2025-06-12', '2025-06-16');

			expect(range).toHaveLength(3);
			expect(range.map((e) => e.date)).toEqual(['2025-06-12', '2025-06-14', '2025-06-16']);
		});

		it('returns entries in ascending date order', async () => {
			const range = await BodyWeightRepository.getRange('2025-06-10', '2025-06-18');

			expect(range).toHaveLength(5);
			expect(range[0].date).toBe('2025-06-10');
			expect(range[4].date).toBe('2025-06-18');
		});

		it('returns empty for range with no entries', async () => {
			const range = await BodyWeightRepository.getRange('2025-07-01', '2025-07-31');
			expect(range).toEqual([]);
		});

		it('includes boundary dates (inclusive)', async () => {
			const range = await BodyWeightRepository.getRange('2025-06-10', '2025-06-10');
			expect(range).toHaveLength(1);
			expect(range[0].date).toBe('2025-06-10');
		});
	});

	// ── deleteEntry ──

	describe('deleteEntry', () => {
		it('soft-deletes the entry', async () => {
			const entry = await BodyWeightRepository.log('2025-06-15', 82.5);
			const deleted = await BodyWeightRepository.deleteEntry(entry.id);

			expect(deleted).toBe(true);

			// Verify it's not returned by getAll
			const all = await BodyWeightRepository.getAll();
			expect(all.find((e) => e.id === entry.id)).toBeUndefined();

			// But still exists in raw DB with deleted_at set
			const rows = await dbQuery<{ id: string; deleted_at: string | null }>(
				'SELECT id, deleted_at FROM body_weight_entries WHERE id = ?',
				[entry.id]
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].deleted_at).toBeTruthy();
		});

		it('returns false for non-existent id', async () => {
			const result = await BodyWeightRepository.deleteEntry('non-existent');
			expect(result).toBe(false);
		});

		it('returns false for already-deleted entry', async () => {
			const entry = await BodyWeightRepository.log('2025-06-15', 82.5);
			await BodyWeightRepository.deleteEntry(entry.id);
			const secondDelete = await BodyWeightRepository.deleteEntry(entry.id);
			expect(secondDelete).toBe(false);
		});
	});

	// ── Soft-delete interaction ──

	describe('soft-delete interaction', () => {
		it('soft-deleted entries excluded from getAll', async () => {
			const entry = await BodyWeightRepository.log('2025-06-15', 82.5);
			await BodyWeightRepository.log('2025-06-16', 83.0);

			await BodyWeightRepository.deleteEntry(entry.id);

			const all = await BodyWeightRepository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].date).toBe('2025-06-16');
		});

		it('soft-deleted entries excluded from getRange', async () => {
			const entry = await BodyWeightRepository.log('2025-06-15', 82.5);
			await BodyWeightRepository.log('2025-06-16', 83.0);

			await BodyWeightRepository.deleteEntry(entry.id);

			const range = await BodyWeightRepository.getRange('2025-06-14', '2025-06-17');
			expect(range).toHaveLength(1);
			expect(range[0].date).toBe('2025-06-16');
		});

		it('log after soft-delete creates a new entry (does not resurrect deleted)', async () => {
			const original = await BodyWeightRepository.log('2025-06-15', 82.5);
			await BodyWeightRepository.deleteEntry(original.id);

			// Log again on the same date
			const newEntry = await BodyWeightRepository.log('2025-06-15', 84.0);

			// Should be a different entry (new id)
			expect(newEntry.id).not.toBe(original.id);
			expect(newEntry.weight_kg).toBe(84.0);
			expect(newEntry.deleted_at).toBeNull();

			// Only the new one should appear in getAll
			const all = await BodyWeightRepository.getAll();
			expect(all).toHaveLength(1);
			expect(all[0].id).toBe(newEntry.id);
		});
	});
});
