import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, _resetForTesting } = await import('../database.js');
const { WorkoutRepository } = await import('../repositories/workout.js');
const { ProgramRepository } = await import('../repositories/program.js');
const { SessionStatus, SetType } = await import('../../types/workout.js');

// ── Helpers ──

// Valid UUIDs for exercise_id references
const EXERCISE_UUID_1 = '00000000-0000-4000-8000-000000000001';
const EXERCISE_UUID_2 = '00000000-0000-4000-8000-000000000002';
const ASSIGNMENT_UUID_1 = '00000000-0000-4000-8000-a00000000001';
const ASSIGNMENT_UUID_2 = '00000000-0000-4000-8000-a00000000002';

/** Clear all workout-related tables */
async function clearAllWorkouts() {
	await dbExecute('DELETE FROM workout_sets');
	await dbExecute('DELETE FROM workout_sessions');
}

/** Clear all data */
async function clearAll() {
	await clearAllWorkouts();
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
}

/** Seed a program with a training day for workout tests */
async function seedProgramAndDay() {
	const program = await ProgramRepository.createProgram(
		{ name: 'Test Program', description: 'For workout tests' },
		[{ name: 'Push Day' }]
	);
	const full = await ProgramRepository.getById(program.id);
	return {
		program,
		trainingDay: full!.trainingDays[0]
	};
}

// ── Tests ──

