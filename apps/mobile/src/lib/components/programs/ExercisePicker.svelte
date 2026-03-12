<script lang="ts">
	import { Debounced } from 'runed';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Input } from '@repo/ui/components/ui/input';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Search, Loader2, SearchX, Check } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { getDb } from '$lib/db/database.js';
	import { ExerciseRepository } from '$lib/db/repositories/exercise.js';
	import type { Exercise, MuscleGroup } from '$lib/types/exercise.js';
	import { MUSCLE_GROUPS } from '$lib/types/exercise.js';
	import { getMuscleGroupLabel, getEquipmentLabel } from '$lib/components/exercises/i18n-maps.js';

	interface Props {
		open: boolean;
		onselect: (exercise: Exercise) => void;
	}

	let { open = $bindable(), onselect }: Props = $props();

	let exercises: Exercise[] = $state([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let selectedMuscleGroup = $state<MuscleGroup | null>(null);
	let selectedExerciseId = $state<string | null>(null);

	const debouncedSearch = new Debounced(() => searchQuery, 300);

	async function loadExercises(search: string, muscleGroup: MuscleGroup | null) {
		loading = true;
		try {
			await getDb();
			exercises = await ExerciseRepository.combinedFilter({
				search: search || undefined,
				muscleGroup: muscleGroup || undefined
			});
		} catch (err) {
			console.error('[ExercisePicker] Load failed:', err);
			exercises = [];
		} finally {
			loading = false;
		}
	}

	// Load exercises when drawer opens
	$effect(() => {
		if (open) {
			searchQuery = '';
			selectedMuscleGroup = null;
			selectedExerciseId = null;
			loadExercises('', null);
		}
	});

	// React to debounced search changes
	$effect(() => {
		const search = debouncedSearch.current;
		if (open) {
			loadExercises(search, selectedMuscleGroup);
		}
	});

	function toggleMuscleGroup(group: MuscleGroup) {
		selectedMuscleGroup = selectedMuscleGroup === group ? null : group;
		loadExercises(debouncedSearch.current, selectedMuscleGroup);
	}

	function handleSelect(exercise: Exercise) {
		selectedExerciseId = exercise.id;
		onselect(exercise);
		open = false;
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_picker_title()}</Drawer.Title>
		</Drawer.Header>
		<div class="space-y-3 px-4 pb-4">
			<!-- Search input -->
			<div class="relative">
				<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					type="text"
					placeholder={m.programs_picker_search_placeholder()}
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<!-- Muscle group filter -->
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

			<!-- Exercise list -->
			<div class="max-h-[40vh] overflow-y-auto">
				{#if loading}
					<div class="flex items-center justify-center py-8">
						<Loader2 class="text-muted-foreground size-6 animate-spin" />
					</div>
				{:else if exercises.length === 0}
					<div class="flex flex-col items-center py-8">
						<SearchX class="text-muted-foreground size-8" />
						<p class="text-muted-foreground mt-2 text-sm">{m.exercises_empty_title()}</p>
					</div>
				{:else}
					<div class="space-y-1.5">
						{#each exercises as exercise (exercise.id)}
							<button
								type="button"
								class="w-full text-left"
								onclick={() => handleSelect(exercise)}
							>
								<Card class="transition-colors active:bg-muted/50 {selectedExerciseId === exercise.id ? 'border-primary' : ''}">
									<CardContent class="flex items-center gap-3 p-3">
										<div class="min-w-0 flex-1">
											<h3 class="truncate text-sm font-medium">{exercise.name}</h3>
											<div class="mt-1 flex flex-wrap gap-1.5">
												<Badge variant="secondary" class="text-xs">
													{getMuscleGroupLabel(exercise.muscle_group)}
												</Badge>
												<Badge variant="outline" class="text-xs">
													{getEquipmentLabel(exercise.equipment)}
												</Badge>
											</div>
										</div>
										{#if selectedExerciseId === exercise.id}
											<Check class="text-primary size-4 shrink-0" />
										{/if}
									</CardContent>
								</Card>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>
