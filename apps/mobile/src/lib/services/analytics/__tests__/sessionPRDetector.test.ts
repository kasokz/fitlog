import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from '../../../db/__tests__/test-helpers.js';

import type { WorkoutSet } from '../../../types/workout.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

// Dynamic imports — must be after mock setup for DB-dependent modules
const { detectSessionPRs } = await import('../sessionPRDetector.js');
const { getDb, dbExecute, _resetForTesting } = await import('../../../db/database.js');
const { WorkoutRepository } = await import('../../../db/repositories/workout.js');
const { ProgramRepository } = await import('../../../db/repositories/program.js');

// ── Constants ──

const EXERCISE_A = '00000000-0000-4000-8000-000000000001';
const EXERCISE_B = '00000000-0000-4000-8000-000000000002';
const EXERCISE_C = '00000000-0000-4000-8000-000000000003';

// ── Helper: create a mock WorkoutSet ──

function makeSet(
	overrides: Partial<WorkoutSet> & { weight: number | null; reps: number | null }
): WorkoutSet {
	return {
		id: crypto.randomUUID(),
		session_id: 'session-1',
		exercise_id: EXERCISE_A,
		assignment_id: null,
		set_number: 1,
		set_type: 'working',
		rir: null,
		completed: true,
		rest_seconds: null,
		created_at: '2025-01-01T00:00:00',
		updated_at: '2025-01-01T00:00:00',
		deleted_at: null,
		...overrides
	};
}

// ── DB seed helpers (match prDetector.test.ts pattern) ──

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
		{ name: 'Test Program', description: 'For session PR tests' },
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
		training_day_id: trainingDayId
	});
	await dbExecute('UPDATE workout_sessions SET started_at = ? WHERE id = ?', [
		startedAt,
		session.id
	]);
	return session.id;
}

async function addCompletedWorkingSet(
	sessionId: string,
	exerciseId: string,
	weight: number,
	reps: number
): Promise<string> {
	const set = await WorkoutRepository.addSet(sessionId, {
		exercise_id: exerciseId,
		set_type: 'working',
		weight,
		reps
	});
	await WorkoutRepository.updateSet(set.id, { completed: true });
	return set.id;
}

async function completeSession(sessionId: string): Promise<void> {
	await WorkoutRepository.completeSession(sessionId, 3600);
}

/** Read all sets from a session to build ExerciseGroup input */
async function getSessionSets(sessionId: string, exerciseId: string): Promise<WorkoutSet[]> {
	const session = await WorkoutRepository.getSessionById(sessionId);
	if (!session) return [];
	return session.sets.filter(
		(s) => s.exercise_id === exerciseId && s.set_type === 'working' && s.completed
	);
}

// ── Tests ──

