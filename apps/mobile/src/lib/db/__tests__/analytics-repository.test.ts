import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from './test-helpers.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

const { getDb, dbExecute, _resetForTesting } = await import('../database.js');
const { WorkoutRepository } = await import('../repositories/workout.js');
const { ProgramRepository } = await import('../repositories/program.js');
const { ExerciseRepository } = await import('../repositories/exercise.js');
const { BodyWeightRepository } = await import('../repositories/bodyweight.js');
const { AnalyticsRepository } = await import('../repositories/analytics.js');
const { SetType } = await import('../../types/workout.js');

// ── Test UUIDs ──

const EXERCISE_UUID_1 = '00000000-0000-4000-8000-000000000001';
const EXERCISE_UUID_2 = '00000000-0000-4000-8000-000000000002';

// ── Seed Helpers ──

/** Clear all tables for a fresh test */
async function clearAll() {
	await dbExecute('DELETE FROM workout_sets');
	await dbExecute('DELETE FROM workout_sessions');
	await dbExecute('DELETE FROM exercise_assignments');
	await dbExecute('DELETE FROM training_days');
	await dbExecute('DELETE FROM mesocycles');
	await dbExecute('DELETE FROM programs');
	await dbExecute('DELETE FROM exercises');
	await dbExecute('DELETE FROM body_weight_entries');
}

/** Seed a program with a training day */
async function seedProgramAndDay() {
	const program = await ProgramRepository.createProgram(
		{ name: 'Test Program', description: 'For analytics tests' },
		[{ name: 'Push Day' }]
	);
	const full = await ProgramRepository.getById(program.id);
	return {
		program,
		trainingDay: full!.trainingDays[0]
	};
}

/**
 * Create a completed session with a specific started_at timestamp.
 * Returns the session ID.
 */
async function seedCompletedSession(
	programId: string,
	trainingDayId: string,
	startedAt: string
): Promise<string> {
	const session = await WorkoutRepository.createSession({
		program_id: programId,
		training_day_id: trainingDayId
	});

	// Override started_at to control ordering
	await dbExecute(
		'UPDATE workout_sessions SET started_at = ? WHERE id = ?',
		[startedAt, session.id]
	);

	return session.id;
}

/**
 * Add a working set to a session and mark it completed.
 */
async function addCompletedWorkingSet(
	sessionId: string,
	exerciseId: string,
	weight: number,
	reps: number,
	rir?: number
): Promise<string> {
	const set = await WorkoutRepository.addSet(sessionId, {
		exercise_id: exerciseId,
		set_type: SetType.WORKING,
		weight,
		reps,
		rir: rir ?? null
	});
	await WorkoutRepository.updateSet(set.id, { completed: true });
	return set.id;
}

/**
 * Add a non-working set (warmup, drop, or failure) — completed or not.
 */
async function addNonWorkingSet(
	sessionId: string,
	exerciseId: string,
	setType: string,
	weight: number,
	reps: number,
	completed: boolean
): Promise<string> {
	const set = await WorkoutRepository.addSet(sessionId, {
		exercise_id: exerciseId,
		set_type: setType,
		weight,
		reps
	});
	if (completed) {
		await WorkoutRepository.updateSet(set.id, { completed: true });
	}
	return set.id;
}

/**
 * Complete a session (set status to 'completed').
 */
async function completeSession(sessionId: string): Promise<void> {
	await WorkoutRepository.completeSession(sessionId, 3600);
}

// ── Tests ──

