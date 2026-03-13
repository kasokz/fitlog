<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as Tabs from '@repo/ui/components/ui/tabs';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, BarChart3, AlertTriangle } from '@lucide/svelte';

	import {
		getExercisesWithHistory,
		getStrengthChartData,
		getVolumeChartData,
		getBodyWeightChartData,
		getTrainingFrequency,
		type StrengthChartPoint,
		type VolumeChartPoint,
		type BodyWeightChartPoint,
		type TrainingFrequencyData,
		type ExerciseOption
	} from '$lib/services/analytics/dashboardData.js';

	import { isPremiumUser } from '$lib/services/premium.js';
	import ExercisePickerSelect from '$lib/components/analytics/ExercisePickerSelect.svelte';
	import TimeRangeSelect from '$lib/components/analytics/TimeRangeSelect.svelte';
	import StrengthChart from '$lib/components/analytics/StrengthChart.svelte';
	import VolumeChart from '$lib/components/analytics/VolumeChart.svelte';
	import BodyWeightChart from '$lib/components/analytics/BodyWeightChart.svelte';
	import FrequencySummary from '$lib/components/analytics/FrequencySummary.svelte';
	import UpgradePrompt from '$lib/components/premium/UpgradePrompt.svelte';
	import PaywallDrawer from '$lib/components/premium/PaywallDrawer.svelte';

	// ── State ──

	let premium = $state(false);
	let exercises: ExerciseOption[] = $state([]);
	let selectedExerciseId: string = $state('');
	let timeRange: string = $state('90d');
	let activeTab: string = $state('strength');

	let loading = $state(true);
	let dataLoading = $state(false);
	let error = $state<string | null>(null);
	let paywallOpen = $state(false);

	// Chart data
	let strengthData: StrengthChartPoint[] = $state([]);
	let volumeData: VolumeChartPoint[] = $state([]);
	let bodyWeightData: BodyWeightChartPoint[] = $state([]);
	let frequencyData: TrainingFrequencyData = $state({ totalSessions: 0, avgPerWeek: 0 });

	// ── Helpers ──

	function computeDateRange(range: string): { start: string; end: string } {
		const now = new Date();
		const end = formatLocalDate(now);

		let daysBack = 90;
		if (range === '7d') daysBack = 7;
		else if (range === '30d') daysBack = 30;

		const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
		const start = formatLocalDate(startDate);

		return { start, end };
	}

	function formatLocalDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// ── Init: check premium status, then load exercises ──

	$effect(() => {
		initDashboard();
	});

	async function initDashboard() {
		try {
			premium = await isPremiumUser();
			console.log(`[Dashboard] premium: ${premium}`);
		} catch (err) {
			console.error('[Dashboard] Failed to check premium status, defaulting to free:', err);
			premium = false;
		}

		// Free users are forced to 30d time range
		if (!premium) {
			timeRange = '30d';
		}

		await loadExercises();
	}

	async function loadExercises() {
		try {
			exercises = await getExercisesWithHistory();
			if (exercises.length > 0 && !selectedExerciseId) {
				selectedExerciseId = exercises[0].id;
			}
		} catch (err) {
			console.error('[Dashboard] Failed to load exercises:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	// ── Reactive data loading ──

	$effect(() => {
		// Track reactive dependencies
		const exerciseId = selectedExerciseId;
		const range = timeRange;

		if (!exerciseId && exercises.length > 0) return;

		loadChartData(exerciseId, range);
	});

	async function loadChartData(exerciseId: string, range: string) {
		dataLoading = true;
		error = null;

		try {
			const dateRange = computeDateRange(range);

			const [strength, volume, bodyWeight, frequency] = await Promise.all([
				exerciseId ? getStrengthChartData(exerciseId, dateRange) : Promise.resolve([]),
				exerciseId ? getVolumeChartData(exerciseId, dateRange) : Promise.resolve([]),
				getBodyWeightChartData(dateRange),
				getTrainingFrequency(dateRange)
			]);

			strengthData = strength;
			volumeData = volume;
			bodyWeightData = bodyWeight;
			frequencyData = frequency;
		} catch (err) {
			console.error('[Dashboard] Failed to load chart data:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			dataLoading = false;
		}
	}

	// ── Post-purchase ──

	async function handlePurchaseComplete() {
		console.log('[Dashboard] Purchase complete — re-checking premium status');
		premium = await isPremiumUser();
	}

	// ── Derived ──

	const selectedExerciseName = $derived(
		exercises.find((e) => e.id === selectedExerciseId)?.name ?? ''
	);
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4 flex items-center gap-3">
		<Button
			variant="ghost"
			size="sm"
			class="border-border -ml-2 border-2 shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => goto('/history')}
		>
			<ArrowLeft class="size-4" />
		</Button>
		<h1 class="text-2xl font-bold">{m.analytics_dashboard_title()}</h1>
	</div>

	<!-- Initial loading -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.analytics_dashboard_loading()}</p>
		</div>

	<!-- Error state -->
	{:else if error && !dataLoading}
		<Empty>
			<EmptyMedia variant="icon">
				<AlertTriangle />
			</EmptyMedia>
			<EmptyTitle>{m.analytics_dashboard_error()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>

	<!-- Global empty state: no exercises with workout data -->
	{:else if exercises.length === 0}
		<Empty>
			<EmptyMedia variant="icon">
				<BarChart3 />
			</EmptyMedia>
			<EmptyTitle>{m.analytics_dashboard_empty_title()}</EmptyTitle>
			<EmptyDescription>{m.analytics_dashboard_empty_description()}</EmptyDescription>
		</Empty>

	<!-- Dashboard content -->
	{:else}
		<!-- Controls -->
		<div class="mb-4 flex gap-2">
			<div class="flex-1">
				<ExercisePickerSelect {exercises} bind:value={selectedExerciseId} />
			</div>
			<TimeRangeSelect bind:value={timeRange} restrictTo30d={!premium} />
		</div>

		<!-- Data loading overlay -->
		{#if dataLoading}
			<div class="flex flex-col items-center justify-center py-16">
				<Loader2 class="text-muted-foreground size-8 animate-spin" />
				<p class="text-muted-foreground mt-2 text-sm">{m.analytics_dashboard_loading()}</p>
			</div>
		{:else}
			<!-- Tabs -->
			<Tabs.Root bind:value={activeTab}>
				<Tabs.List class="mb-4 w-full">
					<Tabs.Trigger value="strength">{m.analytics_tab_strength()}</Tabs.Trigger>
					{#if premium}
						<Tabs.Trigger value="volume">{m.analytics_tab_volume()}</Tabs.Trigger>
						<Tabs.Trigger value="bodyweight">{m.analytics_tab_bodyweight()}</Tabs.Trigger>
					{/if}
					<Tabs.Trigger value="frequency">{m.analytics_tab_frequency()}</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="strength">
					<StrengthChart data={strengthData} exerciseName={selectedExerciseName} />
				</Tabs.Content>

				{#if premium}
					<Tabs.Content value="volume">
						<VolumeChart data={volumeData} />
					</Tabs.Content>

					<Tabs.Content value="bodyweight">
						<BodyWeightChart data={bodyWeightData} />
					</Tabs.Content>
				{/if}

				<Tabs.Content value="frequency">
					<FrequencySummary
						totalSessions={frequencyData.totalSessions}
						avgPerWeek={frequencyData.avgPerWeek}
					/>
				</Tabs.Content>
			</Tabs.Root>

			{#if !premium}
				<div class="mt-4">
					<UpgradePrompt feature="full_charts" onupgrade={() => paywallOpen = true} />
				</div>
			{/if}
		{/if}
	{/if}
</section>

<PaywallDrawer bind:open={paywallOpen} onpurchasecomplete={handlePurchaseComplete} />
