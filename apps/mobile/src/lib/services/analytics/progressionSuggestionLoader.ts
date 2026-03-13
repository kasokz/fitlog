/**
 * Progression Suggestion Loader — orchestrates parallel progression suggestions.
 *
 * Loads progression suggestions for multiple exercises in parallel,
 * with per-exercise error isolation. Mirrors the `[PR]` structured logging
 * pattern from sessionPRDetector.
 *
 * Never throws — returns an empty Map on top-level failure.
 *
 * @module
 */

import type { ProgressionSuggestion } from '../../types/analytics.js';
import type { UUID } from '../../types/common.js';
import { getProgressionSuggestion } from './progressionAdvisor.js';

/**
 * Load progression suggestions for a list of exercises in parallel.
 *
 * For each exercise:
 * 1. Call `getProgressionSuggestion()` from the progression advisor
 * 2. On success with a result, add to the output Map
 * 3. On null result (insufficient data, bodyweight, etc.), skip
 * 4. On error, log and skip — don't block other exercises
 *
 * @param exerciseIds - Exercise UUIDs to check for progression suggestions
 * @returns Map of exerciseId → ProgressionSuggestion (only qualifying exercises)
 */
export async function loadProgressionSuggestions(
	exerciseIds: UUID[]
): Promise<Map<UUID, ProgressionSuggestion>> {
	const startTime = performance.now();

	try {
		console.log('[Progression] Loading suggestions', {
			exerciseCount: exerciseIds.length
		});

		const results = await Promise.all(
			exerciseIds.map(async (exerciseId) => {
				try {
					const suggestion = await getProgressionSuggestion(exerciseId);
					return suggestion ? { exerciseId, suggestion } : null;
				} catch (error) {
					console.warn('[Progression] Exercise suggestion failed', {
						exerciseId,
						error: error instanceof Error ? error.message : String(error)
					});
					return null;
				}
			})
		);

		const suggestionMap = new Map<UUID, ProgressionSuggestion>();
		for (const result of results) {
			if (result !== null) {
				suggestionMap.set(result.exerciseId, result.suggestion);
			}
		}

		const durationMs = Math.round(performance.now() - startTime);
		console.log('[Progression] Suggestions loaded', {
			exerciseCount: exerciseIds.length,
			suggestionCount: suggestionMap.size,
			durationMs
		});

		return suggestionMap;
	} catch (error) {
		const durationMs = Math.round(performance.now() - startTime);
		console.error('[Progression] Loading failed', {
			error: error instanceof Error ? error.message : String(error),
			durationMs
		});
		return new Map();
	}
}
