/**
 * Session PR Detection — orchestrates PR detection at workout completion.
 *
 * Bridges the pure `detectPRs()` function with the workout completion flow.
 * Takes a session ID and exercise groups (already available in the workout page),
 * queries historical sets per exercise (excluding current session),
 * runs detection in parallel, and returns enriched results.
 *
 * Error handling: per-exercise errors are caught individually so one bad exercise
 * doesn't block detection for others. Top-level try/catch ensures PR detection
 * failures never block workout completion.
 *
 * @module
 */

import type { PR } from '../../types/analytics.js';
import type { UUID } from '../../types/common.js';
import type { WorkoutSet } from '../../types/workout.js';
import { AnalyticsRepository } from '../../db/repositories/analytics.js';
import { detectPRs } from './prDetector.js';

// ── Types ──

/** A PR enriched with the exercise name for display in celebration UI */
export interface EnrichedPR extends PR {
	exerciseName: string;
}

/** Result of session-level PR detection */
export interface SessionPRResult {
	prs: EnrichedPR[];
	exerciseCount: number;
	detectionTimeMs: number;
}

/** Input exercise group — maps to the workout page's exercise groups */
export interface ExerciseGroup {
	exerciseId: UUID;
	exerciseName: string;
	sets: WorkoutSet[];
}

// ── Empty result constant ──

const EMPTY_RESULT: SessionPRResult = {
	prs: [],
	exerciseCount: 0,
	detectionTimeMs: 0
};

// ── Orchestrator ──

/**
 * Detect PRs for all exercises in a completed session.
 *
 * For each exercise group:
 * 1. Query full history via AnalyticsRepository.getExerciseSetsHistory()
 * 2. Filter out sets belonging to the current session (avoid self-comparison)
 * 3. Run detectPRs() with the session's sets as "new" and filtered history
 * 4. Enrich each detected PR with the exercise name
 *
 * All per-exercise detections run in parallel via Promise.all().
 * Per-exercise errors are caught individually — one bad exercise doesn't abort others.
 * Top-level errors return an empty result (never throws).
 *
 * @param sessionId - The current session's ID
 * @param exerciseGroups - Exercise groups with their sets from the workout page
 * @returns Structured result with enriched PRs, exercise count, and timing
 */
export async function detectSessionPRs(
	sessionId: UUID,
	exerciseGroups: ExerciseGroup[]
): Promise<SessionPRResult> {
	const startTime = performance.now();

	try {
		if (exerciseGroups.length === 0) {
			console.log('[PR] Session PR detection', {
				sessionId,
				exerciseCount: 0,
				prCount: 0,
				durationMs: 0
			});
			return EMPTY_RESULT;
		}

		const perExerciseResults = await Promise.all(
			exerciseGroups.map(async (group) => {
				try {
					// Query full history for this exercise
					const allHistory = await AnalyticsRepository.getExerciseSetsHistory(
						group.exerciseId
					);

					// Filter out sets from the current session to avoid self-comparison
					const filteredHistory = allHistory.filter(
						(set) => set.session_id !== sessionId
					);

					// Convert ExerciseSetHistory to WorkoutSet-compatible shape for detectPRs
					const historicalSets: WorkoutSet[] = filteredHistory.map((h) => ({
						id: h.id,
						session_id: h.session_id,
						exercise_id: h.exercise_id,
						assignment_id: null,
						set_number: h.set_number,
						set_type: h.set_type as WorkoutSet['set_type'],
						weight: h.weight,
						reps: h.reps,
						rir: h.rir,
						completed: h.completed,
						rest_seconds: null,
						created_at: h.session_started_at,
						updated_at: h.session_started_at,
						deleted_at: null
					}));

					// Run pure PR detection
					const prs = detectPRs(group.exerciseId, group.sets, historicalSets);

					// Enrich with exercise name
					return prs.map(
						(pr): EnrichedPR => ({
							...pr,
							exerciseName: group.exerciseName
						})
					);
				} catch (error) {
					console.warn('[PR] Exercise detection failed', {
						sessionId,
						exerciseId: group.exerciseId,
						exerciseName: group.exerciseName,
						error: error instanceof Error ? error.message : String(error)
					});
					return [] as EnrichedPR[];
				}
			})
		);

		const prs = perExerciseResults.flat();
		const durationMs = Math.round(performance.now() - startTime);

		console.log('[PR] Session PR detection', {
			sessionId,
			exerciseCount: exerciseGroups.length,
			prCount: prs.length,
			durationMs
		});

		return {
			prs,
			exerciseCount: exerciseGroups.length,
			detectionTimeMs: durationMs
		};
	} catch (error) {
		const durationMs = Math.round(performance.now() - startTime);
		console.error('[PR] Detection failed', {
			sessionId,
			error: error instanceof Error ? error.message : String(error),
			durationMs
		});
		return EMPTY_RESULT;
	}
}
