<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import { ChevronUp, ChevronDown, Trash2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { ExerciseAssignment } from '$lib/types/program.js';

	interface Props {
		assignments: ExerciseAssignment[];
		/** Map of exercise_id → exercise name. Missing entries render as deleted. */
		exerciseNames: Map<string, string>;
		onreorder: (orderedIds: string[]) => void;
		onremove: (assignmentId: string) => void;
	}

	const { assignments, exerciseNames, onreorder, onremove }: Props = $props();

	function getExerciseName(exerciseId: string): string {
		return exerciseNames.get(exerciseId) ?? m.programs_assignment_deleted_exercise();
	}

	function formatSetsReps(assignment: ExerciseAssignment): string {
		return m.programs_assignment_sets_reps_display({
			sets: assignment.target_sets,
			minReps: assignment.min_reps,
			maxReps: assignment.max_reps
		});
	}

	function handleMoveUp(index: number) {
		if (index === 0) return;
		const ids = assignments.map((a) => a.id);
		[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
		onreorder(ids);
	}

	function handleMoveDown(index: number) {
		if (index === assignments.length - 1) return;
		const ids = assignments.map((a) => a.id);
		[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
		onreorder(ids);
	}
</script>

{#if assignments.length > 0}
	<div class="space-y-1.5 mt-2">
		{#each assignments as assignment, index (assignment.id)}
			<div class="flex items-center gap-1.5">
				<!-- Reorder buttons -->
				<div class="flex flex-col gap-0.5">
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						disabled={index === 0}
						onclick={() => handleMoveUp(index)}
					>
						<ChevronUp class="size-3" />
						<span class="sr-only">Move up</span>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="size-6"
						disabled={index === assignments.length - 1}
						onclick={() => handleMoveDown(index)}
					>
						<ChevronDown class="size-3" />
						<span class="sr-only">Move down</span>
					</Button>
				</div>

				<!-- Assignment info -->
				<div class="bg-muted/40 flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2">
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium {exerciseNames.has(assignment.exercise_id) ? '' : 'text-muted-foreground italic'}">
							{getExerciseName(assignment.exercise_id)}
						</p>
						<Badge variant="secondary" class="mt-0.5 text-xs">
							{formatSetsReps(assignment)}
						</Badge>
					</div>
				</div>

				<!-- Remove button -->
				<Button
					variant="ghost"
					size="icon"
					class="text-destructive hover:text-destructive size-7 shrink-0"
					onclick={() => onremove(assignment.id)}
				>
					<Trash2 class="size-3.5" />
					<span class="sr-only">{m.programs_day_card_remove()}</span>
				</Button>
			</div>
		{/each}
	</div>
{/if}
