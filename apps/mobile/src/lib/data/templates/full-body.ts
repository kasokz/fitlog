/**
 * Full Body program template — 3 days per week.
 *
 * Three distinct full-body sessions (A/B/C) covering all major movement patterns.
 * All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const FULL_BODY_TEMPLATE: ProgramTemplate = {
	id: 'full-body',
	name: 'Full Body',
	description:
		'3-day full-body program hitting all major muscle groups each session. Ideal for beginners or those with limited training days.',
	mesocycleDefaults: {
		weeksCount: 8,
		deloadWeekNumber: 8
	},
	days: [
		{
			name: 'Full Body A',
			exercises: [
				{ name: 'Squat', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Barbell Row', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Overhead Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Hanging Leg Raise', targetSets: 3, minReps: 10, maxReps: 15 }
			]
		},
		{
			name: 'Full Body B',
			exercises: [
				{ name: 'Deadlift', targetSets: 3, minReps: 5, maxReps: 7 },
				{ name: 'Incline Bench Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Pull-Up', targetSets: 3, minReps: 6, maxReps: 10 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lateral Raise', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Standing Calf Raise', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Full Body C',
			exercises: [
				{ name: 'Front Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Row', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Arnold Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Hip Thrust', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Face Pull', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Plank', targetSets: 3, minReps: 30, maxReps: 60 }
			]
		}
	]
};
