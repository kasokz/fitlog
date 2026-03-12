<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { Pencil } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { Exercise } from '$lib/types/exercise.js';

	import { getEquipmentLabel, getMuscleGroupLabel } from './i18n-maps.js';

	interface Props {
		exercise: Exercise | null;
		open: boolean;
		onclose: () => void;
	}

	let { exercise, open = $bindable(), onclose }: Props = $props();
</script>

<Drawer.Root bind:open onClose={onclose}>
	<Drawer.Content>
		{#if exercise}
			<Drawer.Header>
				<Drawer.Title>{exercise.name}</Drawer.Title>
				{#if exercise.description}
					<Drawer.Description>{exercise.description}</Drawer.Description>
				{/if}
			</Drawer.Header>

			<div class="space-y-4 px-4 pb-4">
				<!-- Primary Muscle Group -->
				<div>
					<p class="text-muted-foreground mb-1 text-xs font-medium">
						{m.exercises_detail_muscle_group()}
					</p>
					<Badge variant="secondary">
						{getMuscleGroupLabel(exercise.muscle_group)}
					</Badge>
				</div>

				<!-- Secondary Muscle Groups -->
				{#if exercise.secondary_muscle_groups.length > 0}
					<div>
						<p class="text-muted-foreground mb-1 text-xs font-medium">
							{m.exercises_detail_secondary_muscles()}
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each exercise.secondary_muscle_groups as group}
								<Badge variant="outline">{getMuscleGroupLabel(group)}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Equipment -->
				<div>
					<p class="text-muted-foreground mb-1 text-xs font-medium">
						{m.exercises_detail_equipment()}
					</p>
					<Badge variant="outline">{getEquipmentLabel(exercise.equipment)}</Badge>
				</div>

				<!-- Type (compound/isolation) -->
				<div>
					<p class="text-muted-foreground mb-1 text-xs font-medium">
						{m.exercises_detail_type()}
					</p>
					<Badge variant={exercise.is_compound ? 'default' : 'secondary'}>
						{exercise.is_compound
							? m.exercises_detail_type_compound()
							: m.exercises_detail_type_isolation()}
					</Badge>
				</div>
			</div>

			<Drawer.Footer>
				{#if exercise.is_custom}
					<Button variant="outline" class="w-full" disabled>
						<Pencil class="mr-2 size-4" />
						{m.exercises_detail_edit()}
					</Button>
				{/if}
				<Button variant="ghost" class="w-full" onclick={() => { open = false; onclose(); }}>
					{m.common_close()}
				</Button>
			</Drawer.Footer>
		{/if}
	</Drawer.Content>
</Drawer.Root>
