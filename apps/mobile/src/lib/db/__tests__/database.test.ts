import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

// Now import the database module (which imports the mocked plugin)
const { getDb, dbExecute, dbQuery, dbReady, dbClose, _resetForTesting, dbState } = await import(
	'../database.js'
);

describe('database module', () => {
	beforeEach(() => {
		_resetForTesting();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	describe('getDb()', () => {
		it('initializes the database and creates the schema', async () => {
			const database = await getDb();
			expect(database).toBe('fitlog');
		});

		it('returns the same connection on multiple calls (singleton)', async () => {
			const first = await getDb();
			const second = await getDb();
			expect(first).toBe(second);
		});

		it('reports connected state after init', async () => {
			expect(dbReady()).toBe(false);
			await getDb();
			expect(dbReady()).toBe(true);
			expect(dbState().status).toBe('connected');
		});
	});

	describe('schema migration', () => {
		it('creates the schema_version table with current version', async () => {
			await getDb();

			const rows = await dbQuery<{ version: number; applied_at: string }>(
				'SELECT version, applied_at FROM schema_version'
			);

			expect(rows).toHaveLength(1);
			expect(rows[0].version).toBe(6);
			expect(rows[0].applied_at).toBeTruthy();
		});

		it('creates the exercises table with correct columns', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string; type: string }>(
				"PRAGMA table_info('exercises')"
			);

			const columnNames = rows.map((r) => r.name);
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('name');
			expect(columnNames).toContain('description');
			expect(columnNames).toContain('muscle_group');
			expect(columnNames).toContain('secondary_muscle_groups');
			expect(columnNames).toContain('equipment');
			expect(columnNames).toContain('is_custom');
			expect(columnNames).toContain('is_compound');
			expect(columnNames).toContain('created_at');
			expect(columnNames).toContain('updated_at');
			expect(columnNames).toContain('deleted_at');
		});

		it('creates the programs table with correct columns', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string; type: string }>(
				"PRAGMA table_info('programs')"
			);

			const columnNames = rows.map((r) => r.name);
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('name');
			expect(columnNames).toContain('description');
			expect(columnNames).toContain('created_at');
			expect(columnNames).toContain('updated_at');
			expect(columnNames).toContain('deleted_at');
		});

		it('creates the training_days table with correct columns', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string; type: string }>(
				"PRAGMA table_info('training_days')"
			);

			const columnNames = rows.map((r) => r.name);
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('program_id');
			expect(columnNames).toContain('name');
			expect(columnNames).toContain('sort_order');
			expect(columnNames).toContain('created_at');
			expect(columnNames).toContain('updated_at');
			expect(columnNames).toContain('deleted_at');
		});

		it('creates the exercise_assignments table with correct columns', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string; type: string }>(
				"PRAGMA table_info('exercise_assignments')"
			);

			const columnNames = rows.map((r) => r.name);
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('training_day_id');
			expect(columnNames).toContain('exercise_id');
			expect(columnNames).toContain('sort_order');
			expect(columnNames).toContain('target_sets');
			expect(columnNames).toContain('min_reps');
			expect(columnNames).toContain('max_reps');
		});

		it('creates the mesocycles table with correct columns', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string; type: string }>(
				"PRAGMA table_info('mesocycles')"
			);

			const columnNames = rows.map((r) => r.name);
			expect(columnNames).toContain('id');
			expect(columnNames).toContain('program_id');
			expect(columnNames).toContain('weeks_count');
			expect(columnNames).toContain('deload_week_number');
			expect(columnNames).toContain('start_date');
			expect(columnNames).toContain('current_week');
		});

		it('creates indexes on exercises table', async () => {
			await getDb();

			const rows = await dbQuery<{ name: string }>(
				"SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='exercises'"
			);

			const indexNames = rows.map((r) => r.name);
			expect(indexNames).toContain('idx_exercises_muscle_group');
			expect(indexNames).toContain('idx_exercises_equipment');
			expect(indexNames).toContain('idx_exercises_name');
		});

		it('does not re-apply schema if version is current', async () => {
			await getDb();

			// Reset module state (but don't close db — simulates re-init on same connection)
			_resetForTesting();

			// Re-init — should detect version is current and skip
			const consoleSpy = vi.spyOn(console, 'log');
			await getDb();

			const logMessages = consoleSpy.mock.calls.map((c) => c[0]);
			expect(logMessages).toContain('[DB] Schema up to date {"version":6}');

			consoleSpy.mockRestore();
		});
	});

	describe('CRUD operations', () => {
		const now = new Date().toISOString();
		const exerciseId = 'test-uuid-1234';

		beforeEach(async () => {
			await getDb();
		});

		it('inserts a row into exercises', async () => {
			const result = await dbExecute(
				`INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[exerciseId, 'Bench Press', 'Flat bench press', 'chest', 'barbell', 0, 1, now, now]
			);

			expect(result.rowsAffected).toBe(1);
		});

		it('queries inserted rows', async () => {
			await dbExecute(
				`INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[exerciseId, 'Bench Press', 'Flat bench press', 'chest', 'barbell', 0, 1, now, now]
			);

			const rows = await dbQuery<{ id: string; name: string; muscle_group: string }>(
				'SELECT id, name, muscle_group FROM exercises WHERE id = ?',
				[exerciseId]
			);

			expect(rows).toHaveLength(1);
			expect(rows[0].id).toBe(exerciseId);
			expect(rows[0].name).toBe('Bench Press');
			expect(rows[0].muscle_group).toBe('chest');
		});

		it('updates a row', async () => {
			await dbExecute(
				`INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[exerciseId, 'Bench Press', 'chest', 'barbell', 0, 1, now, now]
			);

			await dbExecute('UPDATE exercises SET name = ?, updated_at = ? WHERE id = ?', [
				'Incline Bench Press',
				new Date().toISOString(),
				exerciseId
			]);

			const rows = await dbQuery<{ name: string }>('SELECT name FROM exercises WHERE id = ?', [
				exerciseId
			]);

			expect(rows[0].name).toBe('Incline Bench Press');
		});

		it('soft-deletes a row', async () => {
			await dbExecute(
				`INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[exerciseId, 'Bench Press', 'chest', 'barbell', 0, 1, now, now]
			);

			const deletedAt = new Date().toISOString();
			await dbExecute('UPDATE exercises SET deleted_at = ? WHERE id = ?', [
				deletedAt,
				exerciseId
			]);

			// Should still exist in raw query
			const allRows = await dbQuery<{ id: string }>(
				'SELECT id FROM exercises WHERE id = ?',
				[exerciseId]
			);
			expect(allRows).toHaveLength(1);

			// Should be excluded with soft delete filter
			const activeRows = await dbQuery<{ id: string }>(
				'SELECT id FROM exercises WHERE id = ? AND deleted_at IS NULL',
				[exerciseId]
			);
			expect(activeRows).toHaveLength(0);
		});

		it('hard-deletes a row', async () => {
			await dbExecute(
				`INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[exerciseId, 'Bench Press', 'chest', 'barbell', 0, 1, now, now]
			);

			await dbExecute('DELETE FROM exercises WHERE id = ?', [exerciseId]);

			const rows = await dbQuery<{ id: string }>(
				'SELECT id FROM exercises WHERE id = ?',
				[exerciseId]
			);
			expect(rows).toHaveLength(0);
		});
	});

	describe('dbClose()', () => {
		it('disconnects and resets state', async () => {
			await getDb();
			expect(dbReady()).toBe(true);

			await dbClose();
			expect(dbReady()).toBe(false);
			expect(dbState().status).toBe('idle');
		});
	});
});
