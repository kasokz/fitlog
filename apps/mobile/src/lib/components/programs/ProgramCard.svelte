<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Calendar, Dumbbell, ChevronRight } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { ProgramWithDays } from '$lib/types/program.js';

	interface Props {
		program: ProgramWithDays;
		onclick: () => void;
	}

	const { program, onclick }: Props = $props();

	const dayCount = $derived(program.trainingDays.length);
</script>

<button type="button" class="w-full text-left" {onclick}>
	<Card class="transition-colors active:bg-muted/50">
		<CardContent class="flex items-center gap-3 p-3">
			<div class="min-w-0 flex-1">
				<h3 class="truncate text-sm font-medium">{program.name}</h3>
				{#if program.description}
					<p class="text-muted-foreground mt-0.5 truncate text-xs">{program.description}</p>
				{/if}
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					<Badge variant="secondary" class="text-xs">
						<Dumbbell class="mr-1 size-3" />
						{m.programs_card_days_count({ count: dayCount })}
					</Badge>
				</div>
			</div>
			<ChevronRight class="text-muted-foreground/50 size-4 shrink-0" />
		</CardContent>
	</Card>
</button>
