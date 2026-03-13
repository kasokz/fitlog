<script lang="ts">
	import { useInterval } from 'runed';
	import { m } from '$lib/paraglide/messages.js';
	import { Button } from '@repo/ui/components/ui/button';
	import { Play, Pause, RotateCcw } from '@lucide/svelte';

	let elapsedSeconds = $state(0);
	let running = $state(false);

	const interval = useInterval(1000, {
		immediate: false,
		callback: () => {
			elapsedSeconds++;
		}
	});

	function formatTime(totalSeconds: number): string {
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}

	function handleStartPause() {
		if (running) {
			interval.pause();
			running = false;
		} else {
			interval.resume();
			running = true;
		}
	}

	function handleReset() {
		interval.pause();
		interval.reset();
		elapsedSeconds = 0;
		running = false;
	}
</script>

<div class="bg-card border-t flex items-center justify-between px-4 py-3">
	<div class="flex items-center gap-2">
		<span class="text-muted-foreground text-xs font-medium uppercase tracking-wide">
			{m.workout_rest_timer()}
		</span>
		<span class="font-mono text-lg font-semibold tabular-nums">
			{formatTime(elapsedSeconds)}
		</span>
	</div>
	<div class="flex items-center gap-2">
		<Button
			variant={running ? 'secondary' : 'default'}
			size="sm"
			onclick={handleStartPause}
		>
			{#if running}
				<Pause class="mr-1 size-3.5" />
				{m.workout_rest_timer_pause()}
			{:else}
				<Play class="mr-1 size-3.5" />
				{m.workout_rest_timer_start()}
			{/if}
		</Button>
		<Button
			variant="ghost"
			size="sm"
			onclick={handleReset}
			disabled={elapsedSeconds === 0 && !running}
		>
			<RotateCcw class="mr-1 size-3.5" />
			{m.workout_rest_timer_reset()}
		</Button>
	</div>
</div>
