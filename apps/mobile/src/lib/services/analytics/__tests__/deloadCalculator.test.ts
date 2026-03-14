import { describe, expect, it } from 'vitest';

import type { Mesocycle } from '../../../types/program.js';
import type { WorkoutSet } from '../../../types/workout.js';
import { SetType } from '../../../types/workout.js';
import { calculateDeloadSets, isDeloadWeek } from '../deloadCalculator.js';

// ── Helpers ──

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

function makeWorkingSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
	return {
		id: '00000000-0000-4000-8000-000000000100',
		session_id: '00000000-0000-4000-8000-000000000200',
		exercise_id: '00000000-0000-4000-8000-000000000010',
		assignment_id: null,
		set_number: 1,
		set_type: SetType.WORKING,
		weight: 100,
		reps: 8,
		rir: 2,
		completed: true,
		rest_seconds: null,
		created_at: '2025-01-01T00:00:00',
		updated_at: '2025-01-01T00:00:00',
		deleted_at: null,
		...overrides
	};
}

// ── isDeloadWeek ──

describe('isDeloadWeek', () => {
	it('returns true when current_week equals deload_week_number', () => {
		const meso = makeMesocycle({ current_week: 4, deload_week_number: 4 });
		expect(isDeloadWeek(meso)).toBe(true);
	});

	it('returns false when current_week does not equal deload_week_number', () => {
		const meso = makeMesocycle({ current_week: 3, deload_week_number: 4 });
		expect(isDeloadWeek(meso)).toBe(false);
	});

	it('returns false when deload_week_number is 0 (disabled, D046)', () => {
		const meso = makeMesocycle({ deload_week_number: 0, current_week: 0 });
		expect(isDeloadWeek(meso)).toBe(false);
	});

	it('returns false when deload_week_number is 0 regardless of current_week', () => {
		const meso = makeMesocycle({ deload_week_number: 0, current_week: 4 });
		expect(isDeloadWeek(meso)).toBe(false);
	});

	it('returns true for edge case: deload on week 1', () => {
		const meso = makeMesocycle({ current_week: 1, deload_week_number: 1 });
		expect(isDeloadWeek(meso)).toBe(true);
	});
});

// ── calculateDeloadSets ──

describe('calculateDeloadSets', () => {
	it('reduces 3 working sets at 100kg to 3 sets at 60kg with default 0.6 factor', () => {
		const sets = [
			makeWorkingSet({ set_number: 1, weight: 100 }),
			makeWorkingSet({ set_number: 2, weight: 100 }),
			makeWorkingSet({ set_number: 3, weight: 100 })
		];

		const result = calculateDeloadSets(sets);

		expect(result).toHaveLength(3);
		for (const ds of result) {
			expect(ds.weight).toBe(60);
			expect(ds.original_weight).toBe(100);
			expect(ds.set_type).toBe(SetType.WORKING);
		}
	});

	it('drops the last set when input has more than 3 working sets (volume reduction)', () => {
		const sets = Array.from({ length: 5 }, (_, i) =>
			makeWorkingSet({ set_number: i + 1, weight: 80, reps: 10 })
		);

		const result = calculateDeloadSets(sets);

		expect(result).toHaveLength(3);
		// 80 * 0.6 = 48 → rounds to 47.5 (nearest 2.5)
		for (const ds of result) {
			expect(ds.weight).toBe(47.5);
			expect(ds.original_weight).toBe(80);
			expect(ds.reps).toBe(10);
		}
	});

	it('applies custom deload factor (0.5 = half weight)', () => {
		const sets = [makeWorkingSet({ weight: 100 })];

		const result = calculateDeloadSets(sets, 0.5);

		expect(result).toHaveLength(1);
		expect(result[0].weight).toBe(50);
		expect(result[0].original_weight).toBe(100);
	});

	it('passes through null weight without crashing', () => {
		const sets = [makeWorkingSet({ weight: null })];

		const result = calculateDeloadSets(sets);

		expect(result).toHaveLength(1);
		expect(result[0].weight).toBeNull();
		expect(result[0].original_weight).toBeNull();
	});

	it('returns empty array for empty input', () => {
		const result = calculateDeloadSets([]);
		expect(result).toEqual([]);
	});

	it('filters out non-working sets (defense-in-depth)', () => {
		const sets = [
			makeWorkingSet({ set_number: 1, set_type: SetType.WARMUP, weight: 40 }),
			makeWorkingSet({ set_number: 2, set_type: SetType.WORKING, weight: 100 }),
			makeWorkingSet({ set_number: 3, set_type: SetType.DROP, weight: 60 }),
			makeWorkingSet({ set_number: 4, set_type: SetType.WORKING, weight: 100 }),
			makeWorkingSet({ set_number: 5, set_type: SetType.FAILURE, weight: 80 })
		];

		const result = calculateDeloadSets(sets);

		// Only 2 working sets, both kept (≤3)
		expect(result).toHaveLength(2);
		expect(result[0].weight).toBe(60);
		expect(result[1].weight).toBe(60);
	});

	it('rounds weight to nearest 2.5kg: 82.5 × 0.6 = 49.5 → 50', () => {
		const sets = [makeWorkingSet({ weight: 82.5 })];

		const result = calculateDeloadSets(sets);

		// 82.5 * 0.6 = 49.5 → nearest 2.5 = 50
		expect(result[0].weight).toBe(50);
		expect(result[0].original_weight).toBe(82.5);
	});

	it('rounds weight to nearest 2.5kg: 100 × 0.6 = 60 (exact, no rounding needed)', () => {
		const sets = [makeWorkingSet({ weight: 100 })];

		const result = calculateDeloadSets(sets);

		expect(result[0].weight).toBe(60);
	});

	it('preserves reps from original sets', () => {
		const sets = [
			makeWorkingSet({ set_number: 1, reps: 8 }),
			makeWorkingSet({ set_number: 2, reps: 6 }),
			makeWorkingSet({ set_number: 3, reps: 5 })
		];

		const result = calculateDeloadSets(sets);

		expect(result[0].reps).toBe(8);
		expect(result[1].reps).toBe(6);
		expect(result[2].reps).toBe(5);
	});

	it('preserves exercise_id from original sets', () => {
		const exerciseId = '00000000-0000-4000-8000-000000000099';
		const sets = [makeWorkingSet({ exercise_id: exerciseId })];

		const result = calculateDeloadSets(sets);

		expect(result[0].exercise_id).toBe(exerciseId);
	});

	it('re-numbers sets sequentially starting from 1', () => {
		const sets = [
			makeWorkingSet({ set_number: 3, weight: 100 }),
			makeWorkingSet({ set_number: 5, weight: 100 }),
			makeWorkingSet({ set_number: 7, weight: 100 })
		];

		const result = calculateDeloadSets(sets);

		expect(result[0].set_number).toBe(1);
		expect(result[1].set_number).toBe(2);
		expect(result[2].set_number).toBe(3);
	});

	it('handles exactly 4 working sets: drops last, keeps 3', () => {
		const sets = Array.from({ length: 4 }, (_, i) =>
			makeWorkingSet({ set_number: i + 1, weight: 60 })
		);

		const result = calculateDeloadSets(sets);

		expect(result).toHaveLength(3);
		// 60 * 0.6 = 36 → rounds to 35 (nearest 2.5)
		for (const ds of result) {
			expect(ds.weight).toBe(35);
		}
	});
});
