<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
	import { CalendarDays } from '@lucide/svelte';

	interface Props {
		totalSessions: number;
		avgPerWeek: number;
	}

	let { totalSessions, avgPerWeek }: Props = $props();
</script>

{#if totalSessions === 0}
	<Card>
		<CardContent class="pt-6">
			<div class="flex h-[80px] items-center justify-center">
				<p class="text-muted-foreground text-sm">{m.analytics_frequency_empty()}</p>
			</div>
		</CardContent>
	</Card>
{:else}
	<div class="grid grid-cols-2 gap-4">
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="text-muted-foreground flex items-center gap-2 text-sm font-medium">
					<CalendarDays class="size-4" />
					{m.analytics_frequency_total_sessions()}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{totalSessions}</p>
			</CardContent>
		</Card>
		<Card>
			<CardHeader class="pb-2">
				<CardTitle class="text-muted-foreground text-sm font-medium">
					{m.analytics_frequency_avg_per_week()}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-2xl font-bold">{avgPerWeek.toFixed(1)}</p>
			</CardContent>
		</Card>
	</div>
{/if}
