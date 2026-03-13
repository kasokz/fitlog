/**
 * Curated exercise seed data — ~60 exercises covering all muscle groups and equipment types.
 *
 * Seeded exercises have is_custom = false to distinguish them from user-created exercises.
 * Exercise names are in English (used as-is in fitness contexts internationally).
 *
 * @module
 */

import { CapgoCapacitorFastSql } from '@capgo/capacitor-fast-sql';

import type { Equipment, MuscleGroup } from '../../types/exercise.js';
import { uuidv5 } from '../../utils/uuid-v5.js';

// ── Seed exercise shape ──

interface SeedExercise {
	name: string;
	description: string;
	muscle_group: MuscleGroup;
	secondary_muscle_groups: MuscleGroup[];
	equipment: Equipment;
	is_compound: boolean;
}

// ── Seed data ──

export const SEED_EXERCISES: SeedExercise[] = [
	// ── Chest (~6) ──
	{
		name: 'Bench Press',
		description: 'Lie flat on a bench, lower the bar to your chest and press up.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['triceps', 'shoulders'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Incline Bench Press',
		description: 'Press the bar upward from an inclined bench to target the upper chest.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['triceps', 'shoulders'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Dumbbell Fly',
		description: 'Lie flat and arc the dumbbells outward, then squeeze them back together.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['shoulders'],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Cable Crossover',
		description: 'Pull cable handles from high or low position across the body.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['shoulders'],
		equipment: 'cable',
		is_compound: false
	},
	{
		name: 'Push-Up',
		description: 'Lower your body to the floor and push back up with arms extended.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['triceps', 'shoulders'],
		equipment: 'bodyweight',
		is_compound: true
	},
	{
		name: 'Chest Dip',
		description: 'Lean forward on parallel bars and dip down to stretch the chest.',
		muscle_group: 'chest',
		secondary_muscle_groups: ['triceps', 'shoulders'],
		equipment: 'bodyweight',
		is_compound: true
	},

	// ── Back (~8) ──
	{
		name: 'Deadlift',
		description: 'Hinge at the hips to lift the bar from the floor to lockout.',
		muscle_group: 'back',
		secondary_muscle_groups: ['hamstrings', 'glutes', 'forearms'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Barbell Row',
		description: 'Bend over and row the bar into your lower chest.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps', 'forearms'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Pull-Up',
		description: 'Hang from a bar and pull yourself up until chin clears the bar.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps', 'forearms'],
		equipment: 'bodyweight',
		is_compound: true
	},
	{
		name: 'Lat Pulldown',
		description: 'Pull a wide bar down to your upper chest while seated.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps'],
		equipment: 'cable',
		is_compound: true
	},
	{
		name: 'Cable Row',
		description: 'Sit and pull a cable handle toward your torso with a straight back.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps', 'forearms'],
		equipment: 'cable',
		is_compound: true
	},
	{
		name: 'Dumbbell Row',
		description: 'Brace on a bench and row a dumbbell up to your hip.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps', 'forearms'],
		equipment: 'dumbbell',
		is_compound: true
	},
	{
		name: 'T-Bar Row',
		description: 'Straddle a landmine bar and row with both hands.',
		muscle_group: 'back',
		secondary_muscle_groups: ['biceps', 'forearms'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Face Pull',
		description: 'Pull a rope attachment toward your face with elbows high.',
		muscle_group: 'back',
		secondary_muscle_groups: ['shoulders'],
		equipment: 'cable',
		is_compound: false
	},

	// ── Shoulders (~6) ──
	{
		name: 'Overhead Press',
		description: 'Press the bar from shoulder level overhead to full lockout.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['triceps'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Lateral Raise',
		description: 'Raise dumbbells out to the sides until arms are parallel to the floor.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: [],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Front Raise',
		description: 'Raise dumbbells in front of you to shoulder height.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: [],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Reverse Fly',
		description: 'Bend forward and raise dumbbells out to the sides to target rear delts.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['back'],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Arnold Press',
		description: 'Rotate dumbbells from palms-in to palms-out as you press overhead.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['triceps'],
		equipment: 'dumbbell',
		is_compound: true
	},
	{
		name: 'Upright Row',
		description: 'Pull a barbell straight up along your body to chin height.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['biceps'],
		equipment: 'barbell',
		is_compound: true
	},

	// ── Biceps (~4) ──
	{
		name: 'Barbell Curl',
		description: 'Curl a barbell from hip level to shoulder height with control.',
		muscle_group: 'biceps',
		secondary_muscle_groups: ['forearms'],
		equipment: 'barbell',
		is_compound: false
	},
	{
		name: 'Dumbbell Curl',
		description: 'Curl dumbbells alternating or together with supinated grip.',
		muscle_group: 'biceps',
		secondary_muscle_groups: ['forearms'],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Hammer Curl',
		description: 'Curl dumbbells with a neutral (palms-facing) grip.',
		muscle_group: 'biceps',
		secondary_muscle_groups: ['forearms'],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Cable Curl',
		description: 'Curl a cable bar or rope from low pulley to shoulder height.',
		muscle_group: 'biceps',
		secondary_muscle_groups: ['forearms'],
		equipment: 'cable',
		is_compound: false
	},

	// ── Triceps (~4) ──
	{
		name: 'Tricep Pushdown',
		description: 'Push a cable bar or rope down from chest height to full arm extension.',
		muscle_group: 'triceps',
		secondary_muscle_groups: [],
		equipment: 'cable',
		is_compound: false
	},
	{
		name: 'Overhead Tricep Extension',
		description: 'Extend a dumbbell or cable overhead to work the long head of the triceps.',
		muscle_group: 'triceps',
		secondary_muscle_groups: [],
		equipment: 'dumbbell',
		is_compound: false
	},
	{
		name: 'Skull Crusher',
		description: 'Lie on a bench and lower a bar toward your forehead, then extend.',
		muscle_group: 'triceps',
		secondary_muscle_groups: [],
		equipment: 'barbell',
		is_compound: false
	},
	{
		name: 'Close-Grip Bench Press',
		description: 'Bench press with a narrow grip to emphasize the triceps.',
		muscle_group: 'triceps',
		secondary_muscle_groups: ['chest', 'shoulders'],
		equipment: 'barbell',
		is_compound: true
	},

	// ── Quadriceps (~5) ──
	{
		name: 'Squat',
		description: 'Place the bar on your upper back and squat down to parallel or below.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: ['glutes', 'hamstrings'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Front Squat',
		description: 'Hold the bar on the front of your shoulders and squat upright.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: ['glutes', 'abs'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Leg Press',
		description: 'Push the sled away with your feet on a leg press machine.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: ['glutes'],
		equipment: 'machine',
		is_compound: true
	},
	{
		name: 'Leg Extension',
		description: 'Sit on the machine and extend your legs to target the quads.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: [],
		equipment: 'machine',
		is_compound: false
	},
	{
		name: 'Bulgarian Split Squat',
		description: 'Lunge with your rear foot elevated on a bench for single-leg work.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: ['glutes', 'hamstrings'],
		equipment: 'dumbbell',
		is_compound: true
	},

	// ── Hamstrings (~4) ──
	{
		name: 'Romanian Deadlift',
		description: 'Hinge at the hips with a slight knee bend to stretch the hamstrings.',
		muscle_group: 'hamstrings',
		secondary_muscle_groups: ['glutes', 'back'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Leg Curl',
		description: 'Lie prone on the machine and curl your heels toward your glutes.',
		muscle_group: 'hamstrings',
		secondary_muscle_groups: [],
		equipment: 'machine',
		is_compound: false
	},
	{
		name: 'Nordic Curl',
		description: 'Kneel with ankles anchored and slowly lower your torso forward.',
		muscle_group: 'hamstrings',
		secondary_muscle_groups: [],
		equipment: 'bodyweight',
		is_compound: false
	},
	{
		name: 'Good Morning',
		description: 'With a bar on your back, hinge forward at the hips and return upright.',
		muscle_group: 'hamstrings',
		secondary_muscle_groups: ['glutes', 'back'],
		equipment: 'barbell',
		is_compound: true
	},

	// ── Glutes (~4) ──
	{
		name: 'Hip Thrust',
		description: 'Lean your upper back on a bench and drive your hips up with a bar.',
		muscle_group: 'glutes',
		secondary_muscle_groups: ['hamstrings'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Glute Bridge',
		description: 'Lie on your back and drive your hips up, squeezing your glutes.',
		muscle_group: 'glutes',
		secondary_muscle_groups: ['hamstrings'],
		equipment: 'bodyweight',
		is_compound: false
	},
	{
		name: 'Cable Kickback',
		description: 'Attach an ankle cuff to a low cable and kick your leg back.',
		muscle_group: 'glutes',
		secondary_muscle_groups: ['hamstrings'],
		equipment: 'cable',
		is_compound: false
	},
	{
		name: 'Step-Up',
		description: 'Step onto a box or bench one leg at a time holding dumbbells.',
		muscle_group: 'glutes',
		secondary_muscle_groups: ['quadriceps'],
		equipment: 'dumbbell',
		is_compound: true
	},

	// ── Calves (~2) ──
	{
		name: 'Standing Calf Raise',
		description: 'Rise onto your toes under load, then lower your heels below the platform.',
		muscle_group: 'calves',
		secondary_muscle_groups: [],
		equipment: 'machine',
		is_compound: false
	},
	{
		name: 'Seated Calf Raise',
		description: 'Sit with knees under a pad and press up onto your toes.',
		muscle_group: 'calves',
		secondary_muscle_groups: [],
		equipment: 'machine',
		is_compound: false
	},

	// ── Abs (~4) ──
	{
		name: 'Hanging Leg Raise',
		description: 'Hang from a bar and raise your legs to hip height or above.',
		muscle_group: 'abs',
		secondary_muscle_groups: [],
		equipment: 'bodyweight',
		is_compound: false
	},
	{
		name: 'Cable Crunch',
		description: 'Kneel at a cable station and crunch downward against resistance.',
		muscle_group: 'abs',
		secondary_muscle_groups: [],
		equipment: 'cable',
		is_compound: false
	},
	{
		name: 'Plank',
		description: 'Hold a push-up position on your forearms, keeping your body rigid.',
		muscle_group: 'abs',
		secondary_muscle_groups: ['shoulders'],
		equipment: 'bodyweight',
		is_compound: false
	},
	{
		name: 'Ab Wheel Rollout',
		description: 'Kneel and roll an ab wheel forward, then contract back to start.',
		muscle_group: 'abs',
		secondary_muscle_groups: ['shoulders'],
		equipment: 'other',
		is_compound: false
	},

	// ── Forearms (~2) ──
	{
		name: 'Wrist Curl',
		description: 'Rest your forearms on a bench and curl a barbell upward with your wrists.',
		muscle_group: 'forearms',
		secondary_muscle_groups: [],
		equipment: 'barbell',
		is_compound: false
	},
	{
		name: 'Reverse Wrist Curl',
		description: 'Rest your forearms on a bench and extend a barbell upward with your wrists.',
		muscle_group: 'forearms',
		secondary_muscle_groups: [],
		equipment: 'barbell',
		is_compound: false
	},

	// ── Full Body (~2) ──
	{
		name: 'Clean and Press',
		description: 'Clean a barbell to your shoulders, then press it overhead in one sequence.',
		muscle_group: 'full_body',
		secondary_muscle_groups: ['shoulders', 'back', 'quadriceps', 'glutes'],
		equipment: 'barbell',
		is_compound: true
	},
	{
		name: 'Thruster',
		description: 'Front squat into an overhead press in one continuous movement.',
		muscle_group: 'full_body',
		secondary_muscle_groups: ['quadriceps', 'shoulders', 'glutes'],
		equipment: 'barbell',
		is_compound: true
	},

	// ── Additional coverage for kettlebell and band equipment ──
	{
		name: 'Kettlebell Swing',
		description: 'Hinge at the hips and swing the kettlebell to chest height.',
		muscle_group: 'full_body',
		secondary_muscle_groups: ['glutes', 'hamstrings', 'shoulders'],
		equipment: 'kettlebell',
		is_compound: true
	},
	{
		name: 'Kettlebell Goblet Squat',
		description: 'Hold a kettlebell at your chest and squat with an upright torso.',
		muscle_group: 'quadriceps',
		secondary_muscle_groups: ['glutes'],
		equipment: 'kettlebell',
		is_compound: true
	},
	{
		name: 'Band Pull-Apart',
		description: 'Hold a band at arm length and pull it apart to target rear delts.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['back'],
		equipment: 'band',
		is_compound: false
	},
	{
		name: 'Band Face Pull',
		description: 'Pull a resistance band toward your face with elbows high.',
		muscle_group: 'shoulders',
		secondary_muscle_groups: ['back'],
		equipment: 'band',
		is_compound: false
	}
];

// ── Seeding function ──

/**
 * Seed the exercises table with curated data.
 * Uses a transaction for atomicity — all exercises are inserted or none.
 * Each exercise is inserted individually via execute() within the transaction.
 *
 * @param database - Database connection name from getDb()
 */
export async function seedExercises(database: string): Promise<void> {
	const count = SEED_EXERCISES.length;
	console.log(`[DB] Seeding ${count} exercises`);

	await CapgoCapacitorFastSql.beginTransaction({ database });

	try {
		const now = new Date().toISOString();

		for (const exercise of SEED_EXERCISES) {
			const id = await uuidv5(exercise.name);
			const secondaryJson = exercise.secondary_muscle_groups.length
				? JSON.stringify(exercise.secondary_muscle_groups)
				: null;

			await CapgoCapacitorFastSql.execute({
				database,
				statement: `INSERT INTO exercises (id, name, description, muscle_group, secondary_muscle_groups, equipment, is_custom, is_compound, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				params: [
					id,
					exercise.name,
					exercise.description,
					exercise.muscle_group,
					secondaryJson,
					exercise.equipment,
					0, // is_custom = false (seeded, not user-created)
					exercise.is_compound ? 1 : 0,
					now,
					now
				]
			});
		}

		await CapgoCapacitorFastSql.commitTransaction({ database });
		console.log(`[DB] Seeding complete — ${count} exercises inserted`);
	} catch (error) {
		await CapgoCapacitorFastSql.rollbackTransaction({ database }).catch(() => {
			// Rollback may fail if transaction was already aborted — swallow
		});
		const msg = error instanceof Error ? error.message : String(error);
		throw new Error(`[DB] Seed failed, transaction rolled back: ${msg}`);
	}
}
