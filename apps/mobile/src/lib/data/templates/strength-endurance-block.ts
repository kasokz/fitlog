/**
 * Strength-Endurance Block program template — 3 days per week, 6 weeks.
 *
 * Full body with daily undulating periodization: Day 1 heavy (3-5 reps),
 * Day 2 moderate (6-10 reps), Day 3 light/volume (12-15 reps).
 * Deload week 6. All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const STRENGTH_ENDURANCE_BLOCK_TEMPLATE: ProgramTemplate = {
	id: 'strength-endurance-block',
	name: 'Strength-Endurance Block',
	description:
		'3-day full body program with daily undulating periodization: heavy, moderate, and high-rep sessions each week. Builds both strength and muscular endurance. 6 weeks with deload.',
	premium: true,
	mesocycleDefaults: {
		weeksCount: 6,
		deloadWeekNumber: 6
	},
	days: [
		{
			name: 'Heavy Day',
			exercises: [
				{ name: 'Squat', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Bench Press', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Barbell Row', targetSets: 4, minReps: 3, maxReps: 5 },
				{ name: 'Overhead Press', targetSets: 4, minReps: 3, maxReps: 5 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 6, maxReps: 8 }
			]
		},
		{
			name: 'Moderate Day',
			exercises: [
				{ name: 'Deadlift', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Incline Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				{ name: 'Pull-Up', targetSets: 3, minReps: 6, maxReps: 10 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Arnold Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Skull Crusher', targetSets: 3, minReps: 8, maxReps: 10 }
			]
		},
		{
			name: 'Volume Day',
			exercises: [
				{ name: 'Front Squat', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Dumbbell Row', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Hip Thrust', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Lateral Raise', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Dumbbell Curl', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Hanging Leg Raise', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		}
	]
};
