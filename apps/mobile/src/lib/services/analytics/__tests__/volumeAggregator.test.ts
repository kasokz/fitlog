import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from '../../../db/__tests__/test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

// Dynamic imports — must be after mock setup for DB-dependent modules
const { getExerciseVolume, getMuscleGroupVolume, getSessionTonnage } = await import(
	'../volumeAggregator.js'
);
const { getDb, dbExecute, _resetForTesting } = await import('../../../db/database.js');
const { WorkoutRepository } = await import('../../../db/repositories/workout.js');
const { ProgramRepository } = await import('../../../db/repositories/program.js');
const { ExerciseRepository } = await import('../../../db/repositories/exercise.js');

// ── Test UUIDs ──

const EXERCISE_UUID_1 = '00000000-0000-4000-8000-000000000001';
const EXERCISE_UUID_2 = '00000000-0000-4000-8000-000000000002';

// ── Seed Helpers ──

async function clearAll() {
	await dbExecute('DELETE FROM workout_sets');
	await dbExecute('DELETE FROM workout_sessions');
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
	await dbExecute('DELETE FROM exercises');
}

async function seedProgramAndDay() {
	const program = await ProgramRepository.createProgram(
		{ name: 'Test Program', description: 'For volume tests' },
		[{ name: 'Push Day' }]
	);
	const full = await ProgramRepository.getById(program.id);
	return { program, trainingDay: full!.trainingDays[0] };
}

async function seedCompletedSession(
	programId: string,
	trainingDayId: string,
	startedAt: string
): Promise<string> {
	const session = await WorkoutRepository.createSession({
		program_id: programId,
		training_day_id: trainingDayId,
	});
	await dbExecute('UPDATE workout_sessions SET started_at = ? WHERE id = ?', [
		startedAt,
		session.id,
	]);
	return session.id;
}

async function addCompletedWorkingSet(
	sessionId: string,
	exerciseId: string,
	weight: number | null,
	reps: number | null
): Promise<string> {
	const set = await WorkoutRepository.addSet(sessionId, {
		exercise_id: exerciseId,
		set_type: 'working',
		weight,
		reps,
	});
	await WorkoutRepository.updateSet(set.id, { completed: true });
	return set.id;
}

async function completeSession(sessionId: string): Promise<void> {
	await WorkoutRepository.completeSession(sessionId, 3600);
}

async function seedExercise(
	id: string,
	name: string,
	muscleGroup: string,
	equipment: string = 'barbell'
): Promise<void> {
	await dbExecute(
		`INSERT INTO exercises (id, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, is_compound, created_at, updated_at)
		 VALUES (?, ?, NULL, ?, NULL, ?, 0, 0, '2025-01-01T00:00:00', '2025-01-01T00:00:00')`,
		[id, name, muscleGroup, equipment]
	);
}

// ── Tests ──

