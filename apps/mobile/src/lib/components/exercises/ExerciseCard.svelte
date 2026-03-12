<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Layers, Zap } from '@lucide/svelte';

	import type { Exercise } from '$lib/types/exercise.js';

	import { getEquipmentLabel, getMuscleGroupLabel } from './i18n-maps.js';

	interface Props {
		exercise: Exercise;
		onclick: () => void;
	}

	const { exercise, onclick }: Props = $props();
</script>

<button type="button" class="w-full text-left" {onclick}>
	<Card class="transition-colors active:bg-muted/50">
		<CardContent class="flex items-center gap-3 p-3">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-1.5">
					<h3 class="truncate text-sm font-medium">{exercise.name}</h3>
					{#if exercise.is_compound}
						<Layers class="text-muted-foreground size-3.5 shrink-0" />
					{/if}
				</div>
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					<Badge variant="secondary" class="text-xs">
						{getMuscleGroupLabel(exercise.muscle_group)}
					</Badge>
					<Badge variant="outline" class="text-xs">
						{getEquipmentLabel(exercise.equipment)}
					</Badge>
				</div>
			</div>
			<Zap class="text-muted-foreground/50 size-4 shrink-0" />
		</CardContent>
	</Card>
</button>
