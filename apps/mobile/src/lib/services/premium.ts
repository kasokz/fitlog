/**
 * Premium Service — manages premium subscription state via @capacitor/preferences.
 *
 * Controls access to premium-only features (full charts, extended history,
 * progression suggestions, volume trends). Free users get basic analytics;
 * premium users see everything.
 *
 * Uses Capacitor Preferences for persistence across app restarts.
 * Defaults to free (non-premium) when no preference is set — safe degradation.
 *
 * @module
 */

import { Preferences } from '@capacitor/preferences';

const PREMIUM_KEY = 'premium_status';

/**
 * Features gated behind premium access.
 */
export enum PremiumFeature {
	full_charts = 'full_charts',
	extended_history = 'extended_history',
	progression_suggestions = 'progression_suggestions',
	volume_trends = 'volume_trends'
}

/**
 * Check if the current user has premium access.
 * Returns false when no preference is set (default = free user).
 * On Preferences read failure, falls back to false (safe degradation).
 */
export async function isPremiumUser(): Promise<boolean> {
	try {
		const { value } = await Preferences.get({ key: PREMIUM_KEY });
		const premium = value !== null;
		console.log(`[Premium] isPremiumUser: ${premium}`);
		return premium;
	} catch (error) {
		console.warn('[Premium] Failed to read premium status, defaulting to free', error);
		return false;
	}
}

/**
 * Set or remove premium status.
 * - `active: true` — grants premium access by setting the preference key.
 * - `active: false` — revokes premium access by removing the preference key.
 */
export async function setPremiumStatus(active: boolean): Promise<void> {
	if (active) {
		await Preferences.set({ key: PREMIUM_KEY, value: 'true' });
		console.log('[Premium] Premium status set to active');
	} else {
		await Preferences.remove({ key: PREMIUM_KEY });
		console.log('[Premium] Premium status removed (free user)');
	}
}

/**
 * Check if the user can access a specific premium feature.
 * Delegates to `isPremiumUser()` — all premium features share the same gate.
 * Logs the feature name and access result for diagnostics.
 */
export async function canAccessFeature(feature: PremiumFeature): Promise<boolean> {
	const premium = await isPremiumUser();
	console.log(`[Premium] canAccessFeature(${feature}): ${premium}`);
	return premium;
}
