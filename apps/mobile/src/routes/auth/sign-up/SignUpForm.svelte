<script lang="ts">
	import { defaults, superForm } from 'sveltekit-superforms/client';
	import { zod4, zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	import * as Form from '@repo/ui/components/ui/form';
	import { Input } from '@repo/ui/components/ui/input';
	import { LoaderCircle } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { signUpSchema } from '$lib/schemas/auth.js';
	import { signUp } from '$lib/services/auth-client.js';
	import { fullSync } from '$lib/services/sync.js';

	let submitting = $state(false);

	const form = superForm(defaults(zod4(signUpSchema)), {
		SPA: true,
		validators: zod4Client(signUpSchema),
		resetForm: false,
		onUpdate: async ({ form: updatedForm }) => {
			if (!updatedForm.valid) return;

			submitting = true;
			try {
				const result = await signUp(
					updatedForm.data.email,
					updatedForm.data.password,
					updatedForm.data.email.split('@')[0],
				);

				if (result.success) {
					toast.success(m.auth_signup_success());
					await goto('/programs');
					// Fire-and-forget: full sync after sign-up (runs in background)
					fullSync().catch(() => {});
				} else {
					toast.error(result.error ?? m.auth_signup_error());
				}
			} catch (err) {
				console.error('[Auth UI] signUp form error:', err);
				toast.error(m.auth_signup_error());
			} finally {
				submitting = false;
			}
		},
	});

	const { form: formData, enhance } = form;
</script>

<form method="POST" use:enhance class="space-y-4">
	<!-- Email -->
	<Form.Field {form} name="email">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.auth_email_label()}</Form.Label>
				<Input
					{...props}
					type="email"
					autocomplete="email"
					placeholder={m.auth_email_placeholder()}
					bind:value={$formData.email}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Password -->
	<Form.Field {form} name="password">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.auth_password_label()}</Form.Label>
				<Input
					{...props}
					type="password"
					autocomplete="new-password"
					placeholder={m.auth_password_placeholder()}
					bind:value={$formData.password}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Confirm Password -->
	<Form.Field {form} name="confirmPassword">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{m.auth_confirm_password_label()}</Form.Label>
				<Input
					{...props}
					type="password"
					autocomplete="new-password"
					placeholder={m.auth_confirm_password_placeholder()}
					bind:value={$formData.confirmPassword}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Submit -->
	<Form.Button class="w-full" disabled={submitting}>
		{#if submitting}
			<LoaderCircle class="mr-2 size-4 animate-spin" />
			{m.auth_signup_submitting()}
		{:else}
			{m.auth_signup_button()}
		{/if}
	</Form.Button>
</form>
