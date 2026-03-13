<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger
	} from '@repo/ui/components/ui/collapsible';
	import { Weight, Repeat, TrendingUp, ChevronDown } from '@lucide/svelte';
	import type { PR } from '$lib/types/analytics.js';
	import { getBcp47Locale } from '$lib/utils/locale.js';

	interface Props {
		exerciseName: string;
		prs: PR[];
	}

	const { exerciseName, prs }: Props = $props();

	let expanded = $state(false);

	// ── Date formatting ──

	const dateFormatter = new Intl.DateTimeFormat(getBcp47Locale(), {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});

	function formatDate(dateStr: string): string {
		if (!dateStr) return '';
		return dateFormatter.format(new Date(dateStr));
	}

	// ── Current bests: last (most recent) PR of each type ──

	type PRType = 'weight_pr' | 'rep_pr' | 'e1rm_pr';

	const currentBests = $derived(() => {
		const bests = new Map<PRType, PR>();
		// prs are chronological — iterate forward, last one wins
		for (const pr of prs) {
			bests.set(pr.type, pr);
		}
		return bests;
	});

	// ── Helpers ──

	function prTypeLabel(type: PRType): string {
		switch (type) {
			case 'weight_pr':
				return m.pr_history_weight_pr();
			case 'rep_pr':
				return m.pr_history_rep_pr();
			case 'e1rm_pr':
				return m.pr_history_e1rm_pr();
		}
	}

	function prValueFormatted(pr: PR): string {
		switch (pr.type) {
			case 'weight_pr':
				return m.pr_history_kg_value({ value: String(pr.value) });
			case 'rep_pr':
				return m.pr_history_reps_value({ value: String(pr.value) });
			case 'e1rm_pr':
				return m.pr_history_e1rm_value({ value: String(Math.round(pr.value)) });
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

	/** Category display order */
	const CATEGORY_ORDER: PRType[] = ['weight_pr', 'rep_pr', 'e1rm_pr'];
</script>

<Card class="border-border border-2 shadow-md">
	<CardContent class="p-3">
		<!-- Exercise name -->
		<h3 class="mb-2 text-sm font-bold">{exerciseName}</h3>

		<!-- Current bests row -->
		<div class="mb-2 flex flex-wrap gap-1.5">
			{#each CATEGORY_ORDER as type (type)}
				{@const best = currentBests().get(type)}
				{#if best}
					{@const Icon = prTypeIcon(type)}
					<Badge variant="secondary" class="text-xs">
						<Icon class="mr-1 size-3" />
						<span class="font-mono">{prValueFormatted(best)}</span>
					</Badge>
				{/if}
			{/each}
		</div>

		<!-- Collapsible timeline -->
		<Collapsible bind:open={expanded}>
			<CollapsibleTrigger
				class="text-muted-foreground hover:bg-accent flex h-7 w-full items-center justify-between rounded-md px-1 text-xs"
			>
				<span>{m.pr_history_show_all()}</span>
				<ChevronDown
					class="size-3.5 transition-transform duration-200 {expanded
						? 'rotate-180'
						: ''}"
				/>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div class="mt-2 space-y-1.5">
					{#each [...prs].reverse() as pr (pr.id)}
						<div class="bg-muted/50 flex items-center justify-between rounded-md px-2 py-1.5">
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="text-xs">
									{prTypeLabel(pr.type)}
								</Badge>
								<span class="font-mono text-xs font-semibold">{prValueFormatted(pr)}</span>
							</div>
							{#if pr.date}
								<span class="text-muted-foreground text-xs">{m.pr_history_date_label({ date: formatDate(pr.date) })}</span>
							{/if}
						</div>
					{/each}
				</div>
			</CollapsibleContent>
		</Collapsible>
	</CardContent>
</Card>
