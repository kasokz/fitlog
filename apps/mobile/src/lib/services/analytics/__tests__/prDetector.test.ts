import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setupMockDatabase, teardownMockDatabase } from '../../../db/__tests__/test-helpers.js';

import type { WorkoutSet } from '../../../types/workout.js';

// Install mock before any imports that use the plugin
setupMockDatabase();

// Dynamic imports — must be after mock setup for DB-dependent modules
const { detectPRs, getPRHistory } = await import('../prDetector.js');
const { getDb, dbExecute, _resetForTesting } = await import('../../../db/database.js');
const { WorkoutRepository } = await import('../../../db/repositories/workout.js');
const { ProgramRepository } = await import('../../../db/repositories/program.js');

// ── Helper: create a mock WorkoutSet ──

function makeSet(overrides: Partial<WorkoutSet> & { weight: number | null; reps: number | null }): WorkoutSet {
	return {
		id: crypto.randomUUID(),
		session_id: 'session-1',
		exercise_id: 'exercise-1',
		assignment_id: null,
		set_number: 1,
		set_type: 'working',
		weight: overrides.weight,
		reps: overrides.reps,
		rir: null,
		completed: true,
		rest_seconds: null,
		created_at: '2025-01-01T00:00:00',
		updated_at: '2025-01-01T00:00:00',
		deleted_at: null,
		...overrides
	};
}

const EXERCISE_ID = '00000000-0000-4000-8000-000000000001';

// ── DB seed helpers (match analytics-repository.test.ts pattern) ──

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
		{ name: 'Test Program', description: 'For PR tests' },
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
	await dbExecute(
		'UPDATE workout_sessions SET started_at = ? WHERE id = ?',
		[startedAt, session.id]
	);
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

