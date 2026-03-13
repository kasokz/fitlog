<script lang="ts">
	import { z } from 'zod';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';

	import * as Form from '@repo/ui/components/ui/form';
	import { Input } from '@repo/ui/components/ui/input';
	import { Button } from '@repo/ui/components/ui/button';
	import { Loader2, Dumbbell } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { ProgramRepository } from '$lib/db/repositories/program.js';
	import type { Exercise } from '$lib/types/exercise.js';

	import ExercisePicker from './ExercisePicker.svelte';

	interface Props {
		trainingDayId: string;
		oncreated: () => void;
	}

	let { trainingDayId, oncreated }: Props = $props();

	let submitting = $state(false);
	let pickerOpen = $state(false);
	let selectedExercise = $state<Exercise | null>(null);

	// Form schema with max_reps >= min_reps refinement
	const assignmentFormSchema = z
		.object({
			exercise_id: z.uuid(),
			target_sets: z.number().int().min(1).max(10).default(3),
			min_reps: z.number().int().min(1).max(100).default(8),
			max_reps: z.number().int().min(1).max(100).default(12)
		})
		.refine((data) => data.max_reps >= data.min_reps, {
			message: m.validation_max_reps_gte_min(),
			path: ['max_reps']
		});

	const form = superForm(
		defaults(zod4(assignmentFormSchema)),
		{
			SPA: true,
			validators: zod4Client(assignmentFormSchema),
			resetForm: true,
			onUpdate: async ({ form: updatedForm }) => {
				if (!updatedForm.valid) return;

				submitting = true;
				try {
					await ProgramRepository.addExerciseAssignment(trainingDayId, {
						exercise_id: updatedForm.data.exercise_id,
						target_sets: updatedForm.data.target_sets,
						min_reps: updatedForm.data.min_reps,
						max_reps: updatedForm.data.max_reps
					});
					toast.success(m.programs_assignment_success());
					selectedExercise = null;
					oncreated();
				} catch (err) {
					console.error('[ExerciseAssignmentForm] Add failed:', err);
					toast.error(m.programs_assignment_error());
				} finally {
					submitting = false;
				}
			}
		}
	);

	const { form: formData, enhance } = form;

	function handleExerciseSelected(exercise: Exercise) {
		selectedExercise = exercise;
		$formData.exercise_id = exercise.id;
	}
</script>

<form method="POST" use:enhance class="space-y-4 px-4 pb-4">
	<!-- Exercise picker trigger -->
	<div>
		<p class="text-sm font-medium mb-1.5">{m.programs_assignment_pick_exercise()}</p>
		{#if selectedExercise}
			<Button
				type="button"
				variant="outline"
				class="w-full justify-start"
				onclick={() => { pickerOpen = true; }}
			>
				<Dumbbell class="mr-2 size-4" />
				{selectedExercise.name}
			</Button>
		{:else}
			<Button
				type="button"
				variant="outline"
				class="text-muted-foreground w-full justify-start"
				onclick={() => { pickerOpen = true; }}
			>
				<Dumbbell class="mr-2 size-4" />
				{m.programs_assignment_pick_exercise()}
			</Button>
		{/if}
	</div>

	<!-- Hidden exercise_id field (managed by picker) -->
	<input type="hidden" name="exercise_id" bind:value={$formData.exercise_id} />

	<!-- Target sets -->
	<Form.Field {form} name="target_sets">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_assignment_target_sets_label()}</Form.Label>
				<Input
					{...props}
					type="number"
					min={1}
					max={10}
					bind:value={$formData.target_sets}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Min reps -->
	<Form.Field {form} name="min_reps">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_assignment_min_reps_label()}</Form.Label>
				<Input
					{...props}
					type="number"
					min={1}
					max={100}
					bind:value={$formData.min_reps}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Max reps -->
	<Form.Field {form} name="max_reps">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_assignment_max_reps_label()}</Form.Label>
				<Input
					{...props}
					type="number"
					min={1}
					max={100}
					bind:value={$formData.max_reps}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting || !selectedExercise}>
		{#if submitting}
			<Loader2 class="mr-2 size-4 animate-spin" />
			{m.programs_assignment_submitting()}
		{:else}
			{m.programs_assignment_submit()}
		{/if}
	</Form.Button>
</form>

<!-- Exercise Picker Drawer -->
<ExercisePicker bind:open={pickerOpen} onselect={handleExerciseSelected} />
