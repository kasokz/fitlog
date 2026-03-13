<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
	import * as Chart from '@repo/ui/components/ui/chart';
	import type { ChartConfig } from '@repo/ui/components/ui/chart';
	import { scaleUtc } from 'd3-scale';
	import { LineChart } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { TrendingUp } from '@lucide/svelte';

	import type { StrengthChartPoint } from '$lib/services/analytics/dashboardData.js';
	import { getBcp47Locale } from '$lib/utils/locale.js';

	interface Props {
		data: StrengthChartPoint[];
		exerciseName: string;
	}

	let { data, exerciseName }: Props = $props();

	const chartConfig: ChartConfig = {
		e1rm: { label: m.analytics_strength_e1rm_label(), color: 'var(--chart-1)' }
	};

	const series = [
		{
			key: 'e1rm',
			label: m.analytics_strength_e1rm_label(),
			color: 'var(--chart-1)'
		}
	];
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<TrendingUp class="size-4" />
			{exerciseName}
		</CardTitle>
		<CardDescription>{m.analytics_strength_description()}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if data.length === 0}
			<div class="flex h-[200px] items-center justify-center">
				<p class="text-muted-foreground text-sm">{m.analytics_strength_empty()}</p>
			</div>
		{:else}
			<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
				<LineChart
					data={data}
					x="date"
					xScale={scaleUtc()}
					axis="x"
					series={series}
					props={{
						spline: { curve: curveNatural, motion: 'tween', strokeWidth: 2 },
						xAxis: {
							format: (v: Date) => {
								return v.toLocaleDateString(getBcp47Locale(), {
									month: 'short',
									day: 'numeric'
								});
							}
						},
						highlight: { points: { r: 4 } }
					}}
				>
					{#snippet tooltip()}
						<Chart.Tooltip hideLabel />
					{/snippet}
				</LineChart>
			</Chart.Container>
		{/if}
	</CardContent>
</Card>
