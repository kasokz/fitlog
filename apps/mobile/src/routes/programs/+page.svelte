<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { SearchX, Loader2, Plus } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	import { getDb } from '$lib/db/database.js';
	import { ProgramRepository } from '$lib/db/repositories/program.js';
	import type { ProgramWithDays } from '$lib/types/program.js';

	import ProgramCard from '$lib/components/programs/ProgramCard.svelte';
	import ProgramForm from '$lib/components/programs/ProgramForm.svelte';

	// ── State ──

	let programs: ProgramWithDays[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let createDrawerOpen = $state(false);

	// ── Data loading ──

	async function loadPrograms() {
		try {
			programs = await ProgramRepository.getAllWithDays();
		} catch (err) {
			console.error('[Programs] Load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ── Init DB + load on mount ──

	$effect(() => {
		(async () => {
			try {
				await getDb();
				await loadPrograms();
			} catch (err) {
				console.error('[Programs] Init failed:', err);
				error = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		})();
	});

	// ── Handlers ──

	function handleProgramCreated() {
		createDrawerOpen = false;
		loadPrograms();
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{m.programs_title()}</h1>
		{#if !loading && !error}
			<span class="text-muted-foreground font-mono text-sm">
				{m.programs_count({ count: programs.length })}
			</span>
		{/if}
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.programs_loading()}</p>
		</div>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.programs_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if programs.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.programs_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.programs_empty_description()}</EmptyDescription>
		</Empty>
	{:else}
		<div class="space-y-2">
			{#each programs as program (program.id)}
				<ProgramCard {program} onclick={() => goto(`/programs/${program.id}`)} />
			{/each}
		</div>
	{/if}
</section>

<!-- FAB: Create Program -->
{#if !loading && !error}
	<div class="fixed right-4 bottom-24 z-50">
		<Button
			size="lg"
			class="border-2 border-border shadow-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => { createDrawerOpen = true; }}
		>
			<Plus class="mr-2 size-5" />
			{m.programs_create_button()}
		</Button>
	</div>
{/if}

<!-- Create Program Drawer -->
<Drawer.Root bind:open={createDrawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_form_title()}</Drawer.Title>
			<Drawer.Description>{m.programs_form_description()}</Drawer.Description>
		</Drawer.Header>
		<ProgramForm oncreated={handleProgramCreated} />
	</Drawer.Content>
</Drawer.Root>
