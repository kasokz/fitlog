/**
 * Tiered Volume Method program template — 4 days per week, 6 weeks.
 *
 * Each day follows a T1/T2/T3 tier structure: T1 heavy compound (3-5 reps, 4-5 sets),
 * T2 moderate compound (6-10 reps, 3-4 sets), T3 isolation (12-15 reps, 3 sets).
 * Deload week 6. All exercise names exactly match SEED_EXERCISES entries.
 *
 * @module
 */

import type { ProgramTemplate } from './types.js';

export const TIERED_VOLUME_METHOD_TEMPLATE: ProgramTemplate = {
	id: 'tiered-volume-method',
	name: 'Tiered Volume Method',
	description:
		'4-day program using a tiered structure per session: heavy main lift, moderate secondary compound, and high-rep isolation work. Balances strength and hypertrophy across all tiers. 6 weeks with deload.',
	premium: true,
	mesocycleDefaults: {
		weeksCount: 6,
		deloadWeekNumber: 6
	},
	days: [
		{
			name: 'Squat Tier',
			exercises: [
				// T1 — heavy
				{ name: 'Squat', targetSets: 5, minReps: 3, maxReps: 5 },
				// T2 — moderate
				{ name: 'Front Squat', targetSets: 4, minReps: 6, maxReps: 8 },
				// T3 — isolation / accessories
				{ name: 'Leg Extension', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Leg Curl', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Standing Calf Raise', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Bench Tier',
			exercises: [
				// T1 — heavy
				{ name: 'Bench Press', targetSets: 5, minReps: 3, maxReps: 5 },
				// T2 — moderate
				{ name: 'Close-Grip Bench Press', targetSets: 4, minReps: 6, maxReps: 8 },
				// T3 — isolation / accessories
				{ name: 'Dumbbell Fly', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Lateral Raise', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Tricep Pushdown', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Deadlift Tier',
			exercises: [
				// T1 — heavy
				{ name: 'Deadlift', targetSets: 4, minReps: 3, maxReps: 5 },
				// T2 — moderate
				{ name: 'Barbell Row', targetSets: 4, minReps: 6, maxReps: 8 },
				// T3 — isolation / accessories
				{ name: 'Lat Pulldown', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Face Pull', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Barbell Curl', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		},
		{
			name: 'Press Tier',
			exercises: [
				// T1 — heavy
				{ name: 'Overhead Press', targetSets: 5, minReps: 3, maxReps: 5 },
				// T2 — moderate
				{ name: 'Incline Bench Press', targetSets: 3, minReps: 6, maxReps: 10 },
				// T3 — isolation / accessories
				{ name: 'Reverse Fly', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Overhead Tricep Extension', targetSets: 3, minReps: 12, maxReps: 15 },
				{ name: 'Cable Crunch', targetSets: 3, minReps: 12, maxReps: 15 }
			]
		}
	]
};
