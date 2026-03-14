import { describe, expect, it } from 'vitest';

import type { Mesocycle } from '../../../types/program.js';
import { SetType } from '../../../types/workout.js';
import { applyDeloadTransform, type CandidateSet } from '../deloadCalculator.js';

// ── Helpers ──

const EXERCISE_A = '00000000-0000-4000-8000-000000000010';
const EXERCISE_B = '00000000-0000-4000-8000-000000000020';
const ASSIGNMENT_A = '00000000-0000-4000-8000-000000000030';
const ASSIGNMENT_B = '00000000-0000-4000-8000-000000000040';

function makeMesocycle(overrides: Partial<Mesocycle> = {}): Mesocycle {
	return {
		id: '00000000-0000-4000-8000-000000000001',
		program_id: '00000000-0000-4000-8000-000000000002',
		weeks_count: 4,
		deload_week_number: 4,
		start_date: '2025-01-01',
		current_week: 1,
		created_at: '2025-01-01T00:00:00',
		updated_at: '2025-01-01T00:00:00',
		deleted_at: null,
		...overrides
	};
}

function makeCandidate(overrides: Partial<CandidateSet> = {}): CandidateSet {
	return {
		exercise_id: EXERCISE_A,
		assignment_id: ASSIGNMENT_A,
		set_type: SetType.WORKING,
		weight: 100,
		reps: 8,
		rir: 2,
		...overrides
	};
}

/** Build candidate sets mimicking last-session pre-fill for an exercise */
function makeLastSessionCandidates(
	exerciseId: string,
	assignmentId: string,
	count: number,
	weight: number
): CandidateSet[] {
	return Array.from({ length: count }, () =>
		makeCandidate({
			exercise_id: exerciseId,
			assignment_id: assignmentId,
			weight,
			reps: 10,
			rir: 2
		})
	);
}

/** Build candidate sets mimicking template-defaults pre-fill */
function makeTemplateCandidates(
	exerciseId: string,
	assignmentId: string,
	count: number,
	minReps: number
): CandidateSet[] {
	return Array.from({ length: count }, () =>
		makeCandidate({
			exercise_id: exerciseId,
			assignment_id: assignmentId,
			weight: 0,
			reps: minReps,
			rir: 2
		})
	);
}

// ── Deload active — last-session branch ──

describe('applyDeloadTransform — deload active, last-session branch', () => {
	const deloadMeso = makeMesocycle({ current_week: 4, deload_week_number: 4 });

	it('reduces weight to ~60% (rounded to 2.5kg) for a single exercise', () => {
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 3, 100);

		const result = applyDeloadTransform(candidates, deloadMeso);

		expect(result).toHaveLength(3);
		for (const c of result) {
			expect(c.weight).toBe(60); // 100 * 0.6 = 60
			expect(c.reps).toBe(10);
			expect(c.rir).toBeNull(); // Deload sets don't carry RIR
			expect(c.exercise_id).toBe(EXERCISE_A);
			expect(c.assignment_id).toBe(ASSIGNMENT_A);
		}
	});

	it('caps volume at 3 working sets per exercise when more than 3 exist', () => {
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 5, 80);

		const result = applyDeloadTransform(candidates, deloadMeso);

		expect(result).toHaveLength(3);
		// 80 * 0.6 = 48 → round to 47.5
		for (const c of result) {
			expect(c.weight).toBe(47.5);
		}
	});

	it('handles multiple exercises independently', () => {
		const candidates = [
			...makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 4, 100),
			...makeLastSessionCandidates(EXERCISE_B, ASSIGNMENT_B, 5, 60)
		];

		const result = applyDeloadTransform(candidates, deloadMeso);

		const exA = result.filter((c) => c.exercise_id === EXERCISE_A);
		const exB = result.filter((c) => c.exercise_id === EXERCISE_B);

		// Both capped at 3
		expect(exA).toHaveLength(3);
		expect(exB).toHaveLength(3);

		// Exercise A: 100 * 0.6 = 60
		for (const c of exA) {
			expect(c.weight).toBe(60);
			expect(c.assignment_id).toBe(ASSIGNMENT_A);
		}

		// Exercise B: 60 * 0.6 = 36 → round to 35
		for (const c of exB) {
			expect(c.weight).toBe(35);
			expect(c.assignment_id).toBe(ASSIGNMENT_B);
		}
	});

	it('preserves assignment_id from original candidates', () => {
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 2, 50);

		const result = applyDeloadTransform(candidates, deloadMeso);

		for (const c of result) {
			expect(c.assignment_id).toBe(ASSIGNMENT_A);
		}
	});
});

// ── Deload active — template-defaults branch ──

