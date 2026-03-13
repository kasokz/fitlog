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

const { isOnboardingCompleted, completeOnboarding, resetOnboarding } = await import(
	'../../services/onboarding.js'
);

// ── Tests ──

describe('onboarding preferences', () => {
	beforeEach(() => {
		mockStorage.clear();
	});

	afterEach(() => {
		mockStorage.clear();
	});

	it('returns false when no onboarding flag is set', async () => {
		const result = await isOnboardingCompleted();
		expect(result).toBe(false);
	});

	it('returns true after completeOnboarding() is called', async () => {
		await completeOnboarding();
		const result = await isOnboardingCompleted();
		expect(result).toBe(true);
	});

	it('returns false after resetOnboarding() is called', async () => {
		await completeOnboarding();
		expect(await isOnboardingCompleted()).toBe(true);

		await resetOnboarding();
		expect(await isOnboardingCompleted()).toBe(false);
	});

	it('can complete onboarding multiple times without error', async () => {
		await completeOnboarding();
		await completeOnboarding();
		expect(await isOnboardingCompleted()).toBe(true);
	});

	it('can reset onboarding when not yet completed', async () => {
		// Should not throw
		await resetOnboarding();
		expect(await isOnboardingCompleted()).toBe(false);
	});

	it('round-trips: complete → verify → reset → verify', async () => {
		expect(await isOnboardingCompleted()).toBe(false);

		await completeOnboarding();
		expect(await isOnboardingCompleted()).toBe(true);

		await resetOnboarding();
		expect(await isOnboardingCompleted()).toBe(false);

		await completeOnboarding();
		expect(await isOnboardingCompleted()).toBe(true);
	});
});
