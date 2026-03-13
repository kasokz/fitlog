<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
	import * as Chart from '@repo/ui/components/ui/chart';
	import type { ChartConfig } from '@repo/ui/components/ui/chart';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart, ChartClipPath } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { cubicInOut } from 'svelte/easing';
	import { BarChart3 } from '@lucide/svelte';

	import type { VolumeChartPoint } from '$lib/services/analytics/dashboardData.js';

	interface Props {
		data: VolumeChartPoint[];
	}

	let { data }: Props = $props();

	const chartConfig: ChartConfig = {
		totalVolume: { label: m.analytics_volume_label(), color: 'var(--chart-2)' }
	};
</script>

<Card>
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<BarChart3 class="size-4" />
			{m.analytics_volume_title()}
		</CardTitle>
		<CardDescription>{m.analytics_volume_description()}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if data.length === 0}
			<div class="flex h-[200px] items-center justify-center">
				<p class="text-muted-foreground text-sm">{m.analytics_volume_empty()}</p>
			</div>
		{:else}
			<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
				<AreaChart
					data={data}
					x="date"
					xScale={scaleUtc()}
					series={[
						{
							key: 'totalVolume',
							label: m.analytics_volume_label(),
							color: chartConfig.totalVolume.color
						}
					]}
					props={{
						area: {
							curve: curveNatural,
							'fill-opacity': 0.4,
							line: { class: 'stroke-1' },
							motion: 'tween'
						},
						xAxis: {
							format: (v: Date) => {
								return v.toLocaleDateString('de-DE', {
									month: 'short',
									day: 'numeric'
								});
							}
						},
						yAxis: { format: () => '' }
					}}
				>
					{#snippet marks({ series: seriesList, getAreaProps })}
						<defs>
							<linearGradient id="fillVolume" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stop-color="var(--color-totalVolume)"
									stop-opacity={0.8}
								/>
								<stop
									offset="95%"
									stop-color="var(--color-totalVolume)"
									stop-opacity={0.1}
								/>
							</linearGradient>
						</defs>
						<ChartClipPath
							initialWidth={0}
							motion={{
								width: { type: 'tween', duration: 1000, easing: cubicInOut }
							}}
						>
							{#each seriesList as s, i (s.key)}
								<Area
									{...getAreaProps(s, i)}
									fill="url(#fillVolume)"
								/>
							{/each}
						</ChartClipPath>
					{/snippet}
					{#snippet tooltip()}
						<Chart.Tooltip hideLabel />
					{/snippet}
				</AreaChart>
			</Chart.Container>
		{/if}
	</CardContent>
</Card>
