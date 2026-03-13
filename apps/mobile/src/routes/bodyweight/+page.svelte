<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, Scale, Plus } from '@lucide/svelte';

	import { getDb } from '$lib/db/database.js';
	import { BodyWeightRepository } from '$lib/db/repositories/bodyweight.js';
	import type { BodyWeightEntry } from '$lib/types/bodyweight.js';

	import BodyWeightForm from '$lib/components/bodyweight/BodyWeightForm.svelte';
	import BodyWeightList from '$lib/components/bodyweight/BodyWeightList.svelte';

	// ── State ──

	let entries: BodyWeightEntry[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let drawerOpen = $state(false);

	// ── Data loading ──

	async function loadEntries() {
		try {
			entries = await BodyWeightRepository.getAll();
		} catch (err) {
			console.error('[BodyWeight] Load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ── Init DB + load on mount ──

	$effect(() => {
		(async () => {
			try {
				await getDb();
				await loadEntries();
			} catch (err) {
				console.error('[BodyWeight] Init failed:', err);
				error = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		})();
	});

	// ── Handlers ──

	function handleSaved() {
		drawerOpen = false;
		loadEntries();
	}

	async function handleDelete(id: string) {
		try {
			await BodyWeightRepository.deleteEntry(id);
			toast.success(m.bodyweight_delete_success());
			await loadEntries();
		} catch (err) {
			console.error('[BodyWeight] Delete failed:', err);
			toast.error(m.bodyweight_delete_error());
		}
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4">
		<Button
			variant="ghost"
			size="sm"
			class="-ml-2"
			onclick={() => goto('/')}
		>
			<ArrowLeft class="mr-1 size-4" />
			{m.bodyweight_back()}
		</Button>
		<h1 class="mt-2 text-2xl font-bold">{m.bodyweight_title()}</h1>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.bodyweight_loading()}</p>
		</div>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<Scale />
			</EmptyMedia>
			<EmptyTitle>{m.bodyweight_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if entries.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<Scale />
			</EmptyMedia>
			<EmptyTitle>{m.bodyweight_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.bodyweight_empty_description()}</EmptyDescription>
		</Empty>
	{:else}
		<BodyWeightList {entries} ondelete={handleDelete} />
	{/if}
</section>

<!-- FAB: Add Weight -->
{#if !loading && !error}
	<div class="fixed right-4 bottom-6 z-50">
		<Button
			size="lg"
			class="shadow-lg"
			onclick={() => { drawerOpen = true; }}
		>
			<Plus class="mr-2 size-5" />
			{m.bodyweight_add()}
		</Button>
	</div>
{/if}

<!-- Add Weight Drawer -->
<Drawer.Root bind:open={drawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.bodyweight_form_title()}</Drawer.Title>
			<Drawer.Description>{m.bodyweight_form_description()}</Drawer.Description>
		</Drawer.Header>
		<BodyWeightForm onsaved={handleSaved} />
	</Drawer.Content>
</Drawer.Root>
