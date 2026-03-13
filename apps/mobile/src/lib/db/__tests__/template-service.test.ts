import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, _resetForTesting } = await import('../database.js');
const { ExerciseRepository } = await import('../repositories/exercise.js');
const { SEED_EXERCISES } = await import('../seed/exercises.js');
const { PROGRAM_TEMPLATES } = await import('../../data/templates/index.js');

// ── Helpers ──

/** Set of all exercise names from SEED_EXERCISES for quick lookup */
const SEED_EXERCISE_NAMES = new Set(SEED_EXERCISES.map((e) => e.name));

/** Clear all exercises so tests start from a known state */
async function clearAllExercises() {
	await dbExecute('DELETE FROM exercises');
}

/** Clear all program-related tables */
async function clearAllPrograms() {
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
}

// ── Template Data Integrity Tests ──

describe('template data integrity', () => {
	it('all template exercise names exist in SEED_EXERCISES', () => {
		const missingNames: string[] = [];

		for (const template of PROGRAM_TEMPLATES) {
			for (const day of template.days) {
				for (const exercise of day.exercises) {
					if (!SEED_EXERCISE_NAMES.has(exercise.name)) {
						missingNames.push(`${template.id}/${day.name}: "${exercise.name}"`);
					}
				}
			}
		}

		expect(missingNames, `Exercise names not found in SEED_EXERCISES:\n${missingNames.join('\n')}`).toHaveLength(0);
	});

	it('PPL template has 6 days', () => {
		const ppl = PROGRAM_TEMPLATES.find((t) => t.id === 'ppl');
		expect(ppl).toBeDefined();
		expect(ppl!.days).toHaveLength(6);
	});

	it('Upper/Lower template has 4 days', () => {
		const ul = PROGRAM_TEMPLATES.find((t) => t.id === 'upper-lower');
		expect(ul).toBeDefined();
		expect(ul!.days).toHaveLength(4);
	});

	it('Full Body template has 3 days', () => {
		const fb = PROGRAM_TEMPLATES.find((t) => t.id === 'full-body');
		expect(fb).toBeDefined();
		expect(fb!.days).toHaveLength(3);
	});

	it('PPL days each have 4-6 exercises', () => {
		const ppl = PROGRAM_TEMPLATES.find((t) => t.id === 'ppl')!;
		for (const day of ppl.days) {
			expect(
				day.exercises.length,
				`${day.name} has ${day.exercises.length} exercises (expected 4-6)`
			).toBeGreaterThanOrEqual(4);
			expect(day.exercises.length).toBeLessThanOrEqual(6);
		}
	});

	it('Upper/Lower days each have 5-6 exercises', () => {
		const ul = PROGRAM_TEMPLATES.find((t) => t.id === 'upper-lower')!;
		for (const day of ul.days) {
			expect(
				day.exercises.length,
				`${day.name} has ${day.exercises.length} exercises (expected 5-6)`
			).toBeGreaterThanOrEqual(5);
			expect(day.exercises.length).toBeLessThanOrEqual(6);
		}
	});

	it('Full Body days each have 6-8 exercises', () => {
		const fb = PROGRAM_TEMPLATES.find((t) => t.id === 'full-body')!;
		for (const day of fb.days) {
			expect(
				day.exercises.length,
				`${day.name} has ${day.exercises.length} exercises (expected 6-8)`
			).toBeGreaterThanOrEqual(6);
			expect(day.exercises.length).toBeLessThanOrEqual(8);
		}
	});

	it('no duplicate exercise names within a single day', () => {
		const duplicates: string[] = [];

		for (const template of PROGRAM_TEMPLATES) {
			for (const day of template.days) {
				const names = day.exercises.map((e) => e.name);
				const unique = new Set(names);
				if (unique.size !== names.length) {
					const dupes = names.filter((n, i) => names.indexOf(n) !== i);
					duplicates.push(`${template.id}/${day.name}: ${dupes.join(', ')}`);
				}
			}
		}

		expect(duplicates, `Duplicate exercises found:\n${duplicates.join('\n')}`).toHaveLength(0);
	});

	it('all templates have valid mesocycle defaults', () => {
		for (const template of PROGRAM_TEMPLATES) {
			expect(template.mesocycleDefaults.weeksCount, `${template.id} weeksCount`).toBeGreaterThan(0);
			expect(
				template.mesocycleDefaults.deloadWeekNumber,
				`${template.id} deloadWeekNumber`
			).toBeLessThanOrEqual(template.mesocycleDefaults.weeksCount);
		}
	});

	it('all exercise definitions have valid rep ranges', () => {
		for (const template of PROGRAM_TEMPLATES) {
			for (const day of template.days) {
				for (const exercise of day.exercises) {
					expect(exercise.targetSets, `${template.id}/${day.name}/${exercise.name} targetSets`).toBeGreaterThan(0);
					expect(exercise.minReps, `${template.id}/${day.name}/${exercise.name} minReps`).toBeGreaterThan(0);
					expect(
						exercise.maxReps,
						`${template.id}/${day.name}/${exercise.name} maxReps >= minReps`
					).toBeGreaterThanOrEqual(exercise.minReps);
				}
			}
		}
	});

	it('PROGRAM_TEMPLATES contains exactly 3 templates', () => {
		expect(PROGRAM_TEMPLATES).toHaveLength(3);
	});

	it('each template has a unique id', () => {
		const ids = PROGRAM_TEMPLATES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

// ── getByName Tests ──

describe('ExerciseRepository.getByName', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb(); // Schema + seeding
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	it('returns the correct exercise for an exact name match', async () => {
		const exercise = await ExerciseRepository.getByName('Bench Press');
		expect(exercise).not.toBeNull();
		expect(exercise!.name).toBe('Bench Press');
		expect(exercise!.muscle_group).toBe('chest');
	});

	it('returns null for a partial name match', async () => {
		const exercise = await ExerciseRepository.getByName('Bench');
		expect(exercise).toBeNull();
	});

	it('returns null for a name that does not exist', async () => {
		const exercise = await ExerciseRepository.getByName('Nonexistent Exercise');
		expect(exercise).toBeNull();
	});

	it('returns null for soft-deleted exercises', async () => {
		// Seed DB already has exercises — find and soft-delete one
		const bench = await ExerciseRepository.getByName('Bench Press');
		expect(bench).not.toBeNull();

		await ExerciseRepository.softDelete(bench!.id);

		const afterDelete = await ExerciseRepository.getByName('Bench Press');
		expect(afterDelete).toBeNull();
	});

	it('is case-sensitive (exact match)', async () => {
		const lower = await ExerciseRepository.getByName('bench press');
		// SQLite default LIKE is case-insensitive, but = is case-sensitive
		// The seed data uses 'Bench Press' — lowercase should not match with =
		expect(lower).toBeNull();
	});

	it('resolves all SEED_EXERCISES names', async () => {
		const unresolved: string[] = [];

		for (const seed of SEED_EXERCISES) {
			const exercise = await ExerciseRepository.getByName(seed.name);
			if (!exercise) {
				unresolved.push(seed.name);
			}
		}

		expect(unresolved, `Unresolved seed exercises:\n${unresolved.join('\n')}`).toHaveLength(0);
	});
});

// ── createProgramFromTemplate Tests (expected to fail until T02) ──

describe('createProgramFromTemplate', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAllPrograms();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	it('creates a program with the correct name and description', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const ppl = PROGRAM_TEMPLATES.find((t) => t.id === 'ppl')!;

		const result = await createProgramFromTemplate(ppl);
		expect(result.program.name).toBe(ppl.name);
		expect(result.program.description).toBe(ppl.description);
	});

	it('creates the correct number of training days', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const ppl = PROGRAM_TEMPLATES.find((t) => t.id === 'ppl')!;

		const result = await createProgramFromTemplate(ppl);
		expect(result.trainingDays).toHaveLength(6);
	});

	it('creates exercise assignments with correct sets and reps', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const fb = PROGRAM_TEMPLATES.find((t) => t.id === 'full-body')!;

		const result = await createProgramFromTemplate(fb);

		// Verify first day's first exercise
		const firstDay = result.trainingDays[0];
		expect(firstDay.assignments).toHaveLength(fb.days[0].exercises.length);

		const firstAssignment = firstDay.assignments[0];
		const templateExercise = fb.days[0].exercises[0];
		expect(firstAssignment.target_sets).toBe(templateExercise.targetSets);
		expect(firstAssignment.min_reps).toBe(templateExercise.minReps);
		expect(firstAssignment.max_reps).toBe(templateExercise.maxReps);
	});

	it('creates a mesocycle with template defaults', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const ul = PROGRAM_TEMPLATES.find((t) => t.id === 'upper-lower')!;

		const result = await createProgramFromTemplate(ul);
		expect(result.mesocycle.weeks_count).toBe(ul.mesocycleDefaults.weeksCount);
		expect(result.mesocycle.deload_week_number).toBe(ul.mesocycleDefaults.deloadWeekNumber);
	});

	it('resolves exercise names to valid exercise IDs', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const fb = PROGRAM_TEMPLATES.find((t) => t.id === 'full-body')!;

		const result = await createProgramFromTemplate(fb);

		for (const day of result.trainingDays) {
			for (const assignment of day.assignments) {
				expect(assignment.exercise_id).toBeTruthy();
				// Verify exercise_id refers to a real exercise
				const exercise = await ExerciseRepository.getById(assignment.exercise_id);
				expect(exercise, `Exercise ${assignment.exercise_id} should exist`).not.toBeNull();
			}
		}
	});

	it('creates training days with correct sort order', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const ppl = PROGRAM_TEMPLATES.find((t) => t.id === 'ppl')!;

		const result = await createProgramFromTemplate(ppl);

		for (let i = 0; i < result.trainingDays.length; i++) {
			expect(result.trainingDays[i].sort_order).toBe(i);
		}
	});

	it('creates exercise assignments with correct sort order within each day', async () => {
		const { createProgramFromTemplate } = await import('../services/template-service.js');
		const fb = PROGRAM_TEMPLATES.find((t) => t.id === 'full-body')!;

		const result = await createProgramFromTemplate(fb);

		for (const day of result.trainingDays) {
			for (let i = 0; i < day.assignments.length; i++) {
				expect(day.assignments[i].sort_order).toBe(i);
			}
		}
	});
});
