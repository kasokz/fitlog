<script lang="ts">
	import { useInterval } from 'runed';
	import { Timer } from '@lucide/svelte';

	interface Props {
		startedAt: string;
	}

	const { startedAt }: Props = $props();

	let displayTime = $state('00:00');

	function formatElapsed(ms: number): string {
		const totalSeconds = Math.max(0, Math.floor(ms / 1000));
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const mm = String(minutes).padStart(2, '0');
		const ss = String(seconds).padStart(2, '0');

		if (hours > 0) {
			return `${hours}:${mm}:${ss}`;
		}
		return `${mm}:${ss}`;
	}

	function updateDisplay(): void {
		const elapsed = Date.now() - Date.parse(startedAt);
		displayTime = formatElapsed(elapsed);
	}

	// Initial calculation
	updateDisplay();

	// Tick every second — recalculates from timestamp so backgrounding is accurate
	useInterval(1000, {
		immediate: true,
		callback: () => updateDisplay()
	});
</script>

<div class="flex items-center gap-1.5 text-sm font-mono tabular-nums">
	<Timer class="size-4 text-muted-foreground" />
	<span>{displayTime}</span>
</div>
