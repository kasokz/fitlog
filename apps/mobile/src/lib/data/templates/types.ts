/**
 * Program template types — define the structure of starter program templates.
 *
 * Templates are pure data (no DB access). Exercise names reference SEED_EXERCISES
 * by exact name match, resolved at creation time via ExerciseRepository.getByName().
 *
 * @module
 */

// ── Template exercise definition ──

export interface TemplateExerciseDefinition {
	/** Exact name matching a SEED_EXERCISES entry */
	name: string;
	/** Number of working sets per session */
	targetSets: number;
	/** Minimum reps per set */
	minReps: number;
	/** Maximum reps per set */
	maxReps: number;
}

// ── Template day definition ──

export interface TemplateDayDefinition {
	/** Display name for the training day (e.g. "Push A", "Upper A") */
	name: string;
	/** Exercises assigned to this day, in order */
	exercises: TemplateExerciseDefinition[];
}

// ── Mesocycle defaults ──

export interface MesocycleDefaults {
	/** Number of weeks in the mesocycle */
	weeksCount: number;
	/** Which week is the deload week (0 = no deload) */
	deloadWeekNumber: number;
}

// ── Program template ──

export interface ProgramTemplate {
	/** Unique identifier for the template */
	id: string;
	/** Display name (e.g. "Push / Pull / Legs") */
	name: string;
	/** Short description of the program */
	description: string;
	/** Training days in order */
	days: TemplateDayDefinition[];
	/** Default mesocycle configuration */
	mesocycleDefaults: MesocycleDefaults;
}
