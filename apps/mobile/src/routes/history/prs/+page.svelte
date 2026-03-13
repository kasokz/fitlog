<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, Trophy, AlertTriangle } from '@lucide/svelte';

	import {
		getExercisesWithHistory,
		type ExerciseOption
	} from '$lib/services/analytics/dashboardData.js';
	import { getPRHistory } from '$lib/services/analytics/prDetector.js';
	import type { PR } from '$lib/types/analytics.js';

	import { isPremiumUser } from '$lib/services/premium.js';
	import PRHistoryCard from '$lib/components/history/PRHistoryCard.svelte';
	import UpgradePrompt from '$lib/components/premium/UpgradePrompt.svelte';

	// ── Types ──

	interface ExercisePRGroup {
		exerciseName: string;
		prs: PR[];
	}

	// ── Constants ──

	const FREE_EXERCISE_LIMIT = 3;

	// ── State ──

	let premium = $state(false);
	let allGroups: ExercisePRGroup[] = $state([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// ── Derived ──

	const groups = $derived(
		premium ? allGroups : allGroups.slice(0, FREE_EXERCISE_LIMIT)
	);

	const hasMoreGroups = $derived(!premium && allGroups.length > FREE_EXERCISE_LIMIT);

	// ── Data loading ──

	async function loadPRHistory() {
		try {
			premium = await isPremiumUser();
			console.log(`[PRHistory] premium: ${premium}`);
		} catch (err) {
			console.error('[PRHistory] Failed to check premium status, defaulting to free:', err);
			premium = false;
		}

		try {
			const exercises: ExerciseOption[] = await getExercisesWithHistory();

			if (exercises.length === 0) {
				allGroups = [];
				return;
			}

			// Load PR history for all exercises in parallel
			const results = await Promise.all(
				exercises.map(async (exercise) => {
					try {
						const prs = await getPRHistory(exercise.id);
						return { exerciseName: exercise.name, prs };
					} catch (err) {
						console.warn(`[PRHistory] Failed to load PRs for exercise ${exercise.name}:`, err);
						return { exerciseName: exercise.name, prs: [] };
					}
				})
			);

			// Filter out exercises with no PRs
			allGroups = results.filter((group) => group.prs.length > 0);
		} catch (err) {
			console.error('[PRHistory] Load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// ── Init ──

	$effect(() => {
		loadPRHistory();
	});
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center gap-3">
		<Button
			variant="ghost"
			size="sm"
			class="border-border -ml-2 border-2 shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => history.back()}
		>
			<ArrowLeft class="size-4" />
		</Button>
		<h1 class="text-2xl font-bold">{m.pr_history_title()}</h1>
	</div>

	<!-- Loading -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.pr_history_loading()}</p>
		</div>

	<!-- Error -->
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<AlertTriangle />
			</EmptyMedia>
			<EmptyTitle>{m.pr_history_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>

	<!-- Empty state -->
	{:else if groups.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<Trophy />
			</EmptyMedia>
			<EmptyTitle>{m.pr_history_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.pr_history_empty_description()}</EmptyDescription>
		</Empty>

	<!-- PR history cards -->
	{:else}
		<div class="space-y-3">
			{#each groups as group (group.exerciseName)}
				<PRHistoryCard exerciseName={group.exerciseName} prs={group.prs} />
			{/each}
		</div>

		{#if hasMoreGroups}
			<div class="mt-4">
				<UpgradePrompt feature="extended_history" />
			</div>
		{/if}
	{/if}
</section>
