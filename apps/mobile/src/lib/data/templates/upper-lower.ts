/**
 * Upper / Lower program template — 4 days per week.
 *
 * Alternating upper and lower body days: Upper A, Lower A, Upper B, Lower B.
 * All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const UPPER_LOWER_TEMPLATE: ProgramTemplate = {
	id: 'upper-lower',
	name: 'Upper / Lower',
	description:
		'4-day split alternating upper and lower body sessions. Balanced approach suitable for beginners to intermediate lifters.',
	mesocycleDefaults: {
		weeksCount: 6,
		deloadWeekNumber: 6
	},
	days: [
		{
			name: 'Upper A',
			exercises: [
				{ name: 'Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Barbell Row', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Overhead Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lat Pulldown', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Lower A',
			exercises: [
				{ name: 'Squat', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Press', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Standing Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Upper B',
			exercises: [
				{ name: 'Incline Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Dumbbell Row', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Arnold Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Cable Row', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Hammer Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Skull Crusher', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Lower B',
			exercises: [
				{ name: 'Deadlift', targetSets: 3, minReps: 5, maxReps: 7 },
				{ name: 'Front Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Bulgarian Split Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Extension', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Hip Thrust', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Seated Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		}
	]
};
