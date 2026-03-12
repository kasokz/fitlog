<script lang="ts">
	import { Debounced } from 'runed';
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { SearchX, Loader2, Plus } from '@lucide/svelte';

	import { getDb } from '$lib/db/database.js';
	import { ExerciseRepository } from '$lib/db/repositories/exercise.js';
	import type { Exercise, MuscleGroup, Equipment } from '$lib/types/exercise.js';

	import ExerciseCard from '$lib/components/exercises/ExerciseCard.svelte';
	import ExerciseFilters from '$lib/components/exercises/ExerciseFilters.svelte';
	import ExerciseDetail from '$lib/components/exercises/ExerciseDetail.svelte';
	import ExerciseForm from '$lib/components/exercises/ExerciseForm.svelte';

	// ── State ──

	let exercises: Exercise[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let searchQuery = $state('');
	let selectedMuscleGroup = $state<MuscleGroup | null>(null);
	let selectedEquipment = $state<Equipment | null>(null);

	let selectedExercise = $state<Exercise | null>(null);
	let detailOpen = $state(false);

	let createDrawerOpen = $state(false);

	// Debounced search — only triggers re-query after 300ms of no typing
	const debouncedSearch = new Debounced(() => searchQuery, 300);

	// ── Data loading ──

	async function loadExercises(search: string, muscleGroup: MuscleGroup | null, equipment: Equipment | null) {
		try {
			exercises = await ExerciseRepository.combinedFilter({
				search: search || undefined,
				muscleGroup: muscleGroup || undefined,
				equipment: equipment || undefined
			});
		} catch (err) {
			console.error('[Exercises] Load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ── Init DB + load on mount ──

	$effect(() => {
		(async () => {
			try {
				await getDb();
				await loadExercises('', null, null);
			} catch (err) {
				console.error('[Exercises] Init failed:', err);
				error = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		})();
	});

	// ── React to debounced search changes ──

	$effect(() => {
		const search = debouncedSearch.current;
		if (!loading) {
			loadExercises(search, selectedMuscleGroup, selectedEquipment);
		}
	});

	// ── Handlers ──

	function handleFilterChange(filters: { search: string; muscleGroup: MuscleGroup | null; equipment: Equipment | null }) {
		selectedMuscleGroup = filters.muscleGroup;
		selectedEquipment = filters.equipment;
		// Search is handled by debounced effect, but if filters changed, reload immediately
		loadExercises(debouncedSearch.current, filters.muscleGroup, filters.equipment);
	}

	function openDetail(exercise: Exercise) {
		selectedExercise = exercise;
		detailOpen = true;
	}

	function closeDetail() {
		detailOpen = false;
		selectedExercise = null;
	}

	function handleExerciseCreated() {
		createDrawerOpen = false;
		// Refresh the list with current filters
		loadExercises(debouncedSearch.current, selectedMuscleGroup, selectedEquipment);
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{m.exercises_title()}</h1>
		{#if !loading && !error}
			<span class="text-muted-foreground text-sm">
				{m.exercises_count({ count: exercises.length })}
			</span>
		{/if}
	</div>

	<!-- Filters -->
	{#if !loading && !error}
		<div class="mb-4">
			<ExerciseFilters
				bind:searchQuery
				bind:selectedMuscleGroup
				bind:selectedEquipment
				onchange={handleFilterChange}
			/>
		</div>
	{/if}

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.exercises_loading()}</p>
		</div>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.exercises_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if exercises.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.exercises_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.exercises_empty_description()}</EmptyDescription>
		</Empty>
	{:else}
		<div class="space-y-2">
			{#each exercises as exercise (exercise.id)}
				<ExerciseCard {exercise} onclick={() => openDetail(exercise)} />
			{/each}
		</div>
	{/if}
</section>

<!-- FAB: Create Exercise -->
{#if !loading && !error}
	<div class="fixed right-4 bottom-6 z-50">
		<Button
			size="lg"
			class="shadow-lg"
			onclick={() => { createDrawerOpen = true; }}
		>
			<Plus class="mr-2 size-5" />
			{m.exercises_create_button()}
		</Button>
	</div>
{/if}

<!-- Detail Drawer -->
<ExerciseDetail
	exercise={selectedExercise}
	bind:open={detailOpen}
	onclose={closeDetail}
/>

<!-- Create Exercise Drawer -->
<Drawer.Root bind:open={createDrawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.exercises_form_title()}</Drawer.Title>
			<Drawer.Description>{m.exercises_form_description()}</Drawer.Description>
		</Drawer.Header>
		<ExerciseForm oncreated={handleExerciseCreated} />
	</Drawer.Content>
</Drawer.Root>
