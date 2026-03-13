<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Weight, Repeat, TrendingUp, Loader2 } from '@lucide/svelte';
	import { getPRHistory } from '$lib/services/analytics/prDetector.js';
	import type { PR } from '$lib/types/analytics.js';

	interface Props {
		exerciseId: string;
	}

	const { exerciseId }: Props = $props();

	type PRType = 'weight_pr' | 'rep_pr' | 'e1rm_pr';

	let loading = $state(true);
	let currentBests = $state<Map<PRType, PR>>(new Map());

	$effect(() => {
		// Re-run when exerciseId changes
		const id = exerciseId;
		loading = true;
		currentBests = new Map();

		getPRHistory(id)
			.then((prs) => {
				// Compute current best per category (last occurrence = current record)
				const bests = new Map<PRType, PR>();
				for (const pr of prs) {
					bests.set(pr.type, pr);
				}
				currentBests = bests;
			})
			.catch((err) => {
				console.error('[PRDetail] Failed to load PRs for exercise', id, err);
				// Silently show empty state — PRs are supplementary
			})
			.finally(() => {
				loading = false;
			});
	});

	const CATEGORY_ORDER: PRType[] = ['weight_pr', 'rep_pr', 'e1rm_pr'];

	function prTypeLabel(type: PRType): string {
		switch (type) {
			case 'weight_pr':
				return m.pr_detail_weight_pr();
			case 'rep_pr':
				return m.pr_detail_rep_pr();
			case 'e1rm_pr':
				return m.pr_detail_e1rm_pr();
		}
	}

	function prValueFormatted(pr: PR): string {
		switch (pr.type) {
			case 'weight_pr':
				return m.pr_detail_kg_value({ value: String(pr.value) });
			case 'rep_pr':
				return m.pr_detail_reps_value({ value: String(pr.value) });
			case 'e1rm_pr':
				return m.pr_detail_e1rm_value({ value: String(Math.round(pr.value)) });
		}
	}

	function prContextInfo(pr: PR): string | null {
		switch (pr.type) {
			case 'weight_pr':
				// Weight PR: show reps context
				return pr.reps > 0
					? m.pr_detail_reps_value({ value: String(pr.reps) })
					: null;
			case 'rep_pr':
				// Rep PR: show weight context
				return pr.weight > 0
					? m.pr_detail_at_weight({ weight: String(pr.weight) })
					: null;
			case 'e1rm_pr':
				// e1RM PR: no extra context needed (value already shows ~kg)
				return null;
		}
	}

	function prTypeIcon(type: PRType) {
		switch (type) {
			case 'weight_pr':
				return Weight;
			case 'rep_pr':
				return Repeat;
			case 'e1rm_pr':
				return TrendingUp;
		}
	}
</script>

<div class="space-y-2">
	<p class="text-muted-foreground text-xs font-medium">
		{m.pr_detail_title()}
	</p>

	{#if loading}
		<div class="flex items-center gap-2 py-1">
			<Loader2 class="text-muted-foreground size-4 animate-spin" />
			<span class="text-muted-foreground text-xs">{m.pr_detail_loading()}</span>
		</div>
	{:else if currentBests.size === 0}
		<p class="text-muted-foreground text-xs italic">
			{m.pr_detail_no_records()}
		</p>
	{:else}
		<div class="space-y-1.5">
			{#each CATEGORY_ORDER as type (type)}
				{@const pr = currentBests.get(type)}
				{#if pr}
					{@const Icon = prTypeIcon(type)}
					{@const context = prContextInfo(pr)}
					<div class="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5">
						<Icon class="text-muted-foreground size-3.5 shrink-0" />
						<Badge variant="outline" class="text-xs">
							{prTypeLabel(type)}
						</Badge>
						<span class="font-mono text-xs font-semibold">{prValueFormatted(pr)}</span>
						{#if context}
							<span class="text-muted-foreground text-xs">{context}</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
