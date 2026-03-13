<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Dumbbell, Calendar, Lock, Loader2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { ProgramTemplate } from '$lib/data/templates/types.js';

	interface Props {
		template: ProgramTemplate;
		locked: boolean;
		loading: boolean;
		onselect: (template: ProgramTemplate) => void;
	}

	const { template, locked, loading, onselect }: Props = $props();

	const dayCount = $derived(template.days.length);
</script>

<button
	type="button"
	class="w-full text-left"
	disabled={loading}
	onclick={() => onselect(template)}
>
	<Card
		class="relative border-2 border-border shadow-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none {loading ? 'opacity-50' : ''}"
	>
		<CardContent class="flex items-center gap-4 p-4">
			<div
				class="relative flex size-12 shrink-0 items-center justify-center border-2 border-border {locked ? 'bg-muted' : 'bg-primary/10'}"
			>
				{#if locked}
					<Lock class="text-muted-foreground size-6" />
				{:else if loading}
					<Loader2 class="text-primary size-6 animate-spin" />
				{:else}
					<Dumbbell class="text-primary size-6" />
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-bold">{template.name}</h3>
				<p class="text-muted-foreground mt-0.5 text-sm">{template.description}</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<Badge variant="secondary" class="text-xs">
						<Calendar class="mr-1 size-3" />
						<span class="font-mono"
							>{m.onboarding_template_days_count({ count: dayCount })}</span
						>
					</Badge>
					{#if template.premium}
						<Badge
							variant={locked ? 'default' : 'secondary'}
							class="text-xs {locked ? 'bg-primary/90' : ''}"
						>
							{#if locked}
								<Lock class="mr-1 size-3" />
							{/if}
							{m.programs_template_premium_badge()}
						</Badge>
					{/if}
				</div>
			</div>
		</CardContent>
	</Card>
</button>
