/**
 * Template Service — creates fully structured programs from template definitions.
 *
 * Phase 1 (resolve): Resolves all exercise names to IDs via ExerciseRepository.getByName().
 * Fails fast if ANY name is unresolved — no partial creation.
 *
 * Phase 2 (create): Creates program → training days → exercise assignments → mesocycle
 * using ProgramRepository methods.
 *
 * @module
 */

import type { ProgramTemplate } from '../../data/templates/types.js';
import type {
	Mesocycle,
	Program,
	TrainingDayWithAssignments
} from '../../types/program.js';
import { ExerciseRepository } from '../repositories/exercise.js';
import { ProgramRepository } from '../repositories/program.js';

// ── Result type ──

export interface TemplateCreationResult {
	program: Program;
	trainingDays: TrainingDayWithAssignments[];
	mesocycle: Mesocycle;
}

// ── Service ──

/**
 * Create a fully structured program from a template definition.
 *
 * 1. Resolves all exercise names to IDs (fail-fast on any missing)
 * 2. Creates program with name/description
 * 3. Creates training days with sort_order
 * 4. Creates exercise assignments per day
 * 5. Creates mesocycle with template defaults
 *
 * @param template - The program template to instantiate
 * @returns The created program, training days with assignments, and mesocycle
 * @throws Error if any exercise name cannot be resolved
 */
export async function createProgramFromTemplate(template: ProgramTemplate): Promise<TemplateCreationResult> {
	console.log(`[TemplateService] Starting program creation from template: ${template.id} (${template.name})`);

	// ── Phase 1: Resolve exercise names to IDs ──

	// Collect unique exercise names across all days
	const uniqueNames = new Set<string>();
	for (const day of template.days) {
		for (const exercise of day.exercises) {
			uniqueNames.add(exercise.name);
		}
	}

	console.log(`[TemplateService] Resolving ${uniqueNames.size} unique exercise names`);

	const nameToId = new Map<string, string>();
	const missingNames: string[] = [];

	for (const name of uniqueNames) {
		const exercise = await ExerciseRepository.getByName(name);
		if (exercise) {
			nameToId.set(name, exercise.id);
		} else {
			missingNames.push(name);
		}
	}

	if (missingNames.length > 0) {
		const errorMsg = `[TemplateService] Failed to resolve exercise names: ${missingNames.join(', ')}`;
		console.log(errorMsg);
		throw new Error(errorMsg);
	}

	console.log(`[TemplateService] All exercise names resolved successfully`);

	// ── Phase 2: Create program structure ──

	// 2a. Create program
	const program = await ProgramRepository.createProgram({
		name: template.name,
		description: template.description
	});

	console.log(`[TemplateService] Program created: ${program.id} (${program.name})`);

	// 2b. Create training days and exercise assignments
	const trainingDays: TrainingDayWithAssignments[] = [];

	for (let dayIndex = 0; dayIndex < template.days.length; dayIndex++) {
		const templateDay = template.days[dayIndex];

		const trainingDay = await ProgramRepository.addTrainingDay(program.id, {
			name: templateDay.name,
			sort_order: dayIndex
		});

		console.log(`[TemplateService] Training day created: ${trainingDay.name} (sort_order: ${dayIndex})`);

		// Create exercise assignments for this day
		const assignments = [];
		for (let exIndex = 0; exIndex < templateDay.exercises.length; exIndex++) {
			const templateExercise = templateDay.exercises[exIndex];
			const exerciseId = nameToId.get(templateExercise.name)!;

			const assignment = await ProgramRepository.addExerciseAssignment(trainingDay.id, {
				exercise_id: exerciseId,
				sort_order: exIndex,
				target_sets: templateExercise.targetSets,
				min_reps: templateExercise.minReps,
				max_reps: templateExercise.maxReps
			});

			assignments.push(assignment);
		}

		console.log(`[TemplateService] ${assignments.length} exercise assignments added to ${trainingDay.name}`);

		trainingDays.push({
			...trainingDay,
			assignments
		});
	}

	// 2c. Create mesocycle
	const mesocycle = await ProgramRepository.createMesocycle(program.id, {
		weeks_count: template.mesocycleDefaults.weeksCount,
		deload_week_number: template.mesocycleDefaults.deloadWeekNumber
	});

	console.log(`[TemplateService] Mesocycle created: ${mesocycle.weeks_count} weeks, deload week ${mesocycle.deload_week_number}`);
	console.log(`[TemplateService] Program creation complete: ${program.id}`);

	return {
		program,
		trainingDays,
		mesocycle
	};
}
