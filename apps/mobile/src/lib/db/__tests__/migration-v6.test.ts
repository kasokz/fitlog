import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the Capacitor plugin
const mock = setupMockDatabase();

const { uuidv5 } = await import('../../utils/uuid-v5.js');
const { migrateV6 } = await import('../migrations/v6-deterministic-exercise-ids.js');

const DB = 'test';

// ── Helpers ──

async function createTables(): Promise<void> {
	await mock.execute({
		database: DB,
		statement: `CREATE TABLE IF NOT EXISTS exercises (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			muscle_group TEXT NOT NULL,
			secondary_muscle_groups TEXT,
			equipment TEXT NOT NULL,
			is_custom INTEGER NOT NULL DEFAULT 0,
			is_compound INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			deleted_at TEXT
		)`
	});
	await mock.execute({
		database: DB,
		statement: `CREATE TABLE IF NOT EXISTS exercise_assignments (
			id TEXT PRIMARY KEY,
			training_day_id TEXT NOT NULL,
			exercise_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			target_sets INTEGER NOT NULL DEFAULT 3,
			min_reps INTEGER NOT NULL DEFAULT 8,
			max_reps INTEGER NOT NULL DEFAULT 12,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			deleted_at TEXT
		)`
	});
	await mock.execute({
		database: DB,
		statement: `CREATE TABLE IF NOT EXISTS workout_sets (
			id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL,
			exercise_id TEXT NOT NULL,
			assignment_id TEXT,
			set_number INTEGER NOT NULL,
			set_type TEXT NOT NULL DEFAULT 'working',
			weight REAL,
			reps INTEGER,
			rir INTEGER,
			completed INTEGER NOT NULL DEFAULT 0,
			rest_seconds INTEGER,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			deleted_at TEXT
		)`
	});
}

describe('migrateV6 — deterministic exercise IDs', () => {
	beforeEach(async () => {
		await mock.connect({ database: DB });
		await createTables();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	it('re-IDs seed exercises with deterministic UUIDs and cascades to FK references', async () => {
		const now = new Date().toISOString();
		const oldBenchId = 'random-bench-uuid-111';
		const oldSquatId = 'random-squat-uuid-222';

		// Insert seed exercises with random UUIDs
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
			params: [oldBenchId, 'Bench Press', 'desc', 'chest', 'barbell', now, now]
		});
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
			params: [oldSquatId, 'Squat', 'desc', 'quadriceps', 'barbell', now, now]
		});

		// Insert FK references
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercise_assignments (id, training_day_id, exercise_id, sort_order, created_at, updated_at)
				VALUES (?, ?, ?, 0, ?, ?)`,
			params: ['assign-1', 'day-1', oldBenchId, now, now]
		});
		await mock.execute({
			database: DB,
			statement: `INSERT INTO workout_sets (id, session_id, exercise_id, set_number, created_at, updated_at)
				VALUES (?, ?, ?, 1, ?, ?)`,
			params: ['set-1', 'session-1', oldBenchId, now, now]
		});
		await mock.execute({
			database: DB,
			statement: `INSERT INTO workout_sets (id, session_id, exercise_id, set_number, created_at, updated_at)
				VALUES (?, ?, ?, 1, ?, ?)`,
			params: ['set-2', 'session-1', oldSquatId, now, now]
		});

		// Run migration
		await migrateV6(DB);

		// Verify exercises have deterministic IDs
		const expectedBenchId = await uuidv5('Bench Press');
		const expectedSquatId = await uuidv5('Squat');

		const exercises = await mock.execute({
			database: DB,
			statement: 'SELECT id, name FROM exercises ORDER BY name'
		});
		const benchRow = exercises.rows.find((r) => r.name === 'Bench Press');
		const squatRow = exercises.rows.find((r) => r.name === 'Squat');

		expect(benchRow?.id).toBe(expectedBenchId);
		expect(squatRow?.id).toBe(expectedSquatId);

		// Verify exercise_assignments cascaded
		const assignments = await mock.execute({
			database: DB,
			statement: 'SELECT exercise_id FROM exercise_assignments WHERE id = ?',
			params: ['assign-1']
		});
		expect(assignments.rows[0].exercise_id).toBe(expectedBenchId);

		// Verify workout_sets cascaded
		const sets = await mock.execute({
			database: DB,
			statement: 'SELECT id, exercise_id FROM workout_sets ORDER BY id'
		});
		const set1 = sets.rows.find((r) => r.id === 'set-1');
		const set2 = sets.rows.find((r) => r.id === 'set-2');
		expect(set1?.exercise_id).toBe(expectedBenchId);
		expect(set2?.exercise_id).toBe(expectedSquatId);
	});

	it('does not touch custom exercises (is_custom = 1)', async () => {
		const now = new Date().toISOString();
		const customId = 'custom-exercise-uuid-999';

		// Insert a custom exercise with a name that matches a seed exercise
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)`,
			params: [customId, 'Bench Press', 'my custom version', 'chest', 'barbell', now, now]
		});

		await migrateV6(DB);

		// Custom exercise should keep its original ID
		const result = await mock.execute({
			database: DB,
			statement: 'SELECT id FROM exercises WHERE is_custom = 1'
		});
		expect(result.rows[0].id).toBe(customId);
	});

	it('skips exercises that already have deterministic IDs', async () => {
		const now = new Date().toISOString();
		const deterministicId = await uuidv5('Bench Press');

		// Insert with already-correct ID
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
			params: [deterministicId, 'Bench Press', 'desc', 'chest', 'barbell', now, now]
		});

		// Should not throw and ID should remain the same
		await migrateV6(DB);

		const result = await mock.execute({
			database: DB,
			statement: 'SELECT id FROM exercises WHERE name = ?',
			params: ['Bench Press']
		});
		expect(result.rows[0].id).toBe(deterministicId);
	});

	it('handles empty database gracefully (no exercises to migrate)', async () => {
		// No exercises inserted — should complete without error
		await expect(migrateV6(DB)).resolves.not.toThrow();
	});

	it('rolls back on error mid-migration', async () => {
		const now = new Date().toISOString();
		const oldId = 'random-bench-uuid-111';

		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)`,
			params: [oldId, 'Bench Press', 'desc', 'chest', 'barbell', now, now]
		});

		// Insert a duplicate exercise with the target deterministic ID to cause a PRIMARY KEY conflict
		const deterministicId = await uuidv5('Bench Press');
		await mock.execute({
			database: DB,
			statement: `INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)`,
			params: [deterministicId, 'Different Name', 'desc', 'chest', 'barbell', now, now]
		});

		// Migration should fail due to primary key conflict
		await expect(migrateV6(DB)).rejects.toThrow();

		// Original exercise should still have the old ID (rolled back)
		const result = await mock.execute({
			database: DB,
			statement: 'SELECT id FROM exercises WHERE name = ?',
			params: ['Bench Press']
		});
		expect(result.rows[0].id).toBe(oldId);
	});
});
