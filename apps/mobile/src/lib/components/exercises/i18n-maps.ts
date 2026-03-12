/**
 * Maps exercise enum values to their i18n message functions.
 */

import { m } from '$lib/paraglide/messages.js';
import type { Equipment, MuscleGroup } from '$lib/types/exercise.js';

type MessageFn = () => string;

const muscleGroupMessages: Record<MuscleGroup, MessageFn> = {
	chest: m.muscle_group_chest,
	back: m.muscle_group_back,
	shoulders: m.muscle_group_shoulders,
	biceps: m.muscle_group_biceps,
	triceps: m.muscle_group_triceps,
	forearms: m.muscle_group_forearms,
	quadriceps: m.muscle_group_quadriceps,
	hamstrings: m.muscle_group_hamstrings,
	glutes: m.muscle_group_glutes,
	calves: m.muscle_group_calves,
	abs: m.muscle_group_abs,
	full_body: m.muscle_group_full_body
};

const equipmentMessages: Record<Equipment, MessageFn> = {
	barbell: m.equipment_barbell,
	dumbbell: m.equipment_dumbbell,
	cable: m.equipment_cable,
	machine: m.equipment_machine,
	bodyweight: m.equipment_bodyweight,
	kettlebell: m.equipment_kettlebell,
	band: m.equipment_band,
	other: m.equipment_other
};

export function getMuscleGroupLabel(group: MuscleGroup): string {
	return muscleGroupMessages[group]();
}

export function getEquipmentLabel(equipment: Equipment): string {
	return equipmentMessages[equipment]();
}
