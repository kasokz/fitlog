import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from '../../../db/__tests__/test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

// Dynamic imports — must be after mock setup for DB-dependent modules
const { getProgressionSuggestion, DEFAULT_THRESHOLDS, WEIGHT_INCREMENTS } = await import(
	'../progressionAdvisor.js'
);
const { getDb, dbExecute, _resetForTesting } = await import('../../../db/database.js');
const { WorkoutRepository } = await import('../../../db/repositories/workout.js');
const { ProgramRepository } = await import('../../../db/repositories/program.js');

// ── Seed Helpers ──

const EXERCISE_BARBELL = '00000000-0000-4000-8000-000000000010';
const EXERCISE_DUMBBELL = '00000000-0000-4000-8000-000000000011';
const EXERCISE_BODYWEIGHT = '00000000-0000-4000-8000-000000000012';
const EXERCISE_CABLE = '00000000-0000-4000-8000-000000000013';

async function clearAll() {
	await dbExecute('DELETE FROM workout_sets');
	await dbExecute('DELETE FROM workout_sessions');
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
	await dbExecute('DELETE FROM exercises');
}

async function seedExercise(
	id: string,
	name: string,
	equipment: string,
	muscleGroup: string = 'chest'
): Promise<void> {
	await dbExecute(
		`INSERT INTO exercises (id, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, is_compound, created_at, updated_at)
		 VALUES (?, ?, NULL, ?, NULL, ?, 0, 0, '2025-01-01T00:00:00', '2025-01-01T00:00:00')`,
		[id, name, muscleGroup, equipment]
	);
}

