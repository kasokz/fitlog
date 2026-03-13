<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import { Button } from '@repo/ui/components/ui/button';
	import { Loader2, CalendarX2, BarChart3 } from '@lucide/svelte';

	import { getDb } from '$lib/db/database.js';
	import { WorkoutRepository } from '$lib/db/repositories/workout.js';
	import type { CompletedSessionSummary } from '$lib/types/workout.js';

	import SessionCard from '$lib/components/history/SessionCard.svelte';

	// ── State ──

	let sessions: CompletedSessionSummary[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// ── Data loading ──

	async function loadSessions() {
		try {
			await getDb();
			sessions = await WorkoutRepository.getCompletedSessions();
		} catch (err) {
			console.error('[History] Load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// ── Init ──

	$effect(() => {
		loadSessions();
	});
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{m.history_title()}</h1>
		<Button
			variant="ghost"
			size="sm"
			class="border-border border-2 shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => goto('/history/analytics')}
		>
			<BarChart3 class="size-4" />
		</Button>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.history_loading()}</p>
		</div>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<CalendarX2 />
			</EmptyMedia>
			<EmptyTitle>{m.history_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if sessions.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<CalendarX2 />
			</EmptyMedia>
			<EmptyTitle>{m.history_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.history_empty_description()}</EmptyDescription>
		</Empty>
	{:else}
		<div class="space-y-2">
			{#each sessions as session (session.id)}
				<SessionCard {session} onclick={() => goto(`/history/${session.id}`)} />
			{/each}
		</div>
	{/if}
</section>
