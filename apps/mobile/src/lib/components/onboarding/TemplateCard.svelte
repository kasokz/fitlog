<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Dumbbell, Calendar } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { ProgramTemplate } from '$lib/data/templates/types.js';

	interface Props {
		template: ProgramTemplate;
		disabled?: boolean;
		onselect: (template: ProgramTemplate) => void;
	}

	const { template, disabled = false, onselect }: Props = $props();

	const dayCount = $derived(template.days.length);
</script>

<button
	type="button"
	class="w-full text-left"
	{disabled}
	onclick={() => onselect(template)}
>
	<Card class="border-2 border-border shadow-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none {disabled ? 'opacity-50' : ''}">
		<CardContent class="flex items-center gap-4 p-4">
			<div class="bg-primary/10 flex size-12 shrink-0 items-center justify-center border-2 border-border">
				<Dumbbell class="text-primary size-6" />
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-bold">{template.name}</h3>
				<p class="text-muted-foreground mt-0.5 text-sm">{template.description}</p>
				<div class="mt-2 flex flex-wrap gap-1.5">
					<Badge variant="secondary" class="text-xs">
						<Calendar class="mr-1 size-3" />
						<span class="font-mono">{m.onboarding_template_days_count({ count: dayCount })}</span>
					</Badge>
				</div>
			</div>
		</CardContent>
	</Card>
</button>
