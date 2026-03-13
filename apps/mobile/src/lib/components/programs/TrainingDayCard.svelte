<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { ChevronUp, ChevronDown, Trash2, Dumbbell, Play } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { TrainingDayWithAssignments } from '$lib/types/program.js';

	interface Props {
		trainingDay: TrainingDayWithAssignments;
		index: number;
		total: number;
		onmoveup: () => void;
		onmovedown: () => void;
		onremove: () => void;
		onclick: () => void;
		onstartworkout?: () => void;
	}

	const { trainingDay, index, total, onmoveup, onmovedown, onremove, onclick, onstartworkout }: Props = $props();

	const isFirst = $derived(index === 0);
	const isLast = $derived(index === total - 1);
	const exerciseCount = $derived(trainingDay.assignments.length);
	const hasExercises = $derived(exerciseCount > 0);
</script>

<div class="flex items-center gap-2">
	<!-- Reorder buttons -->
	<div class="flex flex-col gap-0.5">
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isFirst}
			onclick={(e: MouseEvent) => { e.stopPropagation(); onmoveup(); }}
		>
			<ChevronUp class="size-4" />
			<span class="sr-only">Move up</span>
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="size-7"
			disabled={isLast}
			onclick={(e: MouseEvent) => { e.stopPropagation(); onmovedown(); }}
		>
			<ChevronDown class="size-4" />
			<span class="sr-only">Move down</span>
		</Button>
	</div>

	<!-- Card content -->
	<button type="button" class="min-w-0 flex-1 text-left" {onclick}>
		<Card class="border-2 border-border shadow-md transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
			<CardContent class="flex items-center gap-3 p-3">
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-sm font-bold">{trainingDay.name}</h3>
					<div class="mt-1.5 flex flex-wrap gap-1.5">
						<Badge variant="secondary" class="text-xs">
							<Dumbbell class="mr-1 size-3" />
							<span class="font-mono">{m.programs_day_card_exercises_count({ count: exerciseCount })}</span>
						</Badge>
					</div>
				</div>

				{#if hasExercises && onstartworkout}
					<Button
						variant="default"
						size="icon"
						class="size-9 shrink-0 border-2 border-border shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						onclick={(e: MouseEvent) => { e.stopPropagation(); onstartworkout(); }}
					>
						<Play class="size-4" />
						<span class="sr-only">{m.workout_start()}</span>
					</Button>
				{/if}
			</CardContent>
		</Card>
	</button>

	<!-- Remove button -->
	<Button
		variant="ghost"
		size="icon"
		class="text-destructive hover:text-destructive size-8 shrink-0"
		onclick={(e: MouseEvent) => { e.stopPropagation(); onremove(); }}
	>
		<Trash2 class="size-4" />
		<span class="sr-only">{m.programs_day_card_remove()}</span>
	</Button>
</div>
