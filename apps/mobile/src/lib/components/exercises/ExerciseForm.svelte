<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';

	import * as Form from '@repo/ui/components/ui/form';
	import * as Select from '@repo/ui/components/ui/select';
	import { Input } from '@repo/ui/components/ui/input';
	import { Textarea } from '@repo/ui/components/ui/textarea';
	import { Switch } from '@repo/ui/components/ui/switch';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { exerciseInsertSchema, MUSCLE_GROUPS, EQUIPMENT_LIST, type MuscleGroup, type Equipment } from '$lib/types/exercise.js';
	import { ExerciseRepository } from '$lib/db/repositories/exercise.js';
	import { getMuscleGroupLabel, getEquipmentLabel } from './i18n-maps.js';

	interface Props {
		oncreated: () => void;
	}

	let { oncreated }: Props = $props();

	let submitting = $state(false);

	const form = superForm(defaults(zod4(exerciseInsertSchema)), {
		SPA: true,
		validators: zod4Client(exerciseInsertSchema),
		resetForm: true,
		onUpdate: async ({ form: updatedForm }) => {
			if (!updatedForm.valid) return;

			submitting = true;
			try {
				await ExerciseRepository.create({
					...updatedForm.data,
					is_custom: true
				});
				toast.success(m.exercises_form_success());
				oncreated();
			} catch (err) {
				console.error('[ExerciseForm] Create failed:', err);
				toast.error(m.exercises_form_error());
			} finally {
				submitting = false;
			}
		}
	});

	const { form: formData, enhance } = form;

	// ── Secondary muscle group toggle ──

	function toggleSecondaryMuscle(group: MuscleGroup) {
		const current = $formData.secondary_muscle_groups ?? [];
		if (current.includes(group)) {
			$formData.secondary_muscle_groups = current.filter((g) => g !== group);
		} else {
			$formData.secondary_muscle_groups = [...current, group];
		}
	}

	function isSecondarySelected(group: MuscleGroup): boolean {
		return ($formData.secondary_muscle_groups ?? []).includes(group);
	}

	// Filter secondary options: exclude the selected primary muscle group
	const secondaryOptions = $derived(
		MUSCLE_GROUPS.filter((g) => g !== $formData.muscle_group)
	);
</script>

<form method="POST" use:enhance class="space-y-4 px-4 pb-4">
	<!-- Name -->
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.exercises_form_name_label()}</Form.Label>
				<Input
					{...props}
					placeholder={m.exercises_form_name_placeholder()}
					bind:value={$formData.name}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Description -->
	<Form.Field {form} name="description">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.exercises_form_description_label()}</Form.Label>
				<Textarea
					{...props}
					placeholder={m.exercises_form_description_placeholder()}
					bind:value={$formData.description}
					class="resize-none"
					rows={3}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Primary Muscle Group -->
	<Form.Field {form} name="muscle_group">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.exercises_form_muscle_group_label()}</Form.Label>
				<Select.Root
					type="single"
					value={$formData.muscle_group}
					onValueChange={(v) => {
						$formData.muscle_group = v as MuscleGroup;
						// Clear secondary muscles that match the new primary
						if ($formData.secondary_muscle_groups) {
							$formData.secondary_muscle_groups = $formData.secondary_muscle_groups.filter(
								(g) => g !== v
							);
						}
					}}
				>
					<Select.Trigger {...props} class="w-full">
						{#if $formData.muscle_group}
							{getMuscleGroupLabel($formData.muscle_group)}
						{:else}
							<span class="text-muted-foreground">{m.exercises_form_muscle_group_placeholder()}</span>
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each MUSCLE_GROUPS as group}
							<Select.Item value={group} label={getMuscleGroupLabel(group)} />
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Secondary Muscle Groups -->
	<Form.Field {form} name="secondary_muscle_groups">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.exercises_form_secondary_muscles_label()}</Form.Label>
				<div {...props} class="flex flex-wrap gap-1.5">
					{#each secondaryOptions as group}
						<button type="button" onclick={() => toggleSecondaryMuscle(group)}>
							<Badge
								variant={isSecondarySelected(group) ? 'default' : 'outline'}
								class="shrink-0 cursor-pointer whitespace-nowrap"
							>
								{getMuscleGroupLabel(group)}
							</Badge>
						</button>
					{/each}
				</div>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Equipment -->
	<Form.Field {form} name="equipment">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.exercises_form_equipment_label()}</Form.Label>
				<Select.Root
					type="single"
					value={$formData.equipment}
					onValueChange={(v) => {
						$formData.equipment = v as Equipment;
					}}
				>
					<Select.Trigger {...props} class="w-full">
						{#if $formData.equipment}
							{getEquipmentLabel($formData.equipment)}
						{:else}
							<span class="text-muted-foreground">{m.exercises_form_equipment_placeholder()}</span>
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each EQUIPMENT_LIST as eq}
							<Select.Item value={eq} label={getEquipmentLabel(eq)} />
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Is Compound -->
	<Form.Field {form} name="is_compound">
		<Form.Control>
			{#snippet children({ props })}
				<div class="flex items-center justify-between gap-4 rounded-lg border p-3">
					<div class="space-y-0.5">
						<Form.Label class="text-sm font-medium">{m.exercises_form_is_compound_label()}</Form.Label>
						<p class="text-muted-foreground text-xs">
							{m.exercises_form_is_compound_description()}
						</p>
					</div>
					<Switch
						{...props}
						checked={$formData.is_compound ?? false}
						onCheckedChange={(v) => {
							$formData.is_compound = v;
						}}
					/>
				</div>
			{/snippet}
		</Form.Control>
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting}>
		{#if submitting}
			<Loader2 class="mr-2 size-4 animate-spin" />
			{m.exercises_form_submitting()}
		{:else}
			{m.exercises_form_submit()}
		{/if}
	</Form.Button>
</form>
