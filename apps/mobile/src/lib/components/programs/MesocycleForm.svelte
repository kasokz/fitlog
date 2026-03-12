<script lang="ts">
	import { z } from 'zod';
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';

	import * as Form from '@repo/ui/components/ui/form';
	import * as Select from '@repo/ui/components/ui/select';
	import { Input } from '@repo/ui/components/ui/input';
	import { Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { Mesocycle } from '$lib/types/program.js';
	import { ProgramRepository } from '$lib/db/repositories/program.js';

	interface Props {
		programId: string;
		existingMesocycle?: Mesocycle;
		onsaved: () => void;
	}

	let { programId, existingMesocycle, onsaved }: Props = $props();

	let submitting = $state(false);

	// Form schema with deload_week_number <= weeks_count refinement
	const mesocycleFormSchema = z
		.object({
			weeks_count: z.number().int().min(1).max(52).default(4),
			deload_week_number: z.number().int().min(0).max(52).default(0),
			start_date: z.optional(z.nullable(z.string()))
		})
		.refine((data) => data.deload_week_number <= data.weeks_count, {
			message: 'Deload week must be within weeks count',
			path: ['deload_week_number']
		});

	// Helper to extract initial form data from props (avoids Svelte state_referenced_locally warnings)
	function getInitialState() {
		const existing = existingMesocycle;
		return {
			isEditMode: !!existing,
			existingId: existing?.id,
			initialData: existing
				? {
						weeks_count: existing.weeks_count,
						deload_week_number: existing.deload_week_number,
						start_date: existing.start_date
					}
				: undefined
		};
	}

	const { isEditMode, existingId, initialData } = getInitialState();

	const form = superForm(defaults(initialData, zod4(mesocycleFormSchema)), {
		SPA: true,
		validators: zod4Client(mesocycleFormSchema),
		resetForm: !isEditMode,
		onUpdate: async ({ form: updatedForm }) => {
			if (!updatedForm.valid) return;

			submitting = true;
			try {
				if (isEditMode && existingId) {
					await ProgramRepository.updateMesocycle(existingId, {
						weeks_count: updatedForm.data.weeks_count,
						deload_week_number: updatedForm.data.deload_week_number,
						start_date: updatedForm.data.start_date ?? null
					});
				} else {
					await ProgramRepository.createMesocycle(programId, {
						weeks_count: updatedForm.data.weeks_count,
						deload_week_number: updatedForm.data.deload_week_number,
						start_date: updatedForm.data.start_date ?? null
					});
				}
				toast.success(m.programs_mesocycle_success());
				onsaved();
			} catch (err) {
				console.error('[MesocycleForm] Save failed:', err);
				toast.error(m.programs_mesocycle_error());
			} finally {
				submitting = false;
			}
		}
	});

	const { form: formData, enhance } = form;

	// Dynamic deload week options: 0 (none) + 1..weeks_count
	const deloadOptions = $derived(
		Array.from({ length: ($formData.weeks_count ?? 4) + 1 }, (_, i) => i)
	);

	// When weeks_count changes, clamp deload_week_number if it exceeds the new value
	$effect(() => {
		const wc = $formData.weeks_count ?? 4;
		if (($formData.deload_week_number ?? 0) > wc) {
			$formData.deload_week_number = wc;
		}
	});
</script>

<form method="POST" use:enhance class="space-y-4 px-4 pb-4">
	<!-- Weeks count -->
	<Form.Field {form} name="weeks_count">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_mesocycle_weeks_count_label()}</Form.Label>
				<Input
					{...props}
					type="number"
					min={1}
					max={52}
					bind:value={$formData.weeks_count}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Deload week -->
	<Form.Field {form} name="deload_week_number">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_mesocycle_deload_week_label()}</Form.Label>
				<select
					{...props}
					class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					bind:value={$formData.deload_week_number}
					onchange={(e) => {
						$formData.deload_week_number = parseInt(e.currentTarget.value, 10);
					}}
				>
					{#each deloadOptions as week}
						<option value={week}>
							{week === 0 ? m.programs_mesocycle_deload_none() : `${m.programs_mesocycle_deload_display({ week })}`}
						</option>
					{/each}
				</select>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Start date (optional) -->
	<Form.Field {form} name="start_date">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_mesocycle_start_date_label()}</Form.Label>
				<Input
					{...props}
					type="date"
					placeholder={m.programs_mesocycle_start_date_placeholder()}
					bind:value={$formData.start_date}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting}>
		{#if submitting}
			<Loader2 class="mr-2 size-4 animate-spin" />
			{m.programs_mesocycle_submitting()}
		{:else}
			{m.programs_mesocycle_submit()}
		{/if}
	</Form.Button>
</form>
