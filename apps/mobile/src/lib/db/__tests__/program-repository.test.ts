import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, dbQuery, _resetForTesting } = await import('../database.js');
const { ProgramRepository } = await import('../repositories/program.js');
const {
	programInsertSchema,
	exerciseAssignmentInsertSchema,
	mesocycleInsertSchema,
	trainingDayInsertSchema
} = await import('../../types/program.js');

// ── Helpers ──

/** Clear all program-related tables */
async function clearAllPrograms() {
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
}

/** Seed a standard program for tests */
async function seedProgram(overrides: Record<string, unknown> = {}) {
	return ProgramRepository.createProgram({
		name: 'Push Pull Legs',
		description: 'A PPL split',
		...overrides
	});
}

/** Seed a program with training days */
async function seedProgramWithDays() {
	return ProgramRepository.createProgram(
		{ name: 'Full Program', description: 'With days' },
		[
			{ name: 'Push Day' },
			{ name: 'Pull Day' },
			{ name: 'Leg Day' }
		]
	);
}

// A valid UUID for exercise_id references
const EXERCISE_UUID = '00000000-0000-4000-8000-000000000001';

// ── Tests ──

describe('ProgramRepository', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAllPrograms();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── CRUD lifecycle ──

	describe('CRUD lifecycle', () => {
		it('create → getById → update → softDelete full cycle', async () => {
			// Create
			const program = await seedProgram();
			expect(program.id).toBeTruthy();
			expect(program.name).toBe('Push Pull Legs');
			expect(program.description).toBe('A PPL split');
			expect(program.created_at).toBeTruthy();
			expect(program.updated_at).toBeTruthy();
			expect(program.deleted_at).toBeNull();

			// GetById
			const fetched = await ProgramRepository.getById(program.id);
			expect(fetched).not.toBeNull();
			expect(fetched!.id).toBe(program.id);
			expect(fetched!.name).toBe('Push Pull Legs');
			expect(fetched!.trainingDays).toEqual([]);

			// Update
			const updated = await ProgramRepository.updateProgram(program.id, {
				name: 'Upper Lower',
				description: 'An UL split'
			});
			expect(updated).not.toBeNull();
			expect(updated!.name).toBe('Upper Lower');
			expect(updated!.description).toBe('An UL split');
			expect(updated!.updated_at).not.toBe(program.updated_at);

			// Soft delete
			const deleted = await ProgramRepository.softDeleteProgram(program.id);
			expect(deleted).toBe(true);

			// No longer returned
			const afterDelete = await ProgramRepository.getById(program.id);
			expect(afterDelete).toBeNull();

			const all = await ProgramRepository.getAll();
			expect(all.find((p) => p.id === program.id)).toBeUndefined();
		});

		it('create handles null description', async () => {
			const program = await seedProgram({ description: null });
			expect(program.description).toBeNull();
		});

		it('create handles missing description', async () => {
			const program = await ProgramRepository.createProgram({ name: 'Minimal' });
			expect(program.description).toBeNull();
		});

		it('update with no fields returns the program unchanged', async () => {
			const program = await seedProgram();
			const result = await ProgramRepository.updateProgram(program.id, {});
			expect(result).not.toBeNull();
			expect(result!.name).toBe('Push Pull Legs');
		});

		it('update returns null for non-existent id', async () => {
			const result = await ProgramRepository.updateProgram(
				'00000000-0000-4000-8000-000000000099',
				{ name: 'Foo' }
			);
			expect(result).toBeNull();
		});

		it('softDelete returns false for non-existent id', async () => {
			const result = await ProgramRepository.softDeleteProgram('non-existent');
			expect(result).toBe(false);
		});

		it('softDelete returns false for already-deleted program', async () => {
			const program = await seedProgram();
			await ProgramRepository.softDeleteProgram(program.id);
			const secondDelete = await ProgramRepository.softDeleteProgram(program.id);
			expect(secondDelete).toBe(false);
		});

		it('getAll returns programs ordered by name', async () => {
			await seedProgram({ name: 'Zulu Program' });
			await seedProgram({ name: 'Alpha Program' });
			await seedProgram({ name: 'Mike Program' });

			const all = await ProgramRepository.getAll();
			expect(all).toHaveLength(3);
			expect(all[0].name).toBe('Alpha Program');
			expect(all[1].name).toBe('Mike Program');
			expect(all[2].name).toBe('Zulu Program');
		});
	});

	// ── Create with training days (transaction) ──

	describe('createProgram with training days', () => {
		it('creates program and training days atomically', async () => {
			const program = await seedProgramWithDays();
			expect(program.id).toBeTruthy();

			const full = await ProgramRepository.getById(program.id);
			expect(full).not.toBeNull();
			expect(full!.trainingDays).toHaveLength(3);
			expect(full!.trainingDays[0].name).toBe('Push Day');
			expect(full!.trainingDays[0].sort_order).toBe(0);
			expect(full!.trainingDays[1].name).toBe('Pull Day');
			expect(full!.trainingDays[1].sort_order).toBe(1);
			expect(full!.trainingDays[2].name).toBe('Leg Day');
			expect(full!.trainingDays[2].sort_order).toBe(2);
		});

		it('rolls back on training day validation failure', async () => {
			await expect(
				ProgramRepository.createProgram(
					{ name: 'Bad Program' },
					[
						{ name: 'Good Day' },
						{ name: '' } // Invalid: empty name
					]
				)
			).rejects.toThrow();

			// Program should not exist after rollback
			const all = await ProgramRepository.getAll();
			expect(all).toHaveLength(0);
		});
	});

	// ── Training Day management ──

	describe('Training day management', () => {
		it('add training day with auto sort_order', async () => {
			const program = await seedProgram();

			const day1 = await ProgramRepository.addTrainingDay(program.id, { name: 'Day A' });
			expect(day1.sort_order).toBe(0);
			expect(day1.name).toBe('Day A');
			expect(day1.program_id).toBe(program.id);

			const day2 = await ProgramRepository.addTrainingDay(program.id, { name: 'Day B' });
			expect(day2.sort_order).toBe(1);

			const day3 = await ProgramRepository.addTrainingDay(program.id, { name: 'Day C' });
			expect(day3.sort_order).toBe(2);
		});

		it('add training day with explicit sort_order', async () => {
			const program = await seedProgram();

			const day = await ProgramRepository.addTrainingDay(program.id, {
				name: 'Day X',
				sort_order: 5
			});
			expect(day.sort_order).toBe(5);
		});

		it('update training day name', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Old Name' });

			const updated = await ProgramRepository.updateTrainingDay(day.id, {
				name: 'New Name'
			});
			expect(updated).not.toBeNull();
			expect(updated!.name).toBe('New Name');
		});

		it('update training day with no fields returns it unchanged', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Day' });

			const result = await ProgramRepository.updateTrainingDay(day.id, {});
			expect(result).not.toBeNull();
			expect(result!.name).toBe('Day');
		});

		it('remove training day (soft-delete)', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'To Remove' });

			const removed = await ProgramRepository.removeTrainingDay(day.id);
			expect(removed).toBe(true);

			// Should not appear in getById
			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays).toHaveLength(0);
		});

		it('remove last training day works', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Only Day' });

			const removed = await ProgramRepository.removeTrainingDay(day.id);
			expect(removed).toBe(true);

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays).toHaveLength(0);
		});

		it('reorder training days', async () => {
			const program = await seedProgram();
			const day1 = await ProgramRepository.addTrainingDay(program.id, { name: 'First' });
			const day2 = await ProgramRepository.addTrainingDay(program.id, { name: 'Second' });
			const day3 = await ProgramRepository.addTrainingDay(program.id, { name: 'Third' });

			// Reverse order
			await ProgramRepository.reorderTrainingDays(program.id, [day3.id, day2.id, day1.id]);

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays[0].name).toBe('Third');
			expect(full!.trainingDays[0].sort_order).toBe(0);
			expect(full!.trainingDays[1].name).toBe('Second');
			expect(full!.trainingDays[1].sort_order).toBe(1);
			expect(full!.trainingDays[2].name).toBe('First');
			expect(full!.trainingDays[2].sort_order).toBe(2);
		});
	});

	// ── Exercise Assignment management ──

	describe('Exercise assignment management', () => {
		it('add exercise assignment with defaults', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });

			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});

			expect(assignment.id).toBeTruthy();
			expect(assignment.training_day_id).toBe(day.id);
			expect(assignment.exercise_id).toBe(EXERCISE_UUID);
			expect(assignment.sort_order).toBe(0);
			expect(assignment.target_sets).toBe(3);
			expect(assignment.min_reps).toBe(8);
			expect(assignment.max_reps).toBe(12);
		});

		it('add exercise assignment with custom values', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });

			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID,
				target_sets: 5,
				min_reps: 3,
				max_reps: 5
			});

			expect(assignment.target_sets).toBe(5);
			expect(assignment.min_reps).toBe(3);
			expect(assignment.max_reps).toBe(5);
		});

		it('add multiple assignments with auto sort_order', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });

			const a1 = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});
			const a2 = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: '00000000-0000-4000-8000-000000000002'
			});

			expect(a1.sort_order).toBe(0);
			expect(a2.sort_order).toBe(1);
		});

		it('update exercise assignment', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });
			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});

			const updated = await ProgramRepository.updateExerciseAssignment(assignment.id, {
				target_sets: 4,
				min_reps: 6,
				max_reps: 10
			});

			expect(updated).not.toBeNull();
			expect(updated!.target_sets).toBe(4);
			expect(updated!.min_reps).toBe(6);
			expect(updated!.max_reps).toBe(10);
		});

		it('update exercise assignment with no fields returns unchanged', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });
			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});

			const result = await ProgramRepository.updateExerciseAssignment(assignment.id, {});
			expect(result).not.toBeNull();
			expect(result!.target_sets).toBe(3);
		});

		it('remove exercise assignment (soft-delete)', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });
			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});

			const removed = await ProgramRepository.removeExerciseAssignment(assignment.id);
			expect(removed).toBe(true);

			// Should not appear in nested loading
			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays[0].assignments).toHaveLength(0);
		});

		it('reorder exercise assignments', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Push' });

			const a1 = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});
			const a2 = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: '00000000-0000-4000-8000-000000000002'
			});
			const a3 = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: '00000000-0000-4000-8000-000000000003'
			});

			// Reverse order
			await ProgramRepository.reorderExerciseAssignments(day.id, [a3.id, a1.id, a2.id]);

			const full = await ProgramRepository.getById(program.id);
			const assignments = full!.trainingDays[0].assignments;
			expect(assignments[0].id).toBe(a3.id);
			expect(assignments[0].sort_order).toBe(0);
			expect(assignments[1].id).toBe(a1.id);
			expect(assignments[1].sort_order).toBe(1);
			expect(assignments[2].id).toBe(a2.id);
			expect(assignments[2].sort_order).toBe(2);
		});
	});

	// ── Nested loading ──

	describe('Nested loading (getById)', () => {
		it('returns ProgramWithDays with populated trainingDays and assignments', async () => {
			const program = await seedProgramWithDays();

			// Add assignments to first day
			const full = await ProgramRepository.getById(program.id);
			const pushDay = full!.trainingDays[0];

			await ProgramRepository.addExerciseAssignment(pushDay.id, {
				exercise_id: EXERCISE_UUID,
				target_sets: 4,
				min_reps: 6,
				max_reps: 8
			});
			await ProgramRepository.addExerciseAssignment(pushDay.id, {
				exercise_id: '00000000-0000-4000-8000-000000000002',
				target_sets: 3,
				min_reps: 10,
				max_reps: 12
			});

			const loaded = await ProgramRepository.getById(program.id);
			expect(loaded).not.toBeNull();
			expect(loaded!.name).toBe('Full Program');
			expect(loaded!.trainingDays).toHaveLength(3);

			// First day has 2 assignments
			expect(loaded!.trainingDays[0].assignments).toHaveLength(2);
			expect(loaded!.trainingDays[0].assignments[0].target_sets).toBe(4);
			expect(loaded!.trainingDays[0].assignments[1].target_sets).toBe(3);

			// Other days have no assignments
			expect(loaded!.trainingDays[1].assignments).toHaveLength(0);
			expect(loaded!.trainingDays[2].assignments).toHaveLength(0);
		});

		it('returns training days ordered by sort_order', async () => {
			const program = await seedProgram();
			await ProgramRepository.addTrainingDay(program.id, {
				name: 'C Day',
				sort_order: 2
			});
			await ProgramRepository.addTrainingDay(program.id, {
				name: 'A Day',
				sort_order: 0
			});
			await ProgramRepository.addTrainingDay(program.id, {
				name: 'B Day',
				sort_order: 1
			});

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays[0].name).toBe('A Day');
			expect(full!.trainingDays[1].name).toBe('B Day');
			expect(full!.trainingDays[2].name).toBe('C Day');
		});

		it('returns null for non-existent program', async () => {
			const result = await ProgramRepository.getById('non-existent');
			expect(result).toBeNull();
		});
	});

	// ── Mesocycle ──

	describe('Mesocycle management', () => {
		it('create mesocycle with defaults', async () => {
			const program = await seedProgram();
			const meso = await ProgramRepository.createMesocycle(program.id, {});

			expect(meso.id).toBeTruthy();
			expect(meso.program_id).toBe(program.id);
			expect(meso.weeks_count).toBe(4);
			expect(meso.deload_week_number).toBe(0);
			expect(meso.start_date).toBeNull();
			expect(meso.current_week).toBe(1);
		});

		it('create mesocycle with custom values', async () => {
			const program = await seedProgram();
			const meso = await ProgramRepository.createMesocycle(program.id, {
				weeks_count: 6,
				deload_week_number: 6,
				start_date: '2026-01-01',
				current_week: 1
			});

			expect(meso.weeks_count).toBe(6);
			expect(meso.deload_week_number).toBe(6);
			expect(meso.start_date).toBe('2026-01-01');
		});

		it('get mesocycle by program id', async () => {
			const program = await seedProgram();
			await ProgramRepository.createMesocycle(program.id, { weeks_count: 8 });

			const meso = await ProgramRepository.getMesocycleByProgramId(program.id);
			expect(meso).not.toBeNull();
			expect(meso!.weeks_count).toBe(8);
		});

		it('getMesocycleByProgramId returns null when none exists', async () => {
			const program = await seedProgram();
			const meso = await ProgramRepository.getMesocycleByProgramId(program.id);
			expect(meso).toBeNull();
		});

		it('update mesocycle', async () => {
			const program = await seedProgram();
			const meso = await ProgramRepository.createMesocycle(program.id, {
				weeks_count: 4
			});

			const updated = await ProgramRepository.updateMesocycle(meso.id, {
				weeks_count: 6,
				current_week: 3,
				deload_week_number: 6
			});

			expect(updated).not.toBeNull();
			expect(updated!.weeks_count).toBe(6);
			expect(updated!.current_week).toBe(3);
			expect(updated!.deload_week_number).toBe(6);
		});

		it('update mesocycle with no fields returns unchanged', async () => {
			const program = await seedProgram();
			const meso = await ProgramRepository.createMesocycle(program.id, {
				weeks_count: 4
			});

			const result = await ProgramRepository.updateMesocycle(meso.id, {});
			expect(result).not.toBeNull();
			expect(result!.weeks_count).toBe(4);
		});
	});

	// ── Validation ──

	describe('Validation', () => {
		it('rejects empty program name', async () => {
			await expect(
				ProgramRepository.createProgram({ name: '' })
			).rejects.toThrow();
		});

		it('rejects program name exceeding max length', async () => {
			await expect(
				ProgramRepository.createProgram({ name: 'x'.repeat(201) })
			).rejects.toThrow();
		});

		it('rejects empty training day name', async () => {
			const program = await seedProgram();
			await expect(
				ProgramRepository.addTrainingDay(program.id, { name: '' })
			).rejects.toThrow();
		});

		it('rejects negative target_sets in exercise assignment', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Day' });

			await expect(
				ProgramRepository.addExerciseAssignment(day.id, {
					exercise_id: EXERCISE_UUID,
					target_sets: 0 // min is 1
				})
			).rejects.toThrow();
		});

		it('rejects negative min_reps in exercise assignment', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Day' });

			await expect(
				ProgramRepository.addExerciseAssignment(day.id, {
					exercise_id: EXERCISE_UUID,
					min_reps: 0 // min is 1
				})
			).rejects.toThrow();
		});

		it('rejects invalid UUID for exercise_id', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Day' });

			await expect(
				ProgramRepository.addExerciseAssignment(day.id, {
					exercise_id: 'not-a-uuid'
				})
			).rejects.toThrow();
		});

		it('rejects mesocycle weeks_count of 0', async () => {
			const program = await seedProgram();
			await expect(
				ProgramRepository.createMesocycle(program.id, {
					weeks_count: 0 // min is 1
				})
			).rejects.toThrow();
		});

		it('rejects negative deload_week_number', async () => {
			const program = await seedProgram();
			await expect(
				ProgramRepository.createMesocycle(program.id, {
					deload_week_number: -1
				})
			).rejects.toThrow();
		});

		it('Zod schemas provide field-level error detail', () => {
			const result = programInsertSchema.safeParse({ name: '' });
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues.length).toBeGreaterThan(0);
				expect(result.error.issues[0].path).toContain('name');
			}
		});

		it('exerciseAssignmentInsertSchema rejects target_sets > 20', () => {
			const result = exerciseAssignmentInsertSchema.safeParse({
				exercise_id: EXERCISE_UUID,
				target_sets: 21
			});
			expect(result.success).toBe(false);
		});

		it('mesocycleInsertSchema rejects weeks_count > 52', () => {
			const result = mesocycleInsertSchema.safeParse({
				weeks_count: 53
			});
			expect(result.success).toBe(false);
		});
	});

	// ── Soft-delete filtering ──

	describe('Soft-delete filtering', () => {
		it('deleted programs are hidden from getAll', async () => {
			const program = await seedProgram();
			await ProgramRepository.softDeleteProgram(program.id);

			const all = await ProgramRepository.getAll();
			expect(all.find((p) => p.id === program.id)).toBeUndefined();
		});

		it('deleted training days are hidden from getById', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, {
				name: 'Hidden Day'
			});
			await ProgramRepository.removeTrainingDay(day.id);

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays).toHaveLength(0);
		});

		it('deleted exercise assignments are hidden from getById', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Day' });
			const assignment = await ProgramRepository.addExerciseAssignment(day.id, {
				exercise_id: EXERCISE_UUID
			});
			await ProgramRepository.removeExerciseAssignment(assignment.id);

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays[0].assignments).toHaveLength(0);
		});

		it('soft-deleted data still exists in raw DB', async () => {
			const program = await seedProgram();
			await ProgramRepository.softDeleteProgram(program.id);

			const rows = await dbQuery<{ id: string; deleted_at: string | null }>(
				'SELECT id, deleted_at FROM programs WHERE id = ?',
				[program.id]
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].deleted_at).toBeTruthy();
		});
	});

	// ── Empty database ──

	describe('Empty database', () => {
		it('getAll returns empty array', async () => {
			const results = await ProgramRepository.getAll();
			expect(results).toEqual([]);
		});

		it('getById returns null', async () => {
			const result = await ProgramRepository.getById('non-existent');
			expect(result).toBeNull();
		});

		it('getMesocycleByProgramId returns null', async () => {
			const result = await ProgramRepository.getMesocycleByProgramId('non-existent');
			expect(result).toBeNull();
		});
	});

	// ── Edge cases ──

	describe('Edge cases', () => {
		it('duplicate program names are allowed', async () => {
			await seedProgram({ name: 'Same Name' });
			await seedProgram({ name: 'Same Name' });

			const all = await ProgramRepository.getAll();
			expect(all.filter((p) => p.name === 'Same Name')).toHaveLength(2);
		});

		it('removing last training day from a program works', async () => {
			const program = await seedProgram();
			const day = await ProgramRepository.addTrainingDay(program.id, { name: 'Only' });
			await ProgramRepository.removeTrainingDay(day.id);

			const full = await ProgramRepository.getById(program.id);
			expect(full!.trainingDays).toHaveLength(0);
		});

		it('program with multiple mesocycles returns the most recent', async () => {
			const program = await seedProgram();
			await ProgramRepository.createMesocycle(program.id, { weeks_count: 4 });
			// Small delay to ensure different created_at (same millisecond is fine for ordering)
			await ProgramRepository.createMesocycle(program.id, { weeks_count: 8 });

			const meso = await ProgramRepository.getMesocycleByProgramId(program.id);
			expect(meso).not.toBeNull();
			expect(meso!.weeks_count).toBe(8);
		});

		it('softDeleteProgram does not cascade to training days', async () => {
			const program = await seedProgramWithDays();
			await ProgramRepository.softDeleteProgram(program.id);

			// Training days still exist in raw DB
			const dayRows = await dbQuery<{ id: string; deleted_at: string | null }>(
				'SELECT id, deleted_at FROM training_days WHERE program_id = ?',
				[program.id]
			);
			expect(dayRows).toHaveLength(3);
			expect(dayRows.every((r) => r.deleted_at === null)).toBe(true);
		});
	});
});
