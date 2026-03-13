/**
 * Linear Progression LP program template — 4 days per week, 6 weeks.
 *
 * Upper/lower split with heavy main lifts (3-5 reps) followed by volume backoff sets
 * (8-12 reps). Designed for progressive overload through linear weight increases.
 * Deload week 6. All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const LINEAR_PROGRESSION_LP_TEMPLATE: ProgramTemplate = {
	id: 'linear-progression-lp',
	name: 'Linear Progression LP',
	description:
		'4-day upper/lower split built around heavy main lifts with volume backoff sets. Focus on linear weight increases each session. Suitable for early intermediates seeking structured progression. 6 weeks with deload.',
	premium: true,
	mesocycleDefaults: {
		weeksCount: 6,
		deloadWeekNumber: 6
	},
	days: [
		{
			name: 'Upper Heavy',
			exercises: [
				{ name: 'Bench Press', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Barbell Row', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Overhead Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lat Pulldown', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Lower Heavy',
			exercises: [
				{ name: 'Squat', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Press', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Standing Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Upper Volume',
			exercises: [
				{ name: 'Incline Bench Press', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Cable Row', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Arnold Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Row', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Hammer Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Skull Crusher', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Lower Volume',
			exercises: [
				{ name: 'Deadlift', targetSets: 4, minReps: 3, maxReps: 5 },
				{ name: 'Front Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Bulgarian Split Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Extension', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Hip Thrust', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Seated Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		}
	]
};
