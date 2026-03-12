<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';

	import * as Form from '@repo/ui/components/ui/form';
	import { Input } from '@repo/ui/components/ui/input';
	import { Textarea } from '@repo/ui/components/ui/textarea';
	import { Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { programInsertSchema } from '$lib/types/program.js';
	import { ProgramRepository } from '$lib/db/repositories/program.js';

	interface Props {
		oncreated: () => void;
	}

	let { oncreated }: Props = $props();

	let submitting = $state(false);

	const form = superForm(defaults(zod4(programInsertSchema)), {
		SPA: true,
		validators: zod4Client(programInsertSchema),
		resetForm: true,
		onUpdate: async ({ form: updatedForm }) => {
			if (!updatedForm.valid) return;

			submitting = true;
			try {
				await ProgramRepository.createProgram(updatedForm.data);
				toast.success(m.programs_form_success());
				oncreated();
			} catch (err) {
				console.error('[ProgramForm] Create failed:', err);
				toast.error(m.programs_form_error());
			} finally {
				submitting = false;
			}
		}
	});

	const { form: formData, enhance } = form;
</script>

<form method="POST" use:enhance class="space-y-4 px-4 pb-4">
	<!-- Name -->
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.programs_form_name_label()}</Form.Label>
				<Input
					{...props}
					placeholder={m.programs_form_name_placeholder()}
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
				<Form.Label>{m.programs_form_description_label()}</Form.Label>
				<Textarea
					{...props}
					placeholder={m.programs_form_description_placeholder()}
					bind:value={$formData.description}
					class="resize-none"
					rows={3}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting}>
		{#if submitting}
			<Loader2 class="mr-2 size-4 animate-spin" />
			{m.programs_form_submitting()}
		{:else}
			{m.programs_form_submit()}
		{/if}
	</Form.Button>
</form>
