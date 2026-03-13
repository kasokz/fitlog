import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, _resetForTesting } = await import('../database.js');

const { escapeCSV, formatCSVRow, generateWorkoutCSV, generateBodyWeightCSV, generateFullJSON } =
	await import('../../services/export.js');

// ── Seed Helpers ──

const NOW = '2025-06-15T10:00:00.000Z';

async function seedTestData() {
	// 2 exercises — one with special characters in name
	await dbExecute(
		`INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ex-1', 'Bench Press', 'Flat barbell bench', 'chest', 'barbell', 0, 1, NOW, NOW]
	);
	await dbExecute(
		`INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ex-2', 'Squat, "Back"', 'Barbell back squat', 'quads', 'barbell', 0, 1, NOW, NOW]
	);

	// 1 program
	await dbExecute(
		`INSERT INTO programs (id, name, description, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)`,
		['prog-1', 'Push/Pull/Legs', 'A PPL split', NOW, NOW]
	);

	// 1 training day
	await dbExecute(
		`INSERT INTO training_days (id, program_id, name, sort_order, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		['td-1', 'prog-1', 'Push Day', 0, NOW, NOW]
	);

	// 2 exercise assignments
	await dbExecute(
		`INSERT INTO exercise_assignments (id, training_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ea-1', 'td-1', 'ex-1', 0, 3, 8, 12, NOW, NOW]
	);
	await dbExecute(
		`INSERT INTO exercise_assignments (id, training_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ea-2', 'td-1', 'ex-2', 1, 3, 6, 10, NOW, NOW]
	);

	// 1 mesocycle
	await dbExecute(
		`INSERT INTO mesocycles (id, program_id, weeks_count, deload_week_number, start_date, current_week, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		['meso-1', 'prog-1', 4, 4, '2025-06-01', 2, NOW, NOW]
	);

	// 2 completed sessions
	await dbExecute(
		`INSERT INTO workout_sessions (id, program_id, training_day_id, mesocycle_id, mesocycle_week, status, started_at, completed_at, duration_seconds, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			'sess-1',
			'prog-1',
			'td-1',
			'meso-1',
			1,
			'completed',
			'2025-06-10T08:00:00.000Z',
			'2025-06-10T09:00:00.000Z',
			3600,
			NOW,
			NOW
		]
	);
	await dbExecute(
		`INSERT INTO workout_sessions (id, program_id, training_day_id, mesocycle_id, mesocycle_week, status, started_at, completed_at, duration_seconds, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			'sess-2',
			'prog-1',
			'td-1',
			'meso-1',
			2,
			'completed',
			'2025-06-13T08:00:00.000Z',
			'2025-06-13T09:30:00.000Z',
			5400,
			NOW,
			NOW
		]
	);

	// 3 sets per session (6 total)
	for (let i = 1; i <= 3; i++) {
		await dbExecute(
			`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[`set-s1-${i}`, 'sess-1', 'ex-1', 'ea-1', i, 'working', 80, 10, 2, 1, NOW, NOW]
		);
	}
	for (let i = 1; i <= 3; i++) {
		await dbExecute(
			`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[`set-s2-${i}`, 'sess-2', 'ex-2', 'ea-2', i, 'working', 100, 8, 1, 1, NOW, NOW]
		);
	}

	// 2 body weight entries
	await dbExecute(
		`INSERT INTO body_weight_entries (id, date, weight_kg, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)`,
		['bw-1', '2025-06-10', 82.5, NOW, NOW]
	);
	await dbExecute(
		`INSERT INTO body_weight_entries (id, date, weight_kg, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)`,
		['bw-2', '2025-06-13', 82.0, NOW, NOW]
	);
}

async function seedSoftDeletedData() {
	// Soft-deleted exercise
	await dbExecute(
		`INSERT INTO exercises (id, name, description, muscle_group, equipment, is_custom, is_compound, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ex-del', 'Deleted Curl', null, 'biceps', 'dumbbell', 0, 0, NOW, NOW, NOW]
	);

	// Soft-deleted program
	await dbExecute(
		`INSERT INTO programs (id, name, description, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		['prog-del', 'Old Program', null, NOW, NOW, NOW]
	);

	// Soft-deleted training day
	await dbExecute(
		`INSERT INTO training_days (id, program_id, name, sort_order, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		['td-del', 'prog-1', 'Deleted Day', 0, NOW, NOW, NOW]
	);

	// Soft-deleted assignment
	await dbExecute(
		`INSERT INTO exercise_assignments (id, training_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['ea-del', 'td-1', 'ex-1', 0, 3, 8, 12, NOW, NOW, NOW]
	);

	// Soft-deleted mesocycle
	await dbExecute(
		`INSERT INTO mesocycles (id, program_id, weeks_count, deload_week_number, start_date, current_week, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['meso-del', 'prog-1', 4, 4, '2025-05-01', 1, NOW, NOW, NOW]
	);

	// Soft-deleted session (completed but deleted)
	await dbExecute(
		`INSERT INTO workout_sessions (id, program_id, training_day_id, status, started_at, completed_at, duration_seconds, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			'sess-del',
			'prog-1',
			'td-1',
			'completed',
			'2025-06-01T08:00:00.000Z',
			'2025-06-01T09:00:00.000Z',
			3600,
			NOW,
			NOW,
			NOW
		]
	);

	// Soft-deleted set
	await dbExecute(
		`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['set-del', 'sess-1', 'ex-1', 'ea-1', 99, 'working', 60, 5, 0, 1, NOW, NOW, NOW]
	);

	// In-progress session (not completed — should be excluded from workout CSV)
	await dbExecute(
		`INSERT INTO workout_sessions (id, program_id, training_day_id, status, started_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		['sess-ip', 'prog-1', 'td-1', 'in_progress', '2025-06-14T08:00:00.000Z', NOW, NOW]
	);
	await dbExecute(
		`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		['set-ip', 'sess-ip', 'ex-1', 'ea-1', 1, 'working', 70, 8, 3, 0, NOW, NOW]
	);

	// Soft-deleted body weight entry
	await dbExecute(
		`INSERT INTO body_weight_entries (id, date, weight_kg, created_at, updated_at, deleted_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		['bw-del', '2025-06-05', 83.0, NOW, NOW, NOW]
	);
}

// ── Tests ──

describe('Export Service', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		// Clear all tables for a clean slate
		await dbExecute('DELETE FROM workout_sets');
		await dbExecute('DELETE FROM workout_sessions');
		await dbExecute('DELETE FROM exercise_assignments');
		await dbExecute('DELETE FROM training_days');
		await dbExecute('DELETE FROM mesocycles');
		await dbExecute('DELETE FROM programs');
		await dbExecute('DELETE FROM body_weight_entries');
		await dbExecute('DELETE FROM exercises');
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── escapeCSV ──

	describe('escapeCSV', () => {
		it('returns plain text unchanged', () => {
			expect(escapeCSV('hello')).toBe('hello');
		});

		it('wraps text with commas in double quotes', () => {
			expect(escapeCSV('hello, world')).toBe('"hello, world"');
		});

		it('doubles internal double quotes and wraps', () => {
			expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
		});

		it('wraps text with newlines in double quotes', () => {
			expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
		});

		it('wraps text with carriage returns in double quotes', () => {
			expect(escapeCSV('line1\rline2')).toBe('"line1\rline2"');
		});

		it('handles combined special characters', () => {
			expect(escapeCSV('a "b", c\nd')).toBe('"a ""b"", c\nd"');
		});

		it('converts null to empty string', () => {
			expect(escapeCSV(null)).toBe('');
		});

		it('converts undefined to empty string', () => {
			expect(escapeCSV(undefined)).toBe('');
		});

		it('converts numbers to string', () => {
			expect(escapeCSV(42)).toBe('42');
			expect(escapeCSV(3.14)).toBe('3.14');
		});
	});

	// ── formatCSVRow ──

	describe('formatCSVRow', () => {
		it('joins values with commas and trailing newline', () => {
			expect(formatCSVRow(['a', 'b', 'c'])).toBe('a,b,c\n');
		});

		it('escapes values within the row', () => {
			expect(formatCSVRow(['hello', 'a, b', '"x"'])).toBe('hello,"a, b","""x"""\n');
		});

		it('handles null/undefined in row', () => {
			expect(formatCSVRow([null, undefined, 'val'])).toBe(',,val\n');
		});
	});

	// ── generateWorkoutCSV ──

	describe('generateWorkoutCSV', () => {
		it('returns header-only CSV for empty database', async () => {
			const csv = await generateWorkoutCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			expect(lines).toHaveLength(1);
			expect(lines[0]).toBe(
				'Date,Program,Training Day,Exercise,Set #,Set Type,Weight (kg),Reps,RIR,Completed'
			);
		});

		it('produces correct header row', async () => {
			await seedTestData();
			const csv = await generateWorkoutCSV();
			const headerLine = csv.split('\n')[0];

			expect(headerLine).toBe(
				'Date,Program,Training Day,Exercise,Set #,Set Type,Weight (kg),Reps,RIR,Completed'
			);
		});

		it('produces correct number of data rows from completed sessions only', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const csv = await generateWorkoutCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			// Header + 6 data rows (3 sets per 2 completed sessions)
			// Soft-deleted session, soft-deleted set, in-progress session excluded
			expect(lines).toHaveLength(7);
		});

		it('excludes soft-deleted sessions and sets', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const csv = await generateWorkoutCSV();

			// Soft-deleted set had set_number=99, should not appear
			expect(csv).not.toContain('set-del');
			expect(csv).not.toContain(',99,');

			// Soft-deleted session started on 2025-06-01
			expect(csv).not.toContain('2025-06-01');
		});

		it('excludes in-progress sessions', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const csv = await generateWorkoutCSV();

			// In-progress session started on 2025-06-14
			expect(csv).not.toContain('2025-06-14');
		});

		it('correctly denormalizes date, program, training day, and exercise name', async () => {
			await seedTestData();
			const csv = await generateWorkoutCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			// Session 2 is more recent (2025-06-13), so its rows come first
			// Exercise ex-2 has name with commas and quotes: Squat, "Back"
			const firstDataLine = lines[1];
			expect(firstDataLine).toContain('2025-06-13');
			expect(firstDataLine).toContain('Push/Pull/Legs');
			expect(firstDataLine).toContain('Push Day');
			// The exercise name has special chars — it should be escaped
			expect(firstDataLine).toContain('"Squat, ""Back"""');
		});

		it('shows "Unknown Exercise" for sets referencing deleted exercises', async () => {
			await seedTestData();
			// Create a set referencing the deleted exercise
			await dbExecute(
				`INSERT INTO exercises (id, name, muscle_group, equipment, is_custom, is_compound, created_at, updated_at, deleted_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				['ex-gone', 'Gone Exercise', 'back', 'barbell', 0, 0, NOW, NOW, NOW]
			);
			await dbExecute(
				`INSERT INTO workout_sets (id, session_id, exercise_id, assignment_id, set_number, set_type, weight, reps, rir, completed, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				['set-orphan', 'sess-1', 'ex-gone', null, 4, 'working', 50, 12, 3, 1, NOW, NOW]
			);

			const csv = await generateWorkoutCSV();
			expect(csv).toContain('Unknown Exercise');
		});

		it('orders by date DESC then set number ASC', async () => {
			await seedTestData();
			const csv = await generateWorkoutCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			// First data rows should be from sess-2 (2025-06-13), then sess-1 (2025-06-10)
			expect(lines[1]).toContain('2025-06-13');
			expect(lines[4]).toContain('2025-06-10');
		});
	});

	// ── generateBodyWeightCSV ──

	describe('generateBodyWeightCSV', () => {
		it('returns header-only CSV for empty database', async () => {
			const csv = await generateBodyWeightCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			expect(lines).toHaveLength(1);
			expect(lines[0]).toBe('Date,Weight (kg)');
		});

		it('produces correct header and data rows', async () => {
			await seedTestData();
			const csv = await generateBodyWeightCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			expect(lines).toHaveLength(3); // header + 2 entries
			expect(lines[0]).toBe('Date,Weight (kg)');
			// DESC order: 2025-06-13 first
			expect(lines[1]).toBe('2025-06-13,82');
			expect(lines[2]).toBe('2025-06-10,82.5');
		});

		it('excludes soft-deleted entries', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const csv = await generateBodyWeightCSV();
			const lines = csv.split('\n').filter((l) => l.length > 0);

			// Only 2 active entries, deleted one excluded
			expect(lines).toHaveLength(3);
			expect(csv).not.toContain('2025-06-05');
		});
	});

	// ── generateFullJSON ──

	describe('generateFullJSON', () => {
		it('returns valid JSON for empty database', async () => {
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			expect(data.exported_at).toBeTruthy();
			expect(data.version).toBe(1);
			expect(data.exercises).toEqual([]);
			expect(data.programs).toEqual([]);
			expect(data.mesocycles).toEqual([]);
			expect(data.workout_sessions).toEqual([]);
			expect(data.body_weight_entries).toEqual([]);
		});

		it('contains exported_at and version fields', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			expect(data.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(data.version).toBe(1);
		});

		it('contains all expected top-level keys', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			expect(Object.keys(data)).toEqual(
				expect.arrayContaining([
					'exported_at',
					'version',
					'exercises',
					'programs',
					'mesocycles',
					'workout_sessions',
					'body_weight_entries'
				])
			);
		});

		it('excludes soft-deleted rows from all arrays', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const json = await generateFullJSON();
			const data = JSON.parse(json);

			// Only 2 active exercises, not the deleted one
			expect(data.exercises).toHaveLength(2);
			expect(data.exercises.find((e: Record<string, unknown>) => e.id === 'ex-del')).toBeUndefined();

			// Only 1 active program
			expect(data.programs).toHaveLength(1);
			expect(data.programs[0].id).toBe('prog-1');

			// Only 1 active mesocycle
			expect(data.mesocycles).toHaveLength(1);
			expect(data.mesocycles[0].id).toBe('meso-1');

			// 3 active sessions (2 completed + 1 in-progress). Deleted session excluded.
			expect(data.workout_sessions).toHaveLength(3);
			expect(
				data.workout_sessions.find((s: Record<string, unknown>) => s.id === 'sess-del')
			).toBeUndefined();

			// Only 2 active body weight entries
			expect(data.body_weight_entries).toHaveLength(2);
		});

		it('nests training_days with assignments inside programs', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			const program = data.programs[0];
			expect(program.training_days).toHaveLength(1);

			const day = program.training_days[0];
			expect(day.name).toBe('Push Day');
			expect(day.assignments).toHaveLength(2);
			expect(day.assignments[0].exercise_name).toBe('Bench Press');
		});

		it('nests sets inside workout sessions', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			// sess-2 comes first (DESC by started_at)
			const session = data.workout_sessions.find(
				(s: Record<string, unknown>) => s.id === 'sess-1'
			);
			expect(session.sets).toHaveLength(3);
			expect(session.sets[0].exercise_name).toBe('Bench Press');
		});

		it('includes exercise name in sets for self-containment', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			const session = data.workout_sessions.find(
				(s: Record<string, unknown>) => s.id === 'sess-2'
			);
			expect(session.sets[0].exercise_name).toBe('Squat, "Back"');
		});

		it('handles exercise with special characters in JSON', async () => {
			await seedTestData();
			const json = await generateFullJSON();
			const data = JSON.parse(json);

			const specialExercise = data.exercises.find(
				(e: Record<string, unknown>) => e.id === 'ex-2'
			);
			expect(specialExercise.name).toBe('Squat, "Back"');
		});

		it('excludes soft-deleted sets from session nesting', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const json = await generateFullJSON();
			const data = JSON.parse(json);

			const sess1 = data.workout_sessions.find(
				(s: Record<string, unknown>) => s.id === 'sess-1'
			);
			// Only 3 active sets, not the deleted one (set_number=99)
			expect(sess1.sets).toHaveLength(3);
			expect(
				sess1.sets.find((s: Record<string, unknown>) => s.id === 'set-del')
			).toBeUndefined();
		});

		it('excludes soft-deleted assignments from training day nesting', async () => {
			await seedTestData();
			await seedSoftDeletedData();

			const json = await generateFullJSON();
			const data = JSON.parse(json);

			const day = data.programs[0].training_days[0];
			// Only 2 active assignments, not the deleted one
			expect(day.assignments).toHaveLength(2);
			expect(
				day.assignments.find((a: Record<string, unknown>) => a.id === 'ea-del')
			).toBeUndefined();
		});
	});
});
