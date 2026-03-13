<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';

	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, SearchX, AlertTriangle } from '@lucide/svelte';

	import { getDb } from '$lib/db/database.js';
	import { WorkoutRepository } from '$lib/db/repositories/workout.js';
	import type { SessionDetailWithNames } from '$lib/types/workout.js';

	import SessionDetail from '$lib/components/history/SessionDetail.svelte';

	// ── State ──

	let loading = $state(true);
	let error = $state<string | null>(null);
	let notFound = $state(false);
	let session = $state<SessionDetailWithNames | null>(null);
	let trainingDayName = $state('');

	const sessionId = $derived(page.params.sessionId as string);

	// ── Data loading ──

	async function loadDetail() {
		try {
			await getDb();

			const detail = await WorkoutRepository.getSessionDetail(sessionId);
			if (!detail) {
				notFound = true;
				return;
			}

			session = detail;

			// Resolve training day name
			const { ProgramRepository } = await import('$lib/db/repositories/program.js');
			const program = await ProgramRepository.getById(detail.program_id);
			if (program) {
				const day = program.trainingDays.find((d) => d.id === detail.training_day_id);
				trainingDayName = day?.name ?? m.history_detail_title();
			} else {
				trainingDayName = m.history_detail_title();
			}
		} catch (err) {
			console.error('[History] Detail load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// ── Init ──

	$effect(() => {
		loadDetail();
	});
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4">
		<Button
			variant="ghost"
			size="sm"
			class="-ml-2"
			onclick={() => goto('/history')}
		>
			<ArrowLeft class="mr-1 size-4" />
			{m.history_back()}
		</Button>
		{#if trainingDayName && !loading && !error && !notFound}
			<h1 class="mt-2 text-lg font-semibold">{trainingDayName}</h1>
		{:else}
			<h1 class="mt-2 text-lg font-semibold">{m.history_detail_title()}</h1>
		{/if}
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.history_detail_loading()}</p>
		</div>
	{:else if notFound}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.history_detail_not_found()}</EmptyTitle>
			<EmptyDescription>{m.history_detail_not_found_description()}</EmptyDescription>
		</Empty>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<AlertTriangle />
			</EmptyMedia>
			<EmptyTitle>{m.history_detail_not_found()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if session}
		<SessionDetail {session} />
	{/if}
</section>
