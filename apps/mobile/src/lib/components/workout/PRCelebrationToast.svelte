<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Trophy } from '@lucide/svelte';
	import type { EnrichedPR } from '$lib/services/analytics/sessionPRDetector.js';

	interface Props {
		prs: EnrichedPR[];
	}

	const { prs }: Props = $props();

	/** Group PRs by exercise name for compact display */
	const groupedPRs = $derived(() => {
		const map = new Map<string, EnrichedPR[]>();
		for (const pr of prs) {
			const existing = map.get(pr.exerciseName) ?? [];
			existing.push(pr);
			map.set(pr.exerciseName, existing);
		}
		return Array.from(map.entries());
	});

	/** Max exercises to show before "+N more" */
	const MAX_VISIBLE_EXERCISES = 3;

	const visibleGroups = $derived(groupedPRs().slice(0, MAX_VISIBLE_EXERCISES));
	const hiddenCount = $derived(Math.max(0, groupedPRs().length - MAX_VISIBLE_EXERCISES));

	const title = $derived(
		prs.length === 1
			? m.pr_celebration_title_singular()
			: m.pr_celebration_title_plural({ count: String(prs.length) })
	);

	function prTypeLabel(type: EnrichedPR['type']): string {
		switch (type) {
			case 'weight_pr':
				return m.pr_celebration_weight_pr();
			case 'rep_pr':
				return m.pr_celebration_rep_pr();
			case 'e1rm_pr':
				return m.pr_celebration_e1rm_pr();
		}
	}

	function prValueLabel(pr: EnrichedPR): string {
		switch (pr.type) {
			case 'weight_pr':
				return m.pr_celebration_value_kg({ value: String(pr.value) });
			case 'rep_pr':
				return m.pr_celebration_value_reps({ value: String(pr.value) });
			case 'e1rm_pr':
				return m.pr_celebration_value_e1rm({ value: String(Math.round(pr.value)) });
		}
	}
</script>

<div
	class="bg-card text-card-foreground border-border w-full rounded-lg border-2 p-4 shadow-lg"
>
	<!-- Header -->
	<div class="mb-3 flex items-center gap-2">
		<div class="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full">
			<Trophy class="size-5" />
		</div>
		<h3 class="text-base font-bold">{title}</h3>
	</div>

	<!-- PR list grouped by exercise -->
	<div class="space-y-2">
		{#each visibleGroups as [exerciseName, exercisePRs] (exerciseName)}
			<div>
				<p class="mb-1 text-sm font-semibold">{exerciseName}</p>
				<div class="flex flex-wrap gap-1.5">
					{#each exercisePRs as pr (pr.id)}
						<Badge variant="secondary" class="text-xs">
							{prTypeLabel(pr.type)}: {prValueLabel(pr)}
						</Badge>
					{/each}
				</div>
			</div>
		{/each}

		{#if hiddenCount > 0}
			<p class="text-muted-foreground text-xs">
				{m.pr_celebration_more({ count: String(hiddenCount) })}
			</p>
		{/if}
	</div>
</div>
