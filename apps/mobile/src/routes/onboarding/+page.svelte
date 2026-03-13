<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '@repo/ui/components/ui/button';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { getDb } from '$lib/db/database.js';
	import { PROGRAM_TEMPLATES } from '$lib/data/templates/index.js';
	import type { ProgramTemplate } from '$lib/data/templates/types.js';
	import { createProgramFromTemplate } from '$lib/db/services/template-service.js';
	import { completeOnboarding } from '$lib/services/onboarding.js';

	import TemplateCard from '$lib/components/onboarding/TemplateCard.svelte';

	// ── State ──

	let creating = $state(false);

	// ── Handlers ──

	async function handleSelectTemplate(template: ProgramTemplate) {
		if (creating) return;

		console.log(`[Onboarding] Template selected: ${template.id} (${template.name})`);
		creating = true;

		try {
			console.log('[Onboarding] Initializing database...');
			await getDb();

			console.log('[Onboarding] Creating program from template...');
			const result = await createProgramFromTemplate(template);
			console.log(`[Onboarding] Program created: ${result.program.id}`);

			await completeOnboarding();
			console.log('[Onboarding] Onboarding completed, navigating to home');

			toast.success(m.onboarding_success());
			await goto('/', { replaceState: true });
		} catch (err) {
			console.error('[Onboarding] Template creation failed:', err);
			toast.error(m.onboarding_error());
			creating = false;
		}
	}

	async function handleSkip() {
		if (creating) return;

		console.log('[Onboarding] User chose to skip onboarding');
		creating = true;

		try {
			await completeOnboarding();
			console.log('[Onboarding] Onboarding skipped, navigating to home');
			await goto('/', { replaceState: true });
		} catch (err) {
			console.error('[Onboarding] Skip failed:', err);
			toast.error(m.onboarding_error());
			creating = false;
		}
	}
</script>

<!-- Loading overlay during creation -->
{#if creating}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
		<Loader2 class="text-primary size-10 animate-spin" />
		<p class="mt-4 text-lg font-medium">{m.onboarding_creating()}</p>
		<p class="text-muted-foreground mt-1 text-sm">{m.onboarding_creating_description()}</p>
	</div>
{/if}

<section class="container mx-auto max-w-lg px-4 py-8">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold">{m.onboarding_title()}</h1>
		<p class="text-muted-foreground mt-2 text-sm">{m.onboarding_description()}</p>
	</div>

	<!-- Template cards -->
	<div class="space-y-3">
		{#each PROGRAM_TEMPLATES as template (template.id)}
			<TemplateCard {template} disabled={creating} onselect={handleSelectTemplate} />
		{/each}
	</div>

	<!-- Skip option -->
	<div class="mt-8 flex flex-col items-center">
		<Button
			variant="ghost"
			class="text-muted-foreground"
			disabled={creating}
			onclick={handleSkip}
		>
			{m.onboarding_skip()}
		</Button>
		<p class="text-muted-foreground mt-1 text-center text-xs">{m.onboarding_skip_description()}</p>
	</div>
</section>
