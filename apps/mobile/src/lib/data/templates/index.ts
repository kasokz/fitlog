/**
 * Program template registry — exports all starter program templates.
 *
 * @module
 */

export type { ProgramTemplate, TemplateDayDefinition, TemplateExerciseDefinition, MesocycleDefaults } from './types.js';

// ── Free templates ──

export { FULL_BODY_TEMPLATE } from './full-body.js';
export { PPL_TEMPLATE } from './ppl.js';
export { UPPER_LOWER_TEMPLATE } from './upper-lower.js';

// ── Premium templates ──

export { PERIODIZED_STRENGTH_531_TEMPLATE } from './periodized-strength-531.js';
export { LINEAR_PROGRESSION_LP_TEMPLATE } from './linear-progression-lp.js';
export { TIERED_VOLUME_METHOD_TEMPLATE } from './tiered-volume-method.js';
export { PERIODIZED_HYPERTROPHY_TEMPLATE } from './periodized-hypertrophy.js';
export { STRENGTH_ENDURANCE_BLOCK_TEMPLATE } from './strength-endurance-block.js';

import type { ProgramTemplate } from './types.js';

import { FULL_BODY_TEMPLATE } from './full-body.js';
import { PPL_TEMPLATE } from './ppl.js';
import { UPPER_LOWER_TEMPLATE } from './upper-lower.js';

import { PERIODIZED_STRENGTH_531_TEMPLATE } from './periodized-strength-531.js';
import { LINEAR_PROGRESSION_LP_TEMPLATE } from './linear-progression-lp.js';
import { TIERED_VOLUME_METHOD_TEMPLATE } from './tiered-volume-method.js';
import { PERIODIZED_HYPERTROPHY_TEMPLATE } from './periodized-hypertrophy.js';
import { STRENGTH_ENDURANCE_BLOCK_TEMPLATE } from './strength-endurance-block.js';

/** Free program templates, ordered by training frequency (ascending) — used in onboarding */
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
	FULL_BODY_TEMPLATE,
	UPPER_LOWER_TEMPLATE,
	PPL_TEMPLATE
];

/** Premium program templates — requires template pack purchase */
export const PREMIUM_PROGRAM_TEMPLATES: ProgramTemplate[] = [
	PERIODIZED_STRENGTH_531_TEMPLATE,
	LINEAR_PROGRESSION_LP_TEMPLATE,
	TIERED_VOLUME_METHOD_TEMPLATE,
	PERIODIZED_HYPERTROPHY_TEMPLATE,
	STRENGTH_ENDURANCE_BLOCK_TEMPLATE
];

/** All templates combined (free + premium) */
export const ALL_TEMPLATES: ProgramTemplate[] = [
	...PROGRAM_TEMPLATES,
	...PREMIUM_PROGRAM_TEMPLATES
];
