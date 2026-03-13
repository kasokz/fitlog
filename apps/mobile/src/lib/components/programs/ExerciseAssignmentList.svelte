<script lang="ts">
	import { DragDropProvider, PointerSensor } from '@dnd-kit/svelte';
	import { PointerActivationConstraints } from '@dnd-kit/dom';
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import { GripVertical, Trash2 } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { selectionChanged } from '$lib/services/haptics.js';

	import type { ExerciseAssignment } from '$lib/types/program.js';
	import type { DragDropManager } from '@dnd-kit/svelte';

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

	function handleDragStart() {
		selectionChanged();
	}

	function handleDragEnd(event: { canceled: boolean }, manager: DragDropManager) {
		if (event.canceled) return;

		// Read the final sortable order from the manager's registry.
		// The OptimisticSortingPlugin has already updated indices during drag.
		const sortables: { id: string; index: number }[] = [];
		for (const draggable of manager.registry.draggables) {
			if ('sortable' in draggable && draggable.sortable) {
				const s = draggable.sortable as { id: string; index: number; group: unknown };
				if (s.group === 'assignments') {
					sortables.push({ id: String(s.id), index: s.index });
				}
			}
		}
		sortables.sort((a, b) => a.index - b.index);
		const orderedIds = sortables.map((s) => s.id);

		if (orderedIds.length > 0) {
			onreorder(orderedIds);
		}
	}

	// Configure PointerSensor with distance constraint to prevent accidental drags during scroll
	const sensors = [
		PointerSensor.configure({
			activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })]
		})
	];
</script>

{#if assignments.length > 0}
	<DragDropProvider {sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
		<div class="space-y-1.5 mt-2">
			{#each assignments as assignment, index (assignment.id)}
				{@const sortable = createSortable({ id: assignment.id, index, group: 'assignments' })}
				<div class="flex items-center gap-1.5" {@attach sortable.attach}>
					<!-- Drag handle -->
					<button
						class="text-muted-foreground touch-none flex items-center justify-center p-1"
						{@attach sortable.attachHandle}
						aria-label={m.aria_drag_to_reorder()}
					>
						<GripVertical class="size-4" />
					</button>

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
	</DragDropProvider>
{/if}
