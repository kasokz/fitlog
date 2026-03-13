import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock @capacitor/preferences ──

const mockStorage = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		async get(options: { key: string }): Promise<{ value: string | null }> {
			return { value: mockStorage.get(options.key) ?? null };
		},
		async set(options: { key: string; value: string }): Promise<void> {
			mockStorage.set(options.key, options.value);
		},
		async remove(options: { key: string }): Promise<void> {
			mockStorage.delete(options.key);
		}
	}
}));

const { isPremiumUser, setPremiumStatus, canAccessFeature, PremiumFeature } = await import(
	'../../services/premium.js'
);

// ── Tests ──

describe('premium service', () => {
	beforeEach(() => {
		mockStorage.clear();
	});

	afterEach(() => {
		mockStorage.clear();
	});

	// ── isPremiumUser ──

	it('defaults to free (false) when no preference is set', async () => {
		const result = await isPremiumUser();
		expect(result).toBe(false);
	});

	// ── setPremiumStatus ──

	it('setPremiumStatus(true) makes isPremiumUser return true', async () => {
		await setPremiumStatus(true);
		const result = await isPremiumUser();
		expect(result).toBe(true);
	});

	it('setPremiumStatus(false) removes the key, making isPremiumUser return false', async () => {
		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);

		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);
	});

	it('round-trip: free → premium → free → premium', async () => {
		expect(await isPremiumUser()).toBe(false);

		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);

		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);

		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);
	});

	it('multiple setPremiumStatus(true) calls are idempotent', async () => {
		await setPremiumStatus(true);
		await setPremiumStatus(true);
		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);
	});

	it('multiple setPremiumStatus(false) calls are idempotent', async () => {
		await setPremiumStatus(false);
		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);
	});

	// ── canAccessFeature — free user ──

	it('canAccessFeature returns false for full_charts when free', async () => {
		expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(false);
	});

	it('canAccessFeature returns false for extended_history when free', async () => {
		expect(await canAccessFeature(PremiumFeature.extended_history)).toBe(false);
	});

	it('canAccessFeature returns false for progression_suggestions when free', async () => {
		expect(await canAccessFeature(PremiumFeature.progression_suggestions)).toBe(false);
	});

	it('canAccessFeature returns false for volume_trends when free', async () => {
		expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(false);
	});

	// ── canAccessFeature — premium user ──

	it('canAccessFeature returns true for full_charts when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);
	});

	it('canAccessFeature returns true for extended_history when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.extended_history)).toBe(true);
	});

	it('canAccessFeature returns true for progression_suggestions when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.progression_suggestions)).toBe(true);
	});

	it('canAccessFeature returns true for volume_trends when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(true);
	});

	// ── PremiumFeature enum ──

	it('exports all expected PremiumFeature values', () => {
		expect(PremiumFeature.full_charts).toBe('full_charts');
		expect(PremiumFeature.extended_history).toBe('extended_history');
		expect(PremiumFeature.progression_suggestions).toBe('progression_suggestions');
		expect(PremiumFeature.volume_trends).toBe('volume_trends');
	});
});
