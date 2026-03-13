import { describe, expect, it } from 'vitest';

import { uuidv5 } from '../../utils/uuid-v5.js';

describe('uuidv5', () => {
	it('produces a valid UUID v5 format', async () => {
		const id = await uuidv5('Bench Press');
		// UUID format: 8-4-4-4-12 hex chars
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('is deterministic — same input always produces same output', async () => {
		const a = await uuidv5('Bench Press');
		const b = await uuidv5('Bench Press');
		const c = await uuidv5('Bench Press');
		expect(a).toBe(b);
		expect(b).toBe(c);
	});

	it('produces different UUIDs for different inputs', async () => {
		const bench = await uuidv5('Bench Press');
		const squat = await uuidv5('Squat');
		const deadlift = await uuidv5('Deadlift');
		expect(bench).not.toBe(squat);
		expect(bench).not.toBe(deadlift);
		expect(squat).not.toBe(deadlift);
	});

	it('produces a consistent known value for "Bench Press"', async () => {
		const id = await uuidv5('Bench Press');
		// Pinned: URL namespace + "Bench Press" → this exact UUID v5
		expect(id).toBe('b242a8fb-2ebe-55f4-b747-71b586fb5bda');
	});

	it('handles empty string input', async () => {
		const id = await uuidv5('');
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('handles unicode input', async () => {
		const id = await uuidv5('Übung mit Ümlauten');
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		// Deterministic for unicode too
		const id2 = await uuidv5('Übung mit Ümlauten');
		expect(id).toBe(id2);
	});
});
