/**
 * Periodized Hypertrophy program template — 5 days per week, 8 weeks.
 *
 * Hypertrophy-focused with higher rep ranges (8-15), more isolation work, and moderate
 * weights. Push/Pull/Legs/Upper/Lower style split for maximum muscle growth stimulus.
 * Deload week 8. All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const PERIODIZED_HYPERTROPHY_TEMPLATE: ProgramTemplate = {
	id: 'periodized-hypertrophy',
	name: 'Periodized Hypertrophy',
	description:
		'5-day hypertrophy program with Push/Pull/Legs/Upper/Lower split. Higher rep ranges and more isolation work to maximize muscle growth. Moderate weights with controlled tempo. 8 weeks with deload.',
	premium: true,
	mesocycleDefaults: {
		weeksCount: 8,
		deloadWeekNumber: 8
	},
	days: [
		{
			name: 'Push',
			exercises: [
				{ name: 'Bench Press', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Incline Bench Press', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Dumbbell Fly', targetSets: 3, minReps: 10, maxReps: 15 },
				{ name: 'Overhead Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lateral Raise', targetSets: 4, minReps: 12, maxReps: 15 },
				{ name: 'Overhead Tricep Extension', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Pull',
			exercises: [
				{ name: 'Barbell Row', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Lat Pulldown', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Cable Row', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Face Pull', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Dumbbell Curl', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Hammer Curl', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Legs',
			exercises: [
				{ name: 'Squat', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Leg Press', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 12 },
				{ name: 'Leg Extension', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Standing Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Upper',
			exercises: [
				{ name: 'Arnold Press', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Row', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Cable Crossover', targetSets: 3, minReps: 10, maxReps: 15 },
				{ name: 'Reverse Fly', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Cable Curl', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Skull Crusher', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		},
		{
			name: 'Lower',
			exercises: [
				{ name: 'Front Squat', targetSets: 4, minReps: 8, maxReps: 10 },
				{ name: 'Hip Thrust', targetSets: 4, minReps: 8, maxReps: 12 },
				{ name: 'Bulgarian Split Squat', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Good Morning', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Seated Calf Raise', targetSets: 4, minReps: 12, maxReps: 15 },
				{ name: 'Hanging Leg Raise', targetSets: 3, minReps: 10, maxReps: 15 }
			]
		}
	]
};