describe('WorkoutRepository', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── Session CRUD ──

	describe('createSession', () => {
		it('creates a session with correct fields', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			expect(session.id).toBeTruthy();
			expect(session.program_id).toBe(program.id);
			expect(session.training_day_id).toBe(trainingDay.id);
			expect(session.status).toBe(SessionStatus.IN_PROGRESS);
			expect(session.started_at).toBeTruthy();
			expect(session.completed_at).toBeNull();
			expect(session.duration_seconds).toBeNull();
			expect(session.mesocycle_id).toBeNull();
			expect(session.mesocycle_week).toBeNull();
			expect(session.notes).toBeNull();
			expect(session.deleted_at).toBeNull();
		});

		it('creates a session with optional fields', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const meso = await ProgramRepository.createMesocycle(program.id, { weeks_count: 4 });

			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id,
				mesocycle_id: meso.id,
				mesocycle_week: 2,
				notes: 'Feeling strong today'
			});

			expect(session.mesocycle_id).toBe(meso.id);
			expect(session.mesocycle_week).toBe(2);
			expect(session.notes).toBe('Feeling strong today');
		});

		it('throws when concurrent in_progress session exists', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			await expect(
				WorkoutRepository.createSession({
					program_id: program.id,
					training_day_id: trainingDay.id
				})
			).rejects.toThrow('concurrent in_progress session exists');
		});

		it('allows new session after previous one is completed', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const first = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			await WorkoutRepository.completeSession(first.id, 3600);

			const second = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			expect(second.id).toBeTruthy();
			expect(second.id).not.toBe(first.id);
		});
	});

	// ── getSessionById ──

	describe('getSessionById', () => {
		it('returns session with all sets', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			await WorkoutRepository.addSet(session.id, { exercise_id: EXERCISE_UUID_1, weight: 100, reps: 8 });
			await WorkoutRepository.addSet(session.id, { exercise_id: EXERCISE_UUID_1, weight: 100, reps: 7 });

			const loaded = await WorkoutRepository.getSessionById(session.id);
			expect(loaded).not.toBeNull();
			expect(loaded!.id).toBe(session.id);
			expect(loaded!.sets).toHaveLength(2);
		});

		it('returns null for non-existent session', async () => {
			const result = await WorkoutRepository.getSessionById('non-existent');
			expect(result).toBeNull();
		});
	});

	// ── Set management ──

	describe('addSet', () => {
		it('adds a set with auto-incremented set_number', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const set1 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100,
				reps: 10,
				rir: 2
			});
			expect(set1.set_number).toBe(1);
			expect(set1.exercise_id).toBe(EXERCISE_UUID_1);
			expect(set1.weight).toBe(100);
			expect(set1.reps).toBe(10);
			expect(set1.rir).toBe(2);
			expect(set1.set_type).toBe(SetType.WORKING);
			expect(set1.completed).toBe(false);

			const set2 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100,
				reps: 8
			});
			expect(set2.set_number).toBe(2);

			const set3 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 90,
				reps: 6
			});
			expect(set3.set_number).toBe(3);
		});

		it('tracks set_number per exercise independently', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const setA1 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100
			});
			const setB1 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_2,
				weight: 60
			});
			const setA2 = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100
			});

			expect(setA1.set_number).toBe(1);
			expect(setB1.set_number).toBe(1);
			expect(setA2.set_number).toBe(2);
		});

		it('adds a set with custom set_type and assignment_id', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				assignment_id: ASSIGNMENT_UUID_1,
				set_type: 'warmup',
				weight: 50,
				reps: 12
			});

			expect(set.set_type).toBe(SetType.WARMUP);
			expect(set.assignment_id).toBe(ASSIGNMENT_UUID_1);
		});
	});

	describe('updateSet', () => {
		it('updates specified fields only', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100,
				reps: 10,
				rir: 3
			});

			const updated = await WorkoutRepository.updateSet(set.id, {
				weight: 105,
				reps: 8
			});

			expect(updated).not.toBeNull();
			expect(updated!.weight).toBe(105);
			expect(updated!.reps).toBe(8);
			expect(updated!.rir).toBe(3); // unchanged
			expect(updated!.set_type).toBe(SetType.WORKING); // unchanged
		});

		it('updates completed flag', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100
			});

			expect(set.completed).toBe(false);

			const updated = await WorkoutRepository.updateSet(set.id, { completed: true });
			expect(updated!.completed).toBe(true);
		});

		it('updates set_type', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1
			});

			const updated = await WorkoutRepository.updateSet(set.id, {
				set_type: 'drop'
			});
			expect(updated!.set_type).toBe(SetType.DROP);
		});

		it('returns unchanged set when no fields provided', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100
			});

			const result = await WorkoutRepository.updateSet(set.id, {});
			expect(result).not.toBeNull();
			expect(result!.weight).toBe(100);
		});

		it('returns null for non-existent set', async () => {
			const result = await WorkoutRepository.updateSet(
				'00000000-0000-4000-8000-000000000099',
				{ weight: 100 }
			);
			expect(result).toBeNull();
		});
	});

	describe('removeSet', () => {
		it('hard-deletes the set', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			const set = await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100
			});

			const removed = await WorkoutRepository.removeSet(set.id);
			expect(removed).toBe(true);

			// Should not appear in session
			const loaded = await WorkoutRepository.getSessionById(session.id);
			expect(loaded!.sets).toHaveLength(0);
		});

		it('returns false for non-existent set', async () => {
			const removed = await WorkoutRepository.removeSet('non-existent');
			expect(removed).toBe(false);
		});
	});

	// ── Session completion ──

	describe('completeSession', () => {
		it('sets status, completed_at, and duration_seconds', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const completed = await WorkoutRepository.completeSession(session.id, 3600);

			expect(completed).not.toBeNull();
			expect(completed!.status).toBe(SessionStatus.COMPLETED);
			expect(completed!.completed_at).toBeTruthy();
			expect(completed!.duration_seconds).toBe(3600);
		});
	});

	// ── Pre-fill query ──

	describe('getLastSessionForDay', () => {
		it('returns null when no previous sessions', async () => {
			const { trainingDay } = await seedProgramAndDay();
			const result = await WorkoutRepository.getLastSessionForDay(trainingDay.id);
			expect(result).toBeNull();
		});

		it('returns null when only in_progress sessions exist', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const result = await WorkoutRepository.getLastSessionForDay(trainingDay.id);
			expect(result).toBeNull();
		});

		it('returns sets from the most recent completed session', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Create and complete first session
			const session1 = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			await WorkoutRepository.addSet(session1.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 80,
				reps: 10
			});
			await WorkoutRepository.completeSession(session1.id, 1800);

			// Create and complete second session (more recent)
			const session2 = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			await WorkoutRepository.addSet(session2.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 85,
				reps: 8
			});
			await WorkoutRepository.addSet(session2.id, {
				exercise_id: EXERCISE_UUID_2,
				weight: 60,
				reps: 12
			});
			await WorkoutRepository.completeSession(session2.id, 2400);

			const last = await WorkoutRepository.getLastSessionForDay(trainingDay.id);
			expect(last).not.toBeNull();
			expect(last!.id).toBe(session2.id);
			expect(last!.sets).toHaveLength(2);
		});

		it('returns sets matched by exercise_id, ordered by set_number', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			// Add sets for two different exercises
			await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				assignment_id: ASSIGNMENT_UUID_1,
				weight: 100,
				reps: 10
			});
			await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				assignment_id: ASSIGNMENT_UUID_1,
				weight: 100,
				reps: 8
			});
			await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_2,
				assignment_id: ASSIGNMENT_UUID_2,
				weight: 60,
				reps: 12
			});

			await WorkoutRepository.completeSession(session.id, 2000);

			const last = await WorkoutRepository.getLastSessionForDay(trainingDay.id);
			expect(last!.sets).toHaveLength(3);

			// Sets are ordered by exercise_id then set_number
			const exercise1Sets = last!.sets.filter((s) => s.exercise_id === EXERCISE_UUID_1);
			const exercise2Sets = last!.sets.filter((s) => s.exercise_id === EXERCISE_UUID_2);

			expect(exercise1Sets).toHaveLength(2);
			expect(exercise1Sets[0].set_number).toBe(1);
			expect(exercise1Sets[0].weight).toBe(100);
			expect(exercise1Sets[0].reps).toBe(10);
			expect(exercise1Sets[1].set_number).toBe(2);

			expect(exercise2Sets).toHaveLength(1);
			expect(exercise2Sets[0].set_number).toBe(1);
			expect(exercise2Sets[0].weight).toBe(60);
		});
	});

	// ── In-progress session ──

	describe('getInProgressSession', () => {
		it('returns existing in-progress session', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			const inProgress = await WorkoutRepository.getInProgressSession();
			expect(inProgress).not.toBeNull();
			expect(inProgress!.id).toBe(session.id);
			expect(inProgress!.status).toBe(SessionStatus.IN_PROGRESS);
		});

		it('returns null when no in-progress session', async () => {
			const result = await WorkoutRepository.getInProgressSession();
			expect(result).toBeNull();
		});

		it('returns null after session is completed', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});

			await WorkoutRepository.completeSession(session.id, 1800);

			const result = await WorkoutRepository.getInProgressSession();
			expect(result).toBeNull();
		});

		it('returns session with its sets', async () => {
			const { program, trainingDay } = await seedProgramAndDay();
			const session = await WorkoutRepository.createSession({
				program_id: program.id,
				training_day_id: trainingDay.id
			});
			await WorkoutRepository.addSet(session.id, {
				exercise_id: EXERCISE_UUID_1,
				weight: 100,
				reps: 10
			});

			const inProgress = await WorkoutRepository.getInProgressSession();
			expect(inProgress!.sets).toHaveLength(1);
			expect(inProgress!.sets[0].weight).toBe(100);
		});
	});
});
