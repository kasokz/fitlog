<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '@repo/ui/components/ui/card';
	import * as Chart from '@repo/ui/components/ui/chart';
	import type { ChartConfig } from '@repo/ui/components/ui/chart';
	import { scaleUtc } from 'd3-scale';
	import { LineChart } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { Weight } from '@lucide/svelte';

	import type { BodyWeightChartPoint } from '$lib/services/analytics/dashboardData.js';

	interface Props {
		data: BodyWeightChartPoint[];
	}

	let { data }: Props = $props();

	const chartConfig: ChartConfig = {
		weight: { label: m.analytics_bodyweight_label(), color: 'var(--chart-3)' }
	};

	const series = [
		{
			key: 'weight',
			label: m.analytics_bodyweight_label(),
			color: 'var(--chart-3)'
		}
	];
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Weight class="size-4" />
			{m.analytics_bodyweight_title()}
		</CardTitle>
		<CardDescription>{m.analytics_bodyweight_description()}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if data.length === 0}
			<div class="flex h-[200px] items-center justify-center">
				<p class="text-muted-foreground text-center text-sm">
					{m.analytics_bodyweight_empty()}
				</p>
			</div>
		{:else}
			<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
				<LineChart
					{data}
					x="date"
					xScale={scaleUtc()}
					axis="x"
					{series}
					props={{
						spline: { curve: curveNatural, motion: 'tween', strokeWidth: 2 },
						xAxis: {
							format: (v: Date) => {
								return v.toLocaleDateString('de-DE', {
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
