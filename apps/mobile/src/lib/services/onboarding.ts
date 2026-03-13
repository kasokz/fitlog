/**
 * Onboarding Service — manages onboarding completion state via @capacitor/preferences.
 *
 * Stores a simple boolean flag to track whether the user has completed onboarding.
 * Uses Capacitor Preferences for persistence across app restarts.
 *
 * @module
 */

import { Preferences } from '@capacitor/preferences';

const ONBOARDING_KEY = 'onboarding_completed';

/**
 * Check if the user has completed onboarding.
 * Returns true if the onboarding flag is set (non-null), false otherwise.
 */
export async function isOnboardingCompleted(): Promise<boolean> {
	const { value } = await Preferences.get({ key: ONBOARDING_KEY });
	const completed = value !== null;
	console.log(`[Onboarding] isOnboardingCompleted: ${completed}`);
	return completed;
}

/**
 * Mark onboarding as completed by setting the preference flag.
 */
export async function completeOnboarding(): Promise<void> {
	await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
	console.log('[Onboarding] Onboarding marked as completed');
}

/**
 * Reset onboarding state by removing the preference flag.
 * After calling this, isOnboardingCompleted() will return false.
 */
export async function resetOnboarding(): Promise<void> {
	await Preferences.remove({ key: ONBOARDING_KEY });
	console.log('[Onboarding] Onboarding state reset');
}
