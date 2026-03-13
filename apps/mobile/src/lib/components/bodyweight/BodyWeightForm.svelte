<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';

	import * as Form from '@repo/ui/components/ui/form';
	import { Input } from '@repo/ui/components/ui/input';
	import { Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { bodyWeightInsertSchema } from '$lib/types/bodyweight.js';
	import { BodyWeightRepository } from '$lib/db/repositories/bodyweight.js';

	interface Props {
		onsaved: () => void;
	}

	let { onsaved }: Props = $props();

	let submitting = $state(false);

	/** Today in YYYY-MM-DD format */
	function todayISO(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const form = superForm(defaults({ date: todayISO(), weight_kg: 0 }, zod4(bodyWeightInsertSchema)), {
		SPA: true,
		validators: zod4Client(bodyWeightInsertSchema),
		resetForm: false,
		onUpdate: async ({ form: updatedForm }) => {
			if (!updatedForm.valid) return;

			submitting = true;
			try {
				await BodyWeightRepository.log(updatedForm.data.date, updatedForm.data.weight_kg);
				toast.success(m.bodyweight_form_success());
				onsaved();
			} catch (err) {
				console.error('[BodyWeightForm] Save failed:', err);
				toast.error(m.bodyweight_form_error());
			} finally {
				submitting = false;
			}
		}
	});

	const { form: formData, enhance } = form;
</script>

<form method="POST" use:enhance class="space-y-4 px-4 pb-4">
	<!-- Date -->
	<Form.Field {form} name="date">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.bodyweight_form_date_label()}</Form.Label>
				<Input
					{...props}
					type="date"
					bind:value={$formData.date}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Weight -->
	<Form.Field {form} name="weight_kg">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.bodyweight_form_weight_label()}</Form.Label>
				<Input
					{...props}
					type="number"
					step="0.1"
					min="20"
					max="500"
					bind:value={$formData.weight_kg}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting}>
		{#if submitting}
			<Loader2 class="mr-2 size-4 animate-spin" />
			{m.bodyweight_form_submitting()}
		{:else}
			{m.bodyweight_form_submit()}
		{/if}
	</Form.Button>
</form>
