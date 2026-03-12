<script lang="ts">
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Input } from '@repo/ui/components/ui/input';
	import { Search, X } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		MUSCLE_GROUPS,
		EQUIPMENT_LIST,
		type MuscleGroup,
		type Equipment
	} from '$lib/types/exercise.js';

	import { getEquipmentLabel, getMuscleGroupLabel } from './i18n-maps.js';

	interface Props {
		searchQuery: string;
		selectedMuscleGroup: MuscleGroup | null;
		selectedEquipment: Equipment | null;
		onchange: (filters: {
			search: string;
			muscleGroup: MuscleGroup | null;
			equipment: Equipment | null;
		}) => void;
	}

	let { searchQuery = $bindable(), selectedMuscleGroup = $bindable(), selectedEquipment = $bindable(), onchange }: Props = $props();

	const activeFilterCount = $derived(
		(selectedMuscleGroup ? 1 : 0) + (selectedEquipment ? 1 : 0)
	);

	function toggleMuscleGroup(group: MuscleGroup) {
		selectedMuscleGroup = selectedMuscleGroup === group ? null : group;
		onchange({ search: searchQuery, muscleGroup: selectedMuscleGroup, equipment: selectedEquipment });
	}

	function toggleEquipment(eq: Equipment) {
		selectedEquipment = selectedEquipment === eq ? null : eq;
		onchange({ search: searchQuery, muscleGroup: selectedMuscleGroup, equipment: selectedEquipment });
	}

	function clearFilters() {
		searchQuery = '';
		selectedMuscleGroup = null;
		selectedEquipment = null;
		onchange({ search: '', muscleGroup: null, equipment: null });
	}
</script>

<div class="space-y-3">
	<!-- Search input -->
	<div class="relative">
		<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
		<Input
			type="text"
			placeholder={m.exercises_search_placeholder()}
			bind:value={searchQuery}
			class="pl-9"
		/>
	</div>

	<!-- Muscle group filter -->
	<div>
		<p class="text-muted-foreground mb-1.5 text-xs font-medium">{m.exercises_filter_muscle_group()}</p>
		<div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
			{#each MUSCLE_GROUPS as group}
				<button type="button" onclick={() => toggleMuscleGroup(group)}>
					<Badge
						variant={selectedMuscleGroup === group ? 'default' : 'outline'}
						class="shrink-0 cursor-pointer whitespace-nowrap"
					>
						{getMuscleGroupLabel(group)}
					</Badge>
				</button>
			{/each}
		</div>
	</div>

	<!-- Equipment filter -->
	<div>
		<p class="text-muted-foreground mb-1.5 text-xs font-medium">{m.exercises_filter_equipment()}</p>
		<div class="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
			{#each EQUIPMENT_LIST as eq}
				<button type="button" onclick={() => toggleEquipment(eq)}>
					<Badge
						variant={selectedEquipment === eq ? 'default' : 'outline'}
						class="shrink-0 cursor-pointer whitespace-nowrap"
					>
						{getEquipmentLabel(eq)}
					</Badge>
				</button>
			{/each}
		</div>
	</div>

	<!-- Active filter count + clear -->
	{#if activeFilterCount > 0 || searchQuery.length > 0}
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-xs">
				{m.exercises_filter_active_count({ count: activeFilterCount + (searchQuery.length > 0 ? 1 : 0) })}
			</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
				onclick={clearFilters}
			>
				<X class="size-3" />
				{m.exercises_filter_clear()}
			</button>
		</div>
	{/if}
</div>
