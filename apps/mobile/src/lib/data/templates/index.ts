/**
 * Program template registry — exports all starter program templates.
 *
 * @module
 */

export type { ProgramTemplate, TemplateDayDefinition, TemplateExerciseDefinition, MesocycleDefaults } from './types.js';

export { FULL_BODY_TEMPLATE } from './full-body.js';
export { PPL_TEMPLATE } from './ppl.js';
export { UPPER_LOWER_TEMPLATE } from './upper-lower.js';

import type { ProgramTemplate } from './types.js';

import { FULL_BODY_TEMPLATE } from './full-body.js';
import { PPL_TEMPLATE } from './ppl.js';
import { UPPER_LOWER_TEMPLATE } from './upper-lower.js';

/** All available program templates, ordered by training frequency (ascending) */
export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
	FULL_BODY_TEMPLATE,
	UPPER_LOWER_TEMPLATE,
	PPL_TEMPLATE
];