describe('prDetector', () => {
	// ── detectPRs (pure, no DB) ──

	describe('detectPRs', () => {
		it('detects weight PR when new set exceeds historical max weight', () => {
			const historical = [
				makeSet({ weight: 100, reps: 5 }),
				makeSet({ weight: 95, reps: 8 }),
			];
			const newSets = [
				makeSet({ weight: 102.5, reps: 5 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const weightPR = prs.find((p) => p.type === 'weight_pr');
			expect(weightPR).toBeDefined();
			expect(weightPR!.value).toBe(102.5);
		});

		it('detects rep PR when new set exceeds historical max reps at same weight', () => {
			const historical = [
				makeSet({ weight: 100, reps: 6 }),
				makeSet({ weight: 100, reps: 5 }),
			];
			const newSets = [
				makeSet({ weight: 100, reps: 8 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const repPR = prs.find((p) => p.type === 'rep_pr');
			expect(repPR).toBeDefined();
			expect(repPR!.value).toBe(8);
			expect(repPR!.weight).toBe(100);
		});

		it('detects e1RM PR when new set produces higher estimated 1RM', () => {
			// Historical best: 100kg × 5 reps = e1RM 116.7
			const historical = [
				makeSet({ weight: 100, reps: 5 }),
			];
			// New: 110kg × 3 reps = e1RM 121.0
			const newSets = [
				makeSet({ weight: 110, reps: 3 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const e1rmPR = prs.find((p) => p.type === 'e1rm_pr');
			expect(e1rmPR).toBeDefined();
			expect(e1rmPR!.value).toBe(121);
		});

		it('returns empty array when no PRs detected', () => {
			const historical = [
				makeSet({ weight: 100, reps: 8 }),
				makeSet({ weight: 100, reps: 6 }),
			];
			// Same weight, fewer reps, lower e1RM — no PR in any category
			const newSets = [
				makeSet({ weight: 100, reps: 5 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);
			expect(prs).toEqual([]);
		});

		it('detects multiple PR types from a single set simultaneously', () => {
			// Historical: 100kg × 5 reps (e1RM 116.7)
			const historical = [
				makeSet({ weight: 100, reps: 5 }),
			];
			// New: 105kg × 6 reps → weight_pr (105 > 100), e1rm_pr (105 * 1.2 = 126 > 116.7)
			const newSets = [
				makeSet({ weight: 105, reps: 6 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const types = prs.map((p) => p.type).sort();
			expect(types).toContain('weight_pr');
			expect(types).toContain('e1rm_pr');
		});

		it('ignores warmup sets in newSets (defense-in-depth filter)', () => {
			const historical = [
				makeSet({ weight: 50, reps: 5 }),
			];
			// Warmup set with high weight should NOT trigger a PR
			const newSets = [
				makeSet({ weight: 200, reps: 10, set_type: 'warmup' }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);
			expect(prs).toEqual([]);
		});

		it('ignores warmup sets in historicalSets (defense-in-depth filter)', () => {
			// Historical includes a warmup set at high weight — should be excluded
			const historical = [
				makeSet({ weight: 200, reps: 10, set_type: 'warmup' }),
				makeSet({ weight: 80, reps: 5 }),
			];
			const newSets = [
				makeSet({ weight: 100, reps: 5 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			// Weight PR: 100 > 80 (not compared against warmup 200)
			const weightPR = prs.find((p) => p.type === 'weight_pr');
			expect(weightPR).toBeDefined();
			expect(weightPR!.value).toBe(100);
		});

		it('ignores incomplete sets in newSets (defense-in-depth filter)', () => {
			const historical = [
				makeSet({ weight: 80, reps: 5 }),
			];
			const newSets = [
				makeSet({ weight: 200, reps: 10, completed: false }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);
			expect(prs).toEqual([]);
		});

		it('handles first-ever set for an exercise (empty history = always PR)', () => {
			const historical: WorkoutSet[] = [];
			const newSets = [
				makeSet({ weight: 60, reps: 8 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			// With empty history, -Infinity is the baseline, so all categories are PRs
			expect(prs.length).toBeGreaterThanOrEqual(1);
			const types = prs.map((p) => p.type);
			expect(types).toContain('weight_pr');
			expect(types).toContain('rep_pr');
			expect(types).toContain('e1rm_pr');
		});

		it('does not flag e1RM PR for sets with reps > 10', () => {
			const historical = [
				makeSet({ weight: 50, reps: 5 }),  // e1RM = 58.3
			];
			// 100kg × 15 reps would be huge e1RM, but reps > 10 so estimateOneRepMax returns null
			const newSets = [
				makeSet({ weight: 100, reps: 15 }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const e1rmPR = prs.find((p) => p.type === 'e1rm_pr');
			expect(e1rmPR).toBeUndefined();
		});

		it('each PR has a unique id, correct exercise_id, and session_id', () => {
			const historical: WorkoutSet[] = [];
			const sessionId = crypto.randomUUID();
			const newSets = [
				makeSet({ weight: 100, reps: 5, session_id: sessionId }),
			];

			const prs = detectPRs(EXERCISE_ID, newSets, historical);

			const ids = new Set(prs.map((p) => p.id));
			expect(ids.size).toBe(prs.length); // All unique
			for (const pr of prs) {
				expect(pr.exercise_id).toBe(EXERCISE_ID);
				expect(pr.session_id).toBe(sessionId);
			}
		});
	});

	// ── getPRHistory (needs DB) ──

	describe('getPRHistory', () => {
		beforeEach(async () => {
			_resetForTesting();
			await getDb();
			await clearAll();
		});

		afterEach(async () => {
			await teardownMockDatabase();
		});

		it('returns chronological PR list across multiple sessions', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: 80kg × 8 (first ever = all 3 PR types)
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_ID, 80, 8);
			await completeSession(s1);

			// Session 2: 90kg × 6 → weight_pr (90 > 80), e1rm_pr (90*1.2=108 > 80*1.267=101.3)
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_ID, 90, 6);
			await completeSession(s2);

			// Session 3: 80kg × 10 → rep_pr at 80kg (10 > 8)
			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_ID, 80, 10);
			await completeSession(s3);

			const prs = await getPRHistory(EXERCISE_ID);

			expect(prs.length).toBeGreaterThan(0);

			// Check PRs are in chronological order
			for (let i = 1; i < prs.length; i++) {
				expect(prs[i].date >= prs[i - 1].date).toBe(true);
			}

			// Verify session 1 produces the initial PRs
			const s1PRs = prs.filter((p) => p.date === '2025-01-10T10:00:00');
			const s1Types = s1PRs.map((p) => p.type);
			expect(s1Types).toContain('weight_pr');
			expect(s1Types).toContain('rep_pr');
			expect(s1Types).toContain('e1rm_pr');

			// Verify session 2 has weight PR
			const s2PRs = prs.filter((p) => p.date === '2025-01-15T10:00:00');
			const s2Types = s2PRs.map((p) => p.type);
			expect(s2Types).toContain('weight_pr');
		});

		it('returns empty array when no sets exist for the exercise', async () => {
			const prs = await getPRHistory(EXERCISE_ID);
			expect(prs).toEqual([]);
		});

		it('correctly identifies progressive weight PRs', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Three sessions with increasing weight
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_ID, 60, 5);
			await completeSession(s1);

			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_ID, 70, 5);
			await completeSession(s2);

			const s3 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-20T10:00:00');
			await addCompletedWorkingSet(s3, EXERCISE_ID, 80, 5);
			await completeSession(s3);

			const prs = await getPRHistory(EXERCISE_ID);

			const weightPRs = prs.filter((p) => p.type === 'weight_pr');
			expect(weightPRs).toHaveLength(3); // Each session set a new weight PR
			expect(weightPRs[0].value).toBe(60);
			expect(weightPRs[1].value).toBe(70);
			expect(weightPRs[2].value).toBe(80);
		});

		it('does not flag non-improving sets as PRs', async () => {
			const { program, trainingDay } = await seedProgramAndDay();

			// Session 1: 100kg × 8
			const s1 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-10T10:00:00');
			await addCompletedWorkingSet(s1, EXERCISE_ID, 100, 8);
			await completeSession(s1);

			// Session 2: same or worse → no new PRs
			const s2 = await seedCompletedSession(program.id, trainingDay.id, '2025-01-15T10:00:00');
			await addCompletedWorkingSet(s2, EXERCISE_ID, 100, 6);
			await completeSession(s2);

			const prs = await getPRHistory(EXERCISE_ID);

			// Only session 1 should have PRs (first session)
			const s2PRs = prs.filter((p) => p.date === '2025-01-15T10:00:00');
			expect(s2PRs).toHaveLength(0);
		});
	});
});
