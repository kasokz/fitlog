<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import { Plus } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import type { MuscleGroup } from '$lib/types/exercise.js';
	import { getMuscleGroupLabel } from '$lib/components/exercises/i18n-maps.js';

	import SetRow from './SetRow.svelte';
	import type { WorkingSet } from './SetRow.svelte';

	interface Props {
		exerciseName: string;
		muscleGroup: MuscleGroup;
		sets: WorkingSet[];
		onconfirm: (setIndex: number) => void;
		onadd: () => void;
		onremove: (setIndex: number) => void;
	}

	let { exerciseName, muscleGroup, sets = $bindable(), onconfirm, onadd, onremove }: Props = $props();
</script>

<Card class="border-2 border-border shadow-md">
	<CardHeader class="pb-2">
		<div class="flex items-center gap-2">
			<CardTitle class="text-base font-bold">{exerciseName}</CardTitle>
			<Badge variant="secondary" class="text-xs">
				{getMuscleGroupLabel(muscleGroup)}
			</Badge>
		</div>
	</CardHeader>
	<CardContent class="space-y-2">
		{#each sets as set, index (set.id)}
			<SetRow
				bind:set={sets[index]}
				onconfirm={() => onconfirm(index)}
				onremove={() => onremove(index)}
			/>
		{/each}

		<Button
			variant="ghost"
			size="sm"
			class="text-muted-foreground mt-1 w-full"
			onclick={onadd}
		>
			<Plus class="mr-1.5 size-3.5" />
			{m.workout_add_set()}
		</Button>
	</CardContent>
</Card>
