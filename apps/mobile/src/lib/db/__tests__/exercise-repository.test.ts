import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, _resetForTesting } = await import('../database.js');
const { ExerciseRepository } = await import('../repositories/exercise.js');
const { SEED_EXERCISES } = await import('../seed/exercises.js');
const { MUSCLE_GROUPS, EQUIPMENT_LIST } = await import('../../types/exercise.js');

// ── Helpers ──

/** Seed a standard exercise for tests that need one */
async function seedExercise(overrides: Record<string, unknown> = {}) {
	return ExerciseRepository.create({
		name: 'Bench Press',
		muscle_group: 'chest',
		equipment: 'barbell',
		is_compound: true,
		secondary_muscle_groups: ['triceps', 'shoulders'],
		...overrides
	});
}

/** Clear all exercises so CRUD tests start from a known empty state */
async function clearAllExercises() {
	await dbExecute('DELETE FROM exercises');
}

// ── Tests ──

describe('ExerciseRepository', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb(); // Fresh database for each test (includes seeding)
		await clearAllExercises(); // Start CRUD tests from empty
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── CRUD lifecycle ──

	describe('CRUD lifecycle', () => {
		it('create → getById → update → softDelete full cycle', async () => {
			// Create
			const exercise = await seedExercise();
			expect(exercise.id).toBeTruthy();
			expect(exercise.name).toBe('Bench Press');
			expect(exercise.muscle_group).toBe('chest');
			expect(exercise.equipment).toBe('barbell');
			expect(exercise.is_custom).toBe(true); // defaults to is_custom=1
			expect(exercise.is_compound).toBe(true);
			expect(exercise.secondary_muscle_groups).toEqual(['triceps', 'shoulders']);
			expect(exercise.created_at).toBeTruthy();
			expect(exercise.updated_at).toBeTruthy();
			expect(exercise.deleted_at).toBeNull();

			// GetById
			const fetched = await ExerciseRepository.getById(exercise.id);
			expect(fetched).not.toBeNull();
			expect(fetched!.id).toBe(exercise.id);
			expect(fetched!.name).toBe('Bench Press');

			// Update
			const updated = await ExerciseRepository.update(exercise.id, {
				name: 'Incline Bench Press',
				description: 'On an incline bench'
			});
			expect(updated).not.toBeNull();
			expect(updated!.name).toBe('Incline Bench Press');
			expect(updated!.description).toBe('On an incline bench');
			expect(updated!.muscle_group).toBe('chest'); // unchanged
			expect(updated!.updated_at).not.toBe(exercise.updated_at);

			// Soft delete
			const deleted = await ExerciseRepository.softDelete(exercise.id);
			expect(deleted).toBe(true);

			// No longer returned by getById
			const afterDelete = await ExerciseRepository.getById(exercise.id);
			expect(afterDelete).toBeNull();

			// No longer in getAll
			const all = await ExerciseRepository.getAll();
			expect(all.find((e) => e.id === exercise.id)).toBeUndefined();
		});

		it('create sets is_custom to true by default', async () => {
			const exercise = await seedExercise();
			expect(exercise.is_custom).toBe(true);
		});

		it('create can set is_custom to false', async () => {
			const exercise = await seedExercise({ is_custom: false });
			expect(exercise.is_custom).toBe(false);
		});

		it('create handles null description', async () => {
			const exercise = await seedExercise({ description: null });
			expect(exercise.description).toBeNull();
		});

		it('create handles empty secondary_muscle_groups', async () => {
			const exercise = await seedExercise({ secondary_muscle_groups: [] });
			expect(exercise.secondary_muscle_groups).toEqual([]);
		});

		it('create handles no secondary_muscle_groups', async () => {
			const exercise = await ExerciseRepository.create({
				name: 'Curl',
				muscle_group: 'biceps',
				equipment: 'dumbbell'
			});
			expect(exercise.secondary_muscle_groups).toEqual([]);
		});

		it('update with no fields still returns the exercise', async () => {
			const exercise = await seedExercise();
			const result = await ExerciseRepository.update(exercise.id, {});
			expect(result).not.toBeNull();
			expect(result!.name).toBe('Bench Press');
		});

		it('update returns null for non-existent id', async () => {
			const result = await ExerciseRepository.update('00000000-0000-0000-0000-000000000000', { name: 'Foo' });
			expect(result).toBeNull();
		});

		it('softDelete returns false for non-existent id', async () => {
			const result = await ExerciseRepository.softDelete('non-existent-id');
			expect(result).toBe(false);
		});

		it('softDelete returns false for already-deleted exercise', async () => {
			const exercise = await seedExercise();
			await ExerciseRepository.softDelete(exercise.id);
			const secondDelete = await ExerciseRepository.softDelete(exercise.id);
			expect(secondDelete).toBe(false);
		});
	});

	// ── Secondary muscle groups JSON serialization ──

	describe('secondary muscle groups serialization', () => {
		it('stores and retrieves multiple secondary muscle groups', async () => {
			const exercise = await seedExercise({
				secondary_muscle_groups: ['triceps', 'shoulders', 'abs']
			});
			expect(exercise.secondary_muscle_groups).toEqual(['triceps', 'shoulders', 'abs']);

			const fetched = await ExerciseRepository.getById(exercise.id);
			expect(fetched!.secondary_muscle_groups).toEqual(['triceps', 'shoulders', 'abs']);
		});

		it('update can change secondary muscle groups', async () => {
			const exercise = await seedExercise();
			const updated = await ExerciseRepository.update(exercise.id, {
				secondary_muscle_groups: ['glutes', 'hamstrings']
			});
			expect(updated!.secondary_muscle_groups).toEqual(['glutes', 'hamstrings']);
		});

		it('update can clear secondary muscle groups', async () => {
			const exercise = await seedExercise();
			const updated = await ExerciseRepository.update(exercise.id, {
				secondary_muscle_groups: []
			});
			expect(updated!.secondary_muscle_groups).toEqual([]);
		});
	});

	// ── Search ──

	describe('search', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Bench Press' });
			await seedExercise({ name: 'Incline Bench Press' });
			await seedExercise({ name: 'Squat', muscle_group: 'quadriceps' });
		});

		it('finds exact match', async () => {
			const results = await ExerciseRepository.search('Squat');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Squat');
		});

		it('finds partial match', async () => {
			const results = await ExerciseRepository.search('Bench');
			expect(results).toHaveLength(2);
		});

		it('is case-insensitive', async () => {
			const results = await ExerciseRepository.search('bench');
			expect(results).toHaveLength(2);
		});

		it('returns empty for no match', async () => {
			const results = await ExerciseRepository.search('Deadlift');
			expect(results).toHaveLength(0);
		});

		it('excludes soft-deleted exercises', async () => {
			const exercises = await ExerciseRepository.getAll();
			await ExerciseRepository.softDelete(exercises[0].id);

			const results = await ExerciseRepository.search('Bench');
			expect(results.length).toBeLessThan(2);
		});
	});

	// ── Filter by muscle group ──

	describe('filterByMuscleGroup', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Bench Press', muscle_group: 'chest' });
			await seedExercise({ name: 'Fly', muscle_group: 'chest', equipment: 'dumbbell' });
			await seedExercise({ name: 'Squat', muscle_group: 'quadriceps' });
		});

		it('returns only exercises with matching muscle group', async () => {
			const results = await ExerciseRepository.filterByMuscleGroup('chest');
			expect(results).toHaveLength(2);
			expect(results.every((e) => e.muscle_group === 'chest')).toBe(true);
		});

		it('returns empty for unused muscle group', async () => {
			const results = await ExerciseRepository.filterByMuscleGroup('calves');
			expect(results).toHaveLength(0);
		});
	});

	// ── Filter by equipment ──

	describe('filterByEquipment', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Bench Press', equipment: 'barbell' });
			await seedExercise({ name: 'Fly', equipment: 'dumbbell' });
			await seedExercise({ name: 'Pull Up', equipment: 'bodyweight', muscle_group: 'back' });
		});

		it('returns only exercises with matching equipment', async () => {
			const results = await ExerciseRepository.filterByEquipment('barbell');
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Bench Press');
		});

		it('returns empty for unused equipment', async () => {
			const results = await ExerciseRepository.filterByEquipment('kettlebell');
			expect(results).toHaveLength(0);
		});
	});

	// ── Combined filter ──

	describe('combinedFilter', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Bench Press', muscle_group: 'chest', equipment: 'barbell' });
			await seedExercise({ name: 'Dumbbell Fly', muscle_group: 'chest', equipment: 'dumbbell' });
			await seedExercise({ name: 'Barbell Squat', muscle_group: 'quadriceps', equipment: 'barbell' });
			await seedExercise({ name: 'Lat Pulldown', muscle_group: 'back', equipment: 'cable' });
		});

		it('filters by muscle group + equipment', async () => {
			const results = await ExerciseRepository.combinedFilter({
				muscleGroup: 'chest',
				equipment: 'barbell'
			});
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Bench Press');
		});

		it('filters by search + muscle group', async () => {
			const results = await ExerciseRepository.combinedFilter({
				search: 'Bench',
				muscleGroup: 'chest'
			});
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Bench Press');
		});

		it('filters by all three params', async () => {
			const results = await ExerciseRepository.combinedFilter({
				search: 'Bench',
				muscleGroup: 'chest',
				equipment: 'barbell'
			});
			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Bench Press');
		});

		it('returns all when no filters given', async () => {
			const results = await ExerciseRepository.combinedFilter({});
			expect(results).toHaveLength(4);
		});

		it('returns empty when filters match nothing', async () => {
			const results = await ExerciseRepository.combinedFilter({
				muscleGroup: 'chest',
				equipment: 'cable'
			});
			expect(results).toHaveLength(0);
		});
	});

	// ── Pagination ──

	describe('pagination', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Alpha' });
			await seedExercise({ name: 'Bravo' });
			await seedExercise({ name: 'Charlie' });
			await seedExercise({ name: 'Delta' });
			await seedExercise({ name: 'Echo' });
		});

		it('getAll returns all exercises without pagination', async () => {
			const results = await ExerciseRepository.getAll();
			expect(results).toHaveLength(5);
		});

		it('getAll with limit returns limited results', async () => {
			const results = await ExerciseRepository.getAll({ limit: 2 });
			expect(results).toHaveLength(2);
			// Ordered by name ASC
			expect(results[0].name).toBe('Alpha');
			expect(results[1].name).toBe('Bravo');
		});

		it('getAll with limit and offset paginates correctly', async () => {
			const page1 = await ExerciseRepository.getAll({ limit: 2, offset: 0 });
			const page2 = await ExerciseRepository.getAll({ limit: 2, offset: 2 });
			const page3 = await ExerciseRepository.getAll({ limit: 2, offset: 4 });

			expect(page1).toHaveLength(2);
			expect(page2).toHaveLength(2);
			expect(page3).toHaveLength(1);

			expect(page1[0].name).toBe('Alpha');
			expect(page2[0].name).toBe('Charlie');
			expect(page3[0].name).toBe('Echo');
		});
	});

	// ── Validation ──

	describe('validation', () => {
		it('create rejects missing name', async () => {
			await expect(
				ExerciseRepository.create({
					name: '',
					muscle_group: 'chest',
					equipment: 'barbell'
				})
			).rejects.toThrow();
		});

		it('create rejects invalid muscle group', async () => {
			await expect(
				ExerciseRepository.create({
					name: 'Bad Exercise',
					muscle_group: 'invalid_group' as any,
					equipment: 'barbell'
				})
			).rejects.toThrow();
		});

		it('create rejects invalid equipment', async () => {
			await expect(
				ExerciseRepository.create({
					name: 'Bad Exercise',
					muscle_group: 'chest',
					equipment: 'invalid_equipment' as any
				})
			).rejects.toThrow();
		});

		it('create rejects name exceeding max length', async () => {
			await expect(
				ExerciseRepository.create({
					name: 'x'.repeat(201),
					muscle_group: 'chest',
					equipment: 'barbell'
				})
			).rejects.toThrow();
		});

		it('update rejects invalid muscle group', async () => {
			const exercise = await seedExercise();
			await expect(
				ExerciseRepository.update(exercise.id, {
					muscle_group: 'invalid_group' as any
				})
			).rejects.toThrow();
		});

		it('update rejects invalid equipment', async () => {
			const exercise = await seedExercise();
			await expect(
				ExerciseRepository.update(exercise.id, {
					equipment: 'invalid_equipment' as any
				})
			).rejects.toThrow();
		});
	});

	// ── Soft delete filtering ──

	describe('soft delete filtering', () => {
		it('soft-deleted exercises are hidden from all read methods', async () => {
			const exercise = await seedExercise({ name: 'To Delete' });
			await ExerciseRepository.softDelete(exercise.id);

			// getAll
			const all = await ExerciseRepository.getAll();
			expect(all.find((e) => e.id === exercise.id)).toBeUndefined();

			// getById
			const byId = await ExerciseRepository.getById(exercise.id);
			expect(byId).toBeNull();

			// search
			const searched = await ExerciseRepository.search('To Delete');
			expect(searched).toHaveLength(0);

			// filterByMuscleGroup
			const byMuscle = await ExerciseRepository.filterByMuscleGroup('chest');
			expect(byMuscle.find((e) => e.id === exercise.id)).toBeUndefined();

			// filterByEquipment
			const byEquip = await ExerciseRepository.filterByEquipment('barbell');
			expect(byEquip.find((e) => e.id === exercise.id)).toBeUndefined();

			// combinedFilter
			const combined = await ExerciseRepository.combinedFilter({ search: 'To Delete' });
			expect(combined).toHaveLength(0);
		});

		it('soft-deleted exercise still exists in raw DB', async () => {
			const exercise = await seedExercise();
			await ExerciseRepository.softDelete(exercise.id);

			const { dbQuery: rawQuery } = await import('../database.js');
			const rows = await rawQuery<{ id: string; deleted_at: string | null }>(
				'SELECT id, deleted_at FROM exercises WHERE id = ?',
				[exercise.id]
			);
			expect(rows).toHaveLength(1);
			expect(rows[0].deleted_at).toBeTruthy();
		});
	});

	// ── getCount ──

	describe('getCount', () => {
		beforeEach(async () => {
			await seedExercise({ name: 'Bench Press', muscle_group: 'chest', equipment: 'barbell' });
			await seedExercise({ name: 'Fly', muscle_group: 'chest', equipment: 'dumbbell' });
			await seedExercise({ name: 'Squat', muscle_group: 'quadriceps', equipment: 'barbell' });
		});

		it('returns total count without filters', async () => {
			const count = await ExerciseRepository.getCount();
			expect(count).toBe(3);
		});

		it('returns count filtered by muscle group', async () => {
			const count = await ExerciseRepository.getCount({ muscleGroup: 'chest' });
			expect(count).toBe(2);
		});

		it('returns count filtered by equipment', async () => {
			const count = await ExerciseRepository.getCount({ equipment: 'barbell' });
			expect(count).toBe(2);
		});

		it('returns count filtered by both', async () => {
			const count = await ExerciseRepository.getCount({
				muscleGroup: 'chest',
				equipment: 'barbell'
			});
			expect(count).toBe(1);
		});

		it('excludes soft-deleted from count', async () => {
			const all = await ExerciseRepository.getAll();
			await ExerciseRepository.softDelete(all[0].id);

			const count = await ExerciseRepository.getCount();
			expect(count).toBe(2);
		});

		it('returns 0 for empty database', async () => {
			// Delete all
			const all = await ExerciseRepository.getAll();
			for (const e of all) {
				await ExerciseRepository.softDelete(e.id);
			}

			const count = await ExerciseRepository.getCount();
			expect(count).toBe(0);
		});
	});

	// ── Empty database ──

	describe('empty database', () => {
		it('getAll returns empty array', async () => {
			const results = await ExerciseRepository.getAll();
			expect(results).toEqual([]);
		});

		it('getById returns null', async () => {
			const result = await ExerciseRepository.getById('non-existent');
			expect(result).toBeNull();
		});

		it('search returns empty array', async () => {
			const results = await ExerciseRepository.search('anything');
			expect(results).toEqual([]);
		});

		it('getCount returns 0', async () => {
			const count = await ExerciseRepository.getCount();
			expect(count).toBe(0);
		});
	});

	// ── Duplicate names ──

	describe('duplicate names', () => {
		it('allows exercises with the same name', async () => {
			await seedExercise({ name: 'Curl' });
			await seedExercise({ name: 'Curl' });

			const results = await ExerciseRepository.search('Curl');
			expect(results).toHaveLength(2);
		});
	});
});