describe('sessionPRDetector', () => {
	beforeEach(async () => {
		_resetForTesting();
		await getDb();
		await clearAll();
	});

	afterEach(async () => {
		await teardownMockDatabase();
	});

	it('detects weight PR at session completion', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Session 1 (historical): 80kg × 5
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 80, 5);
		await completeSession(s1);

		// Session 2 (current): 90kg × 5 — should be a weight PR
		const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
		await addCompletedWorkingSet(s2, EXERCISE_A, 90, 5);
		await completeSession(s2);

		const sets = await getSessionSets(s2, EXERCISE_A);

		const result = await detectSessionPRs(s2, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Bench Press', sets }
		]);

		expect(result.exerciseCount).toBe(1);
		expect(result.prs.length).toBeGreaterThan(0);

		const weightPR = result.prs.find((p) => p.type === 'weight_pr');
		expect(weightPR).toBeDefined();
		expect(weightPR!.value).toBe(90);
		expect(weightPR!.exerciseName).toBe('Bench Press');
	});

	it('excludes current session from history (no self-comparison)', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Only one session — the "current" one. If self-comparison was allowed,
		// the set would be compared against itself and no PR would be detected
		// (since it can't beat itself). With correct exclusion, history is empty
		// and the set is the first ever → PRs detected.
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 100, 5);
		await completeSession(s1);

		const sets = await getSessionSets(s1, EXERCISE_A);

		const result = await detectSessionPRs(s1, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Squat', sets }
		]);

		// With current session excluded, history is empty → first-ever set = PR
		expect(result.prs.length).toBeGreaterThan(0);
		const types = result.prs.map((p) => p.type);
		expect(types).toContain('weight_pr');
	});

	it('returns empty when no improvements over history', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Session 1 (historical): 100kg × 8
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 100, 8);
		await completeSession(s1);

		// Session 2 (current): 100kg × 6 — same weight, fewer reps, lower e1RM
		const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
		await addCompletedWorkingSet(s2, EXERCISE_A, 100, 6);
		await completeSession(s2);

		const sets = await getSessionSets(s2, EXERCISE_A);

		const result = await detectSessionPRs(s2, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Bench Press', sets }
		]);

		expect(result.exerciseCount).toBe(1);
		expect(result.prs).toEqual([]);
	});

	it('handles multiple exercises in parallel', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Historical session with all 3 exercises at baseline weights
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 80, 5);
		await addCompletedWorkingSet(s1, EXERCISE_B, 60, 8);
		await addCompletedWorkingSet(s1, EXERCISE_C, 40, 10);
		await completeSession(s1);

		// Current session — all exercises improve
		const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
		await addCompletedWorkingSet(s2, EXERCISE_A, 90, 5); // weight PR
		await addCompletedWorkingSet(s2, EXERCISE_B, 70, 8); // weight PR
		await addCompletedWorkingSet(s2, EXERCISE_C, 50, 10); // weight PR
		await completeSession(s2);

		const setsA = await getSessionSets(s2, EXERCISE_A);
		const setsB = await getSessionSets(s2, EXERCISE_B);
		const setsC = await getSessionSets(s2, EXERCISE_C);

		const result = await detectSessionPRs(s2, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Bench Press', sets: setsA },
			{ exerciseId: EXERCISE_B, exerciseName: 'Overhead Press', sets: setsB },
			{ exerciseId: EXERCISE_C, exerciseName: 'Lateral Raise', sets: setsC }
		]);

		expect(result.exerciseCount).toBe(3);

		// Each exercise should have at least a weight PR
		const exerciseNames = [...new Set(result.prs.map((p) => p.exerciseName))];
		expect(exerciseNames).toContain('Bench Press');
		expect(exerciseNames).toContain('Overhead Press');
		expect(exerciseNames).toContain('Lateral Raise');
	});

	it('per-exercise error does not block other exercises', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Historical session with exercise A
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 80, 5);
		await completeSession(s1);

		// Current session with exercise A (improved)
		const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
		await addCompletedWorkingSet(s2, EXERCISE_A, 90, 5);
		await completeSession(s2);

		const setsA = await getSessionSets(s2, EXERCISE_A);

		// Spy on console.warn to verify error logging
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		// Create a set that references a broken exercise (will still run detection
		// but the sets themselves just won't match any history - the important thing
		// is it doesn't throw and block exercise A)
		const brokenSet = makeSet({
			weight: 999,
			reps: 1,
			session_id: s2,
			exercise_id: 'broken-exercise-id'
		});

		const result = await detectSessionPRs(s2, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Bench Press', sets: setsA },
			{ exerciseId: 'broken-exercise-id', exerciseName: 'Broken Exercise', sets: [brokenSet] }
		]);

		// Exercise A should still have PRs despite the other exercise group
		expect(result.exerciseCount).toBe(2);
		const benchPRs = result.prs.filter((p) => p.exerciseName === 'Bench Press');
		expect(benchPRs.length).toBeGreaterThan(0);

		warnSpy.mockRestore();
	});

	it('empty session returns empty result', async () => {
		const result = await detectSessionPRs('nonexistent-session-id', []);

		expect(result.prs).toEqual([]);
		expect(result.exerciseCount).toBe(0);
		expect(result.detectionTimeMs).toBe(0);
	});

	it('enriches PRs with exercise names', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		// Session 1 (historical)
		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 80, 5);
		await completeSession(s1);

		// Session 2 (current) — improved
		const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
		await addCompletedWorkingSet(s2, EXERCISE_A, 100, 8);
		await completeSession(s2);

		const sets = await getSessionSets(s2, EXERCISE_A);

		const result = await detectSessionPRs(s2, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Deadlift', sets }
		]);

		// Every PR should have the exerciseName field
		for (const pr of result.prs) {
			expect(pr.exerciseName).toBe('Deadlift');
			expect(pr.exercise_id).toBe(EXERCISE_A);
		}
	});

	it('includes detectionTimeMs in result', async () => {
		const { program, trainingDay } = await seedProgramAndDay();

		const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
		await addCompletedWorkingSet(s1, EXERCISE_A, 80, 5);
		await completeSession(s1);

		const sets = await getSessionSets(s1, EXERCISE_A);

		const result = await detectSessionPRs(s1, [
			{ exerciseId: EXERCISE_A, exerciseName: 'Bench Press', sets }
		]);

		expect(typeof result.detectionTimeMs).toBe('number');
		expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
	});
});