describe('AnalyticsRepository', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	// ── getExerciseSetsHistory ──

	describe('getExerciseSetsHistory', () => {
		it('returns only working + completed sets from completed sessions', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			// Add various set types
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 7);

			// Warmup set (completed) — should be EXCLUDED
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.WARMUP, 50, 12, true);
			// Drop set (completed) — should be EXCLUDED
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.DROP, 70, 10, true);
			// Failure set (completed) — should be EXCLUDED
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.FAILURE, 100, 3, true);
			// Working set but NOT completed — should be EXCLUDED
			await WorkoutRepository.addSet(sessionId, {
				exercise_id: EXERCISE_UUID_1,
				set_type: SetType.WORKING,
				weight: 100,
				reps: 5
			});
			// (don't mark it completed)

			await completeSession(sessionId);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result).toHaveLength(2);
			expect(result.every((s) => s.set_type === 'working')).toBe(true);
			expect(result.every((s) => s.completed === true)).toBe(true);
		});

		it('excludes sets from non-completed sessions', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Completed session
			const completedId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);
			await addCompletedWorkingSet(completedId, EXERCISE_UUID_1, 100, 8);
			await completeSession(completedId);

			// In-progress session (not completed)
			const inProgressId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-16T10:00:00'
			);
			await addCompletedWorkingSet(inProgressId, EXERCISE_UUID_1, 105, 6);
			// Don't complete this session — leave it as in_progress

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			expect(result[0].weight).toBe(100);
		});

		it('excludes soft-deleted sets', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			const set1Id = await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 7);

			// Soft-delete set1
			await dbExecute(
				'UPDATE workout_sets SET deleted_at = ? WHERE id = ?',
				[new Date().toISOString(), set1Id]
			);

			await completeSession(sessionId);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			expect(result[0].reps).toBe(7);
		});

		it('respects date range filter', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Session on Jan 10
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 10);
			await completeSession(s1);

			// Session on Jan 15
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 95, 8);
			await completeSession(s2);

			// Session on Jan 20
			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_1, 100, 6);
			await completeSession(s3);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1, {
				start: '2025-01-12',
				end: '2025-01-18'
			});

			expect(result).toHaveLength(1);
			expect(result[0].weight).toBe(95);
		});

		it('returns results ordered by session date DESC then set_number ASC', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Older session
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 10);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 8);
			await completeSession(s1);

			// Newer session
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 6);
			await completeSession(s2);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result).toHaveLength(4);
			// Newer session first
			expect(result[0].weight).toBe(100);
			expect(result[0].reps).toBe(8);
			expect(result[0].set_number).toBe(1);
			expect(result[1].weight).toBe(100);
			expect(result[1].reps).toBe(6);
			expect(result[1].set_number).toBe(2);
			// Older session second
			expect(result[2].weight).toBe(90);
			expect(result[2].reps).toBe(10);
			expect(result[2].set_number).toBe(1);
			expect(result[3].weight).toBe(90);
			expect(result[3].reps).toBe(8);
			expect(result[3].set_number).toBe(2);
		});

		it('returns only sets for the requested exercise', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_2, 60, 12);
			await completeSession(sessionId);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result).toHaveLength(1);
			expect(result[0].exercise_id).toBe(EXERCISE_UUID_1);
		});

		it('returns empty array when no matching sets exist', async () => {
			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);
			expect(result).toEqual([]);
		});

		it('includes session_started_at in each result', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await completeSession(sessionId);

			const result = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);

			expect(result[0].session_started_at).toBe('2025-01-15T10:00:00');
		});
	});

	// ── getCompletedWorkingSets ──

	describe('getCompletedWorkingSets', () => {
		it('returns working sets only for specified sessions', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 10);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 8);
			await completeSession(s2);

			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_1, 105, 6);
			await completeSession(s3);

			// Only request s1 and s3
			const result = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[s1, s3]
			);

			expect(result).toHaveLength(2);
			expect(result[0].weight).toBe(90); // s1 first (earlier started_at)
			expect(result[1].weight).toBe(105); // s3 second
		});

		it('excludes non-working sets from specified sessions', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.WARMUP, 50, 12, true);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.DROP, 70, 10, true);
			await completeSession(sessionId);

			const result = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[sessionId]
			);

			expect(result).toHaveLength(1);
			expect(result[0].set_type).toBe('working');
			expect(result[0].weight).toBe(100);
		});

		it('orders by session started_at ASC then set_number ASC', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 10);
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 8);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 8);
			await completeSession(s2);

			const result = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[s2, s1] // Note: passed in reverse order — should still sort by started_at
			);

			expect(result).toHaveLength(3);
			// s1 first (earlier date)
			expect(result[0].weight).toBe(90);
			expect(result[0].set_number).toBe(1);
			expect(result[1].weight).toBe(90);
			expect(result[1].set_number).toBe(2);
			// s2 second
			expect(result[2].weight).toBe(100);
		});

		it('returns empty array for empty sessionIds', async () => {
			const result = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[]
			);
			expect(result).toEqual([]);
		});

		it('returns only sets for the requested exercise', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_2, 60, 12);
			await completeSession(sessionId);

			const result = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[sessionId]
			);

			expect(result).toHaveLength(1);
			expect(result[0].exercise_id).toBe(EXERCISE_UUID_1);
		});
	});

	// ── getRecentSessionsForExercise ──

	describe('getRecentSessionsForExercise', () => {
		it('returns the N most recent sessions with working sets for the exercise', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 90, 10);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 95, 8);
			await completeSession(s2);

			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_1, 100, 6);
			await completeSession(s3);

			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 2);

			expect(result).toHaveLength(2);
			// Most recent first
			expect(result[0].id).toBe(s3);
			expect(result[1].id).toBe(s2);
		});

		it('excludes sessions without working sets for the exercise', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Session with working sets for exercise 1
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await completeSession(s1);

			// Session with only warmup sets for exercise 1 (no working sets)
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addNonWorkingSet(s2, EXERCISE_UUID_1, SetType.WARMUP, 50, 12, true);
			// Need at least one completed working set for SOME exercise to make this a completed session
			await addCompletedWorkingSet(s2, EXERCISE_UUID_2, 60, 12);
			await completeSession(s2);

			// Session with working sets for a different exercise only
			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_2, 65, 10);
			await completeSession(s3);

			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 5);

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe(s1);
		});

		it('returns results ordered most recent first', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-05T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 80, 10);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_UUID_1, 100, 6);
			await completeSession(s2);

			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-12T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_UUID_1, 90, 8);
			await completeSession(s3);

			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 3);

			expect(result).toHaveLength(3);
			expect(result[0].id).toBe(s2); // Jan 20
			expect(result[1].id).toBe(s3); // Jan 12
			expect(result[2].id).toBe(s1); // Jan 5
		});

		it('respects the count limit', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			for (let i = 1; i <= 5; i++) {
				const sid = await seedCompletedSession(
					program.id,
					trainingDay.id,
					`2025-01-${String(i).padStart(2, '0')}T10:00:00`
				);
				await addCompletedWorkingSet(sid, EXERCISE_UUID_1, 80 + i * 5, 10);
				await completeSession(sid);
			}

			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 3);
			expect(result).toHaveLength(3);
		});

		it('returns empty array when no sessions have working sets for the exercise', async () => {
			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 5);
			expect(result).toEqual([]);
		});

		it('includes started_at in session references', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_UUID_1, 100, 8);
			await completeSession(s1);

			const result = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 1);

			expect(result[0].started_at).toBe('2025-01-15T10:00:00');
		});
	});

	// ── getBodyWeightRange ──

	describe('getBodyWeightRange', () => {
		it('returns entries in ascending date order within range', async () => {
			await BodyWeightRepository.log('2025-01-10', 80.0);
			await BodyWeightRepository.log('2025-01-15', 80.5);
			await BodyWeightRepository.log('2025-01-20', 81.0);

			const result = await AnalyticsRepository.getBodyWeightRange({
				start: '2025-01-01',
				end: '2025-01-31'
			});

			expect(result).toHaveLength(3);
			expect(result[0].date).toBe('2025-01-10');
			expect(result[0].weight_kg).toBe(80.0);
			expect(result[1].date).toBe('2025-01-15');
			expect(result[2].date).toBe('2025-01-20');
		});

		it('respects the date range boundaries', async () => {
			await BodyWeightRepository.log('2025-01-05', 79.0);
			await BodyWeightRepository.log('2025-01-10', 80.0);
			await BodyWeightRepository.log('2025-01-15', 80.5);
			await BodyWeightRepository.log('2025-01-20', 81.0);
			await BodyWeightRepository.log('2025-01-25', 81.5);

			const result = await AnalyticsRepository.getBodyWeightRange({
				start: '2025-01-10',
				end: '2025-01-20'
			});

			expect(result).toHaveLength(3);
			expect(result[0].date).toBe('2025-01-10');
			expect(result[1].date).toBe('2025-01-15');
			expect(result[2].date).toBe('2025-01-20');
		});

		it('excludes soft-deleted entries', async () => {
			const entry1 = await BodyWeightRepository.log('2025-01-10', 80.0);
			await BodyWeightRepository.log('2025-01-15', 80.5);

			// Soft-delete entry1
			await BodyWeightRepository.deleteEntry(entry1.id);

			const result = await AnalyticsRepository.getBodyWeightRange({
				start: '2025-01-01',
				end: '2025-01-31'
			});

			expect(result).toHaveLength(1);
			expect(result[0].date).toBe('2025-01-15');
		});

		it('returns empty array when no entries in range', async () => {
			await BodyWeightRepository.log('2025-01-10', 80.0);

			const result = await AnalyticsRepository.getBodyWeightRange({
				start: '2025-02-01',
				end: '2025-02-28'
			});

			expect(result).toEqual([]);
		});

		it('returns entries with correct fields', async () => {
			await BodyWeightRepository.log('2025-01-10', 80.5);

			const result = await AnalyticsRepository.getBodyWeightRange({
				start: '2025-01-01',
				end: '2025-01-31'
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveProperty('id');
			expect(result[0]).toHaveProperty('date');
			expect(result[0]).toHaveProperty('weight_kg');
			expect(result[0].weight_kg).toBe(80.5);
		});
	});

	// ── Critical: Working-set filter proof ──

	describe('working-set filter enforcement', () => {
		it('NEVER returns warmup, drop, or failure sets — even when completed', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			// Seed a mix of all set types, all completed
			const workingSetId = await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.WARMUP, 40, 15, true);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.WARMUP, 60, 12, true);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.DROP, 80, 10, true);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.DROP, 60, 12, true);
			await addNonWorkingSet(sessionId, EXERCISE_UUID_1, SetType.FAILURE, 100, 3, true);

			await completeSession(sessionId);

			// Test all 3 query methods that touch workout_sets

			// Method 1: getExerciseSetsHistory
			const history = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);
			expect(history).toHaveLength(1);
			expect(history[0].id).toBe(workingSetId);
			expect(history[0].set_type).toBe('working');

			// Method 2: getCompletedWorkingSets
			const workingSets = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[sessionId]
			);
			expect(workingSets).toHaveLength(1);
			expect(workingSets[0].id).toBe(workingSetId);
			expect(workingSets[0].set_type).toBe('working');

			// Method 3: getRecentSessionsForExercise — verify it finds the session
			// (because there IS one working set)
			const sessions = await AnalyticsRepository.getRecentSessionsForExercise(EXERCISE_UUID_1, 5);
			expect(sessions).toHaveLength(1);
		});

		it('NEVER returns incomplete working sets', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			const sessionId = await seedCompletedSession(
				program.id,
				trainingDay.id,
				'2025-01-15T10:00:00'
			);

			// One completed working set
			await addCompletedWorkingSet(sessionId, EXERCISE_UUID_1, 100, 8);

			// Two incomplete working sets (completed=0)
			await WorkoutRepository.addSet(sessionId, {
				exercise_id: EXERCISE_UUID_1,
				set_type: SetType.WORKING,
				weight: 100,
				reps: 5
			});
			await WorkoutRepository.addSet(sessionId, {
				exercise_id: EXERCISE_UUID_1,
				set_type: SetType.WORKING,
				weight: 100,
				reps: 3
			});

			await completeSession(sessionId);

			const history = await AnalyticsRepository.getExerciseSetsHistory(EXERCISE_UUID_1);
			expect(history).toHaveLength(1);
			expect(history[0].weight).toBe(100);
			expect(history[0].reps).toBe(8);

			const workingSets = await AnalyticsRepository.getCompletedWorkingSets(
				EXERCISE_UUID_1,
				[sessionId]
			);
			expect(workingSets).toHaveLength(1);
		});
	});
});