describe('applyDeloadTransform — deload active, template-defaults branch', () => {
	const deloadMeso = makeMesocycle({ current_week: 4, deload_week_number: 4 });

	it('keeps weight at 0 when template defaults have weight=0', () => {
		const candidates = makeTemplateCandidates(EXERCISE_A, ASSIGNMENT_A, 3, 8);

		const result = applyDeloadTransform(candidates, deloadMeso);

		expect(result).toHaveLength(3);
		for (const c of result) {
			expect(c.weight).toBe(0); // 0 * 0.6 = 0
			expect(c.reps).toBe(8);
		}
	});

	it('caps volume at 3 even when template specifies more sets', () => {
		const candidates = makeTemplateCandidates(EXERCISE_A, ASSIGNMENT_A, 5, 10);

		const result = applyDeloadTransform(candidates, deloadMeso);

		expect(result).toHaveLength(3);
	});

	it('handles mixed exercises from template with volume capping each independently', () => {
		const candidates = [
			...makeTemplateCandidates(EXERCISE_A, ASSIGNMENT_A, 4, 8),
			...makeTemplateCandidates(EXERCISE_B, ASSIGNMENT_B, 4, 12)
		];

		const result = applyDeloadTransform(candidates, deloadMeso);

		const exA = result.filter((c) => c.exercise_id === EXERCISE_A);
		const exB = result.filter((c) => c.exercise_id === EXERCISE_B);

		expect(exA).toHaveLength(3);
		expect(exB).toHaveLength(3);
		expect(exA[0].reps).toBe(8);
		expect(exB[0].reps).toBe(12);
	});
});

// ── Bypass cases — sets unchanged ──

describe('applyDeloadTransform — bypass (no deload)', () => {
	it('returns sets unchanged when not in deload week', () => {
		const meso = makeMesocycle({ current_week: 2, deload_week_number: 4 });
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 4, 100);

		const result = applyDeloadTransform(candidates, meso);

		// Should be the exact same reference (identity check)
		expect(result).toBe(candidates);
		expect(result).toHaveLength(4);
		for (const c of result) {
			expect(c.weight).toBe(100);
			expect(c.rir).toBe(2);
		}
	});

	it('returns sets unchanged when mesocycle is null', () => {
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 4, 100);

		const result = applyDeloadTransform(candidates, null);

		expect(result).toBe(candidates);
		expect(result).toHaveLength(4);
		for (const c of result) {
			expect(c.weight).toBe(100);
		}
	});

	it('returns sets unchanged when deload is disabled (deload_week_number=0)', () => {
		const meso = makeMesocycle({ deload_week_number: 0, current_week: 4 });
		const candidates = makeLastSessionCandidates(EXERCISE_A, ASSIGNMENT_A, 3, 80);

		const result = applyDeloadTransform(candidates, meso);

		expect(result).toBe(candidates);
		for (const c of result) {
			expect(c.weight).toBe(80);
			expect(c.rir).toBe(2);
		}
	});

	it('preserves all set fields including rir when not in deload', () => {
		const meso = makeMesocycle({ current_week: 1 });
		const candidates = [
			makeCandidate({ weight: 50, reps: 12, rir: 3 }),
			makeCandidate({ weight: null, reps: 8, rir: null })
		];

		const result = applyDeloadTransform(candidates, meso);

		expect(result[0].weight).toBe(50);
		expect(result[0].rir).toBe(3);
		expect(result[1].weight).toBeNull();
		expect(result[1].rir).toBeNull();
	});
});

// ── Edge cases ──

describe('applyDeloadTransform — edge cases', () => {
	const deloadMeso = makeMesocycle({ current_week: 4, deload_week_number: 4 });

	it('returns empty array when no candidates and deload active', () => {
		const result = applyDeloadTransform([], deloadMeso);
		expect(result).toEqual([]);
	});

	it('handles null weight in last-session sets during deload', () => {
		const candidates = [makeCandidate({ weight: null, reps: 10 })];

		const result = applyDeloadTransform(candidates, deloadMeso);

		expect(result).toHaveLength(1);
		expect(result[0].weight).toBeNull();
	});

	it('filters out non-working sets during deload (defense-in-depth)', () => {
		const candidates = [
			makeCandidate({ set_type: SetType.WARMUP, weight: 40 }),
			makeCandidate({ set_type: SetType.WORKING, weight: 100 }),
			makeCandidate({ set_type: SetType.DROP, weight: 60 }),
			makeCandidate({ set_type: SetType.WORKING, weight: 100 })
		];

		const result = applyDeloadTransform(candidates, deloadMeso);

		// Only 2 working sets pass through calculateDeloadSets
		expect(result).toHaveLength(2);
		for (const c of result) {
			expect(c.weight).toBe(60); // 100 * 0.6
			expect(c.set_type).toBe(SetType.WORKING);
		}
	});
});
