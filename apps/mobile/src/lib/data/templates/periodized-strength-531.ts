/**
 * Periodized Strength 531 program template — 4 days per week, 7 weeks.
 *
 * Inspired by 5/3/1 periodization: four main compound lifts each get a dedicated day,
 * with progressive rep scheme across weeks (Week 1: 5×5 heavy, Week 2: 3×5 heavier,
 * Week 3: 1×5 heaviest). Deload week 7. Each day has 1 main lift + 3-4 accessories.
 * All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const PERIODIZED_STRENGTH_531_TEMPLATE: ProgramTemplate = {
	id: 'periodized-strength-531',
	name: 'Periodized Strength 531',
	description:
		'4-day strength program with weekly periodization: rotate through 5s, 3s, and singles waves on the four main lifts. Each day pairs a heavy compound with targeted accessories. 7 weeks with deload.',
	premium: true,
	mesocycleDefaults: {
		weeksCount: 7,
		deloadWeekNumber: 7
	},
	days: [
		{
			name: 'Squat Day',
			exercises: [
				{ name: 'Squat', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Leg Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Hanging Leg Raise', targetSets: 3, minReps: 10, maxReps: 15 }
			]
		},
		{
			name: 'Bench Day',
			exercises: [
				{ name: 'Bench Press', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Incline Bench Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Dumbbell Fly', targetSets: 3, minReps: 10, maxReps: 12 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 10, maxReps: 12 }
			]
		},
		{
			name: 'Deadlift Day',
			exercises: [
				{ name: 'Deadlift', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Romanian Deadlift', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Barbell Row', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Face Pull', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Press Day',
			exercises: [
				{ name: 'Overhead Press', targetSets: 5, minReps: 3, maxReps: 5 },
				{ name: 'Close-Grip Bench Press', targetSets: 3, minReps: 8, maxReps: 10 },
				{ name: 'Lateral Raise', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 8, maxReps: 12 }
			]
		}
	]
};