async function seedProgramAndDay() {
	const program = await ProgramRepository.createProgram(
		{ name: 'Test Program', description: 'For progression tests' },
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

async function addCompletedWorkingSetWithRir(
	sessionId: string,
	exerciseId: string,
	weight: number,
	reps: number,
	rir: number | null
): Promise<string> {
	const set = await WorkoutRepository.addSet(sessionId, {
		exercise_id: exerciseId,
		set_type: 'working',
		weight,
		reps,
		rir,
	});
	await WorkoutRepository.updateSet(set.id, { completed: true });
	return set.id;
}

async function completeSession(sessionId: string): Promise<void> {
	await WorkoutRepository.completeSession(sessionId, 3600);
}

/**
 * Helper: seed N sessions each with M working sets, all at the same weight/reps/rir.
 * Returns the session IDs.
 */
async function seedSessionsWithSets(
	programId: string,
	trainingDayId: string,
	exerciseId: string,
	options: {
		sessionCount: number;
		setsPerSession: number;
		weight: number;
		reps: number;
		rir: number | null;
		startDate?: string;
	}
): Promise<string[]> {
	const sessionIds: string[] = [];
	const baseDate = options.startDate ?? '2025-01-10';

	for (let i = 0; i < options.sessionCount; i++) {
		// Space sessions 2 days apart
		const day = parseInt(baseDate.slice(-2)) + i * 2;
		const dayStr = String(day).padStart(2, '0');
		const startedAt = `${baseDate.slice(0, 8)}${dayStr}T10:00:00`;

		const sessionId = await seedCompletedSession(programId, trainingDayId, startedAt);

		for (let j = 0; j < options.setsPerSession; j++) {
			await addCompletedWorkingSetWithRir(sessionId, exerciseId, options.weight, options.reps, options.rir);
		}
		await completeSession(sessionId);
		sessionIds.push(sessionId);
	}

	return sessionIds;
}

// ── Tests ──

describe('progressionAdvisor', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	describe('constants', () => {
		it('has correct default thresholds', () => {
			expect(DEFAULT_THRESHOLDS).toEqual({
				minSessions: 2,
				minAvgRir: 2,
				minWorkingSetsPerSession: 3,
			});
		});

		it('has correct weight increments for all equipment types', () => {
			expect(WEIGHT_INCREMENTS.barbell).toBe(2.5);
			expect(WEIGHT_INCREMENTS.dumbbell).toBe(2);
			expect(WEIGHT_INCREMENTS.cable).toBe(2.5);
			expect(WEIGHT_INCREMENTS.machine).toBe(2.5);
			expect(WEIGHT_INCREMENTS.bodyweight).toBe(0);
			expect(WEIGHT_INCREMENTS.kettlebell).toBe(2.5);
			expect(WEIGHT_INCREMENTS.band).toBe(2.5);
			expect(WEIGHT_INCREMENTS.other).toBe(2.5);
		});
	});

	describe('getProgressionSuggestion', () => {
		it('triggers suggestion when RIR criteria met across sufficient sessions', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// 2 sessions, each with 3 working sets at RIR 2
			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 100,
				reps: 8,
				rir: 2,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.exercise_id).toBe(EXERCISE_BARBELL);
			expect(suggestion!.current_weight).toBe(100);
			expect(suggestion!.increment_kg).toBe(2.5);
			expect(suggestion!.suggested_weight).toBe(102.5);
			expect(suggestion!.sessions_analyzed).toBe(2);
			expect(suggestion!.avg_rir).toBe(2);
			expect(suggestion!.reason).toContain('2.0');
		});

		it('returns null when insufficient sessions (only 1)', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// Only 1 session (need 2)
			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 1,
				setsPerSession: 3,
				weight: 100,
				reps: 8,
				rir: 3,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);
			expect(suggestion).toBeNull();
		});

		it('returns null when avg RIR below threshold', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// 2 sessions, 3 sets each, but RIR = 1 (below threshold of 2)
			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 100,
				reps: 8,
				rir: 1,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);
			expect(suggestion).toBeNull();
		});

		it('returns null when insufficient sets per session', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: 3 working sets ✓
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await completeSession(s1);

			// Session 2: only 2 working sets ✗
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await completeSession(s2);

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);
			expect(suggestion).toBeNull();
		});

		it('returns null immediately for bodyweight exercises (D045)', async () => {
			await seedExercise(EXERCISE_BODYWEIGHT, 'Pull-ups', 'bodyweight');
			const { program, trainingDay } = await seedProgramAndDay();

			// Even with perfect data, bodyweight should return null
			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BODYWEIGHT, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 0,
				reps: 10,
				rir: 3,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BODYWEIGHT);
			expect(suggestion).toBeNull();
		});

		it('suggests correct increment for barbell (+2.5kg)', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Squat', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 80,
				reps: 8,
				rir: 3,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.increment_kg).toBe(2.5);
			expect(suggestion!.suggested_weight).toBe(82.5);
		});

		it('suggests correct increment for dumbbell (+2kg)', async () => {
			await seedExercise(EXERCISE_DUMBBELL, 'DB Curl', 'dumbbell');
			const { program, trainingDay } = await seedProgramAndDay();

			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_DUMBBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 20,
				reps: 10,
				rir: 2,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_DUMBBELL);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.increment_kg).toBe(2);
			expect(suggestion!.suggested_weight).toBe(22);
		});

		it('suggests correct increment for cable (+2.5kg)', async () => {
			await seedExercise(EXERCISE_CABLE, 'Cable Fly', 'cable');
			const { program, trainingDay } = await seedProgramAndDay();

			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_CABLE, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 15,
				reps: 12,
				rir: 2,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_CABLE);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.increment_kg).toBe(2.5);
			expect(suggestion!.suggested_weight).toBe(17.5);
		});

		it('excludes null RIR from average (does not count as 0)', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: 3 sets, 2 with RIR 3, 1 with null RIR
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 3);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 3);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, null);
			await completeSession(s1);

			// Session 2: 3 sets, all RIR 2
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await completeSession(s2);

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);

			// Avg RIR = (3+3+2+2+2) / 5 = 12/5 = 2.4, null excluded from avg
			expect(suggestion).not.toBeNull();
			expect(suggestion!.avg_rir).toBe(2.4);
		});

		it('returns null when all sets have null RIR', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 100,
				reps: 8,
				rir: null,
			});

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);
			expect(suggestion).toBeNull();
		});

		it('respects custom thresholds (override minSessions=3)', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// 2 sessions — passes default (minSessions=2) but fails custom (minSessions=3)
			await seedSessionsWithSets(program.id, trainingDay.id, EXERCISE_BARBELL, {
				sessionCount: 2,
				setsPerSession: 3,
				weight: 100,
				reps: 8,
				rir: 3,
			});

			// Default thresholds → triggers
			const withDefault = await getProgressionSuggestion(EXERCISE_BARBELL);
			expect(withDefault).not.toBeNull();

			// Custom thresholds requiring 3 sessions → null
			const withCustom = await getProgressionSuggestion(EXERCISE_BARBELL, { minSessions: 3 });
			expect(withCustom).toBeNull();
		});

		it('triggers when mixed RIR values still average ≥ threshold', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: RIR values 1, 2, 3 → avg 2.0
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 1);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 3);
			await completeSession(s1);

			// Session 2: RIR values 2, 2, 3 → avg 2.33
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 3);
			await completeSession(s2);

			// Overall avg = (1+2+3+2+2+3)/6 = 13/6 ≈ 2.167 ≥ 2
			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.avg_rir).toBeCloseTo(2.2, 1);
		});

		it('returns null for nonexistent exercise', async () => {
			const suggestion = await getProgressionSuggestion('nonexistent-exercise-id');
			expect(suggestion).toBeNull();
		});

		it('uses mode weight from most recent session as current_weight', async () => {
			await seedExercise(EXERCISE_BARBELL, 'Bench Press', 'barbell');
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: all at 100kg
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await addCompletedWorkingSetWithRir(s1, EXERCISE_BARBELL, 100, 8, 2);
			await completeSession(s1);

			// Session 2 (most recent): mixed weights, mode is 105
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 105, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 105, 8, 2);
			await addCompletedWorkingSetWithRir(s2, EXERCISE_BARBELL, 100, 8, 2);
			await completeSession(s2);

			const suggestion = await getProgressionSuggestion(EXERCISE_BARBELL);

			expect(suggestion).not.toBeNull();
			expect(suggestion!.current_weight).toBe(105);
			expect(suggestion!.suggested_weight).toBe(107.5);
		});
	});
});