describe('volumeAggregator', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── getExerciseVolume ──

	describe('getExerciseVolume', () => {
		it('calculates correct tonnage grouped by date', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: 3 sets of 100kg × 8 reps = 2400 volume
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await completeSession(s1);

			// Session 2: 3 sets of 105kg × 6 reps = 1890 volume
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 105, 6);
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 105, 6);
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 105, 6);
			await completeSession(s2);

			const result = await getExerciseVolume(EXERCISE_UUID_1);

			expect(result).toHaveLength(2);
			// Sorted ascending by date
			expect(result[0].date).toBe('2025-01-10');
			expect(result[0].totalVolume).toBe(2400);
			expect(result[0].setCount).toBe(3);
			expect(result[1].date).toBe('2025-01-12');
			expect(result[1].totalVolume).toBe(1890);
			expect(result[1].setCount).toBe(3);
		});

		it('handles null weight gracefully (contributes 0)', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, null, 8);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await completeSession(s1);

			const result = await getExerciseVolume(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			// Only the second set contributes: 100 * 8 = 800
			expect(result[0].totalVolume).toBe(800);
			expect(result[0].setCount).toBe(2); // Both sets counted
		});

		it('handles null reps gracefully (contributes 0)', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, null);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5);
			await completeSession(s1);

			const result = await getExerciseVolume(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			expect(result[0].totalVolume).toBe(500);
			expect(result[0].setCount).toBe(2);
		});

		it('returns empty array when no sets exist', async () => {
			const result = await getExerciseVolume(EXERCISE_UUID_1);
			expect(result).toEqual([]);
		});

		it('filters by date range when provided', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-05T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 80, 10);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 8);
			await completeSession(s2);

			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-25T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_1, 110, 6);
			await completeSession(s3);

			const result = await getExerciseVolume(EXERCISE_UUID_1, {
				start: '2025-01-10',
				end: '2025-01-20',
			});

			expect(result).toHaveLength(1);
			expect(result[0].date).toBe('2025-01-15');
			expect(result[0].totalVolume).toBe(800);
		});

		it('returns correct set count per date', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5);
			await completeSession(s1);

			const result = await getExerciseVolume(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			expect(result[0].setCount).toBe(4);
			expect(result[0].totalVolume).toBe(2000);
		});
	});

	// ── getMuscleGroupVolume ──

	describe('getMuscleGroupVolume', () => {
		it('aggregates volume across multiple exercises in the same muscle group', async () => {
			// Seed two chest exercises
			await seedExercise(EXERCISE_UUID_1, 'Bench Press', 'chest', 'barbell');
			await seedExercise(EXERCISE_UUID_2, 'Incline Dumbbell Press', 'chest', 'dumbbell');

			const { program, trainingDay } = await seedProgramAndDay();

			// Session with both exercises on the same day
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8); // 800
			await addCompletedWorkingSet(s1, EXERCISE_UUID_2, 30, 10); // 300
			await completeSession(s1);

			const result = await getMuscleGroupVolume('chest');

			expect(result).toHaveLength(1);
			expect(result[0].date).toBe('2025-01-10');
			expect(result[0].totalVolume).toBe(1100);
			expect(result[0].setCount).toBe(2);
		});

		it('returns empty array when no exercises exist for the muscle group', async () => {
			const result = await getMuscleGroupVolume('chest');
			expect(result).toEqual([]);
		});

		it('aggregates across multiple dates', async () => {
			await seedExercise(EXERCISE_UUID_1, 'Bench Press', 'chest', 'barbell');

			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 10); // 1000
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 105, 8); // 840
			await completeSession(s2);

			const result = await getMuscleGroupVolume('chest');

			expect(result).toHaveLength(2);
			expect(result[0].date).toBe('2025-01-10');
			expect(result[0].totalVolume).toBe(1000);
			expect(result[1].date).toBe('2025-01-12');
			expect(result[1].totalVolume).toBe(840);
		});
	});

	// ── getSessionTonnage ──

	describe('getSessionTonnage', () => {
		it('sums all working sets in a session', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			// 3 × 100kg × 8 = 2400
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await completeSession(s1);

			const tonnage = await getSessionTonnage(s1);
			expect(tonnage).toBe(2400);
		});

		it('returns 0 for a session with no valid sets', async () => {
			const tonnage = await getSessionTonnage('nonexistent-session-id');
			expect(tonnage).toBe(0);
		});

		it('sums across multiple exercises in the same session', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8); // 800
			await addCompletedWorkingSet(s1, EXERCISE_UUID_2, 50, 12); // 600
			await completeSession(s1);

			const tonnage = await getSessionTonnage(s1);
			expect(tonnage).toBe(1400);
		});

		it('handles null weight and reps gracefully', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, null, 8); // 0
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, null); // 0
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 5); // 500
			await completeSession(s1);

			const tonnage = await getSessionTonnage(s1);
			expect(tonnage).toBe(500);
		});
	});
});
