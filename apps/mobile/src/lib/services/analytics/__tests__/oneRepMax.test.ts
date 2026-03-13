import { describe, expect, it } from 'vitest';

import { bestEstimatedOneRM, estimateOneRepMax } from '../oneRepMax.js';

describe('oneRepMax', () => {
	// ── estimateOneRepMax ──

	describe('estimateOneRepMax', () => {
		it('estimates 1RM correctly with Epley formula: 100kg × 5 reps = 116.7', () => {
			expect(estimateOneRepMax(100, 5)).toBe(116.7);
		});

		it('handles various rep ranges within 2-10', () => {
			// 80kg × 8 reps = 80 * (1 + 8/30) = 80 * 1.2667 = 101.3
			expect(estimateOneRepMax(80, 8)).toBe(101.3);
			// 60kg × 3 reps = 60 * (1 + 3/30) = 60 * 1.1 = 66
			expect(estimateOneRepMax(60, 3)).toBe(66);
		});

		it('returns weight directly for reps === 1 (1RM IS the 1RM)', () => {
			expect(estimateOneRepMax(100, 1)).toBe(100);
			expect(estimateOneRepMax(200, 1)).toBe(200);
			expect(estimateOneRepMax(0.5, 1)).toBe(0.5);
		});

		it('works at the boundary: reps === 10', () => {
			// 100kg × 10 reps = 100 * (1 + 10/30) = 100 * 1.3333 = 133.3
			expect(estimateOneRepMax(100, 10)).toBe(133.3);
		});

		it('returns null for reps > 10 (D043 cap)', () => {
			expect(estimateOneRepMax(100, 11)).toBeNull();
			expect(estimateOneRepMax(100, 15)).toBeNull();
			expect(estimateOneRepMax(100, 20)).toBeNull();
			expect(estimateOneRepMax(100, 100)).toBeNull();
		});

		it('returns null for null weight', () => {
			expect(estimateOneRepMax(null, 5)).toBeNull();
		});

		it('returns null for null reps', () => {
			expect(estimateOneRepMax(100, null)).toBeNull();
		});

		it('returns null for both null', () => {
			expect(estimateOneRepMax(null, null)).toBeNull();
		});

		it('returns null for zero weight', () => {
			expect(estimateOneRepMax(0, 5)).toBeNull();
		});

		it('returns null for zero reps', () => {
			expect(estimateOneRepMax(100, 0)).toBeNull();
		});

		it('returns null for negative weight', () => {
			expect(estimateOneRepMax(-10, 5)).toBeNull();
		});

		it('returns null for negative reps', () => {
			expect(estimateOneRepMax(100, -3)).toBeNull();
		});

		it('rounds to 1 decimal place', () => {
			// 100kg × 7 reps = 100 * (1 + 7/30) = 100 * 1.23333... = 123.3
			expect(estimateOneRepMax(100, 7)).toBe(123.3);
			// 75kg × 6 reps = 75 * (1 + 6/30) = 75 * 1.2 = 90
			expect(estimateOneRepMax(75, 6)).toBe(90);
		});
	});

	// ── bestEstimatedOneRM ──

	describe('bestEstimatedOneRM', () => {
		it('finds the set with the highest e1RM from a mixed collection', () => {
			const result = bestEstimatedOneRM([
				{ weight: 100, reps: 5, date: '2025-01-10' },  // 116.7
				{ weight: 90, reps: 8, date: '2025-01-12' },   // 114.0
				{ weight: 110, reps: 3, date: '2025-01-14' },  // 121.0
				{ weight: 80, reps: 10, date: '2025-01-16' },  // 106.7
			]);

			expect(result).toEqual({
				e1rm: 121,
				weight: 110,
				reps: 3,
				date: '2025-01-14'
			});
		});

		it('returns null for empty array', () => {
			expect(bestEstimatedOneRM([])).toBeNull();
		});

		it('returns null when all sets have invalid inputs', () => {
			const result = bestEstimatedOneRM([
				{ weight: null, reps: 5, date: '2025-01-10' },
				{ weight: 100, reps: null, date: '2025-01-12' },
				{ weight: 100, reps: 15, date: '2025-01-14' }, // >10 reps
				{ weight: 0, reps: 5, date: '2025-01-16' },
			]);

			expect(result).toBeNull();
		});

		it('skips invalid sets and returns best from valid ones', () => {
			const result = bestEstimatedOneRM([
				{ weight: null, reps: 5, date: '2025-01-10' },   // invalid
				{ weight: 100, reps: 5, date: '2025-01-12' },    // 116.7 — valid
				{ weight: 100, reps: 15, date: '2025-01-14' },   // >10 reps — invalid
			]);

			expect(result).toEqual({
				e1rm: 116.7,
				weight: 100,
				reps: 5,
				date: '2025-01-12'
			});
		});

		it('handles single valid set', () => {
			const result = bestEstimatedOneRM([
				{ weight: 80, reps: 1, date: '2025-01-10' },
			]);

			expect(result).toEqual({
				e1rm: 80,
				weight: 80,
				reps: 1,
				date: '2025-01-10'
			});
		});

		it('picks the first set when multiple have the same e1RM', () => {
			// Both produce e1RM = 116.7 but first should win (> not >=)
			const result = bestEstimatedOneRM([
				{ weight: 100, reps: 5, date: '2025-01-10' },
				{ weight: 100, reps: 5, date: '2025-01-12' },
			]);

			expect(result?.date).toBe('2025-01-10');
		});
	});
});
