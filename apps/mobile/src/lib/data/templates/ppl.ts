/**
 * Push / Pull / Legs program template — 6 days per week.
 *
 * Classic PPL split repeated twice: Push A, Pull A, Legs A, Push B, Pull B, Legs B.
 * All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const PPL_TEMPLATE: ProgramTemplate = {
	id: 'ppl',
	name: 'Push / Pull / Legs',
	description:
		'6-day split targeting push, pull, and leg movements twice per week. Great for intermediate to advanced lifters seeking high volume.',
	mesocycleDefaults: {
		weeksCount: 6,
		deloadWeekNumber: 6
	},
	days: [
		{
			name: 'Push A',
			exercises: [
				{ name: 'Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Overhead Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Incline Bench Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lateral Raise', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Overhead Tricep Extension', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Pull A',
			exercises: [
				{ name: 'Deadlift', targetSets: 3, minReps: 5, maxReps: 7 },
				{ name: 'Pull-Up', targetSets: 3, minReps: 6, maxReps: 10 },
				{ name: 'Barbell Row', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Face Pull', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Legs A',
			exercises: [
				{ name: 'Squat', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Press', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Standing Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Push B',
			exercises: [
				{ name: 'Overhead Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Close-Grip Bench Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Fly', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Arnold Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Skull Crusher', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Pull B',
			exercises: [
				{ name: 'Barbell Row', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Lat Pulldown', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Cable Row', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Reverse Fly', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Hammer Curl', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Legs B',
			exercises: [
				{ name: 'Front Squat', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Hip Thrust', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Bulgarian Split Squat', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Extension', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Seated Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		}
	]
};