// ── Seed data verification ──

describe('Seed data', () => {
	beforeEach(async () => {
		_resetForTesting();
		// getDb() triggers schema migration + seeding (table is empty on fresh DB)
		await getDb();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	it('seeds exercises on first database initialization', async () => {
		const count = await ExerciseRepository.getCount();
		expect(count).toBeGreaterThanOrEqual(55);
		expect(count).toBe(SEED_EXERCISES.length);
	});

	it('does not re-seed if exercises already exist', async () => {
		const countBefore = await ExerciseRepository.getCount();

		// Reset and re-init — should not double the exercises
		_resetForTesting();
		await getDb();

		const countAfter = await ExerciseRepository.getCount();
		expect(countAfter).toBe(countBefore);
	});

	it('all MuscleGroup values have at least one exercise', async () => {
		const all = await ExerciseRepository.getAll();
		const muscleGroups = new Set(all.map((e) => e.muscle_group));

		for (const mg of MUSCLE_GROUPS) {
			expect(muscleGroups.has(mg), `Missing muscle group: ${mg}`).toBe(true);
		}
	});

	it('all Equipment values have at least one exercise', async () => {
		const all = await ExerciseRepository.getAll();
		const equipment = new Set(all.map((e) => e.equipment));

		for (const eq of EQUIPMENT_LIST) {
			expect(equipment.has(eq), `Missing equipment: ${eq}`).toBe(true);
		}
	});

	it('all seeded exercises have descriptions', async () => {
		const all = await ExerciseRepository.getAll();
		for (const exercise of all) {
			expect(exercise.description, `${exercise.name} missing description`).toBeTruthy();
		}
	});

	it('seeded exercises have is_custom set to false', async () => {
		const all = await ExerciseRepository.getAll();
		for (const exercise of all) {
			expect(exercise.is_custom, `${exercise.name} should not be custom`).toBe(false);
		}
	});

	it('secondary_muscle_groups are properly parsed as arrays', async () => {
		const all = await ExerciseRepository.getAll();
		for (const exercise of all) {
			expect(Array.isArray(exercise.secondary_muscle_groups), `${exercise.name} secondary_muscle_groups should be array`).toBe(true);
		}
	});

	it('includes both compound and isolation exercises', async () => {
		const all = await ExerciseRepository.getAll();
		const compound = all.filter((e) => e.is_compound);
		const isolation = all.filter((e) => !e.is_compound);

		expect(compound.length).toBeGreaterThan(0);
		expect(isolation.length).toBeGreaterThan(0);
		// Should have a reasonable mix
		expect(compound.length).toBeGreaterThanOrEqual(15);
		expect(isolation.length).toBeGreaterThanOrEqual(15);
	});
});
