<script lang="ts">
	import { Button } from '@repo/ui/components/ui/button';
	import { Minus, Plus } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { selectionChanged } from '$lib/services/haptics.js';

	interface Props {
		value: number;
		step?: number;
		min?: number;
		max?: number;
		format?: (value: number) => string;
		onchange?: (value: number) => void;
		disabled?: boolean;
	}

	let {
		value = $bindable(0),
		step = 1,
		min = 0,
		max,
		format,
		onchange,
		disabled = false
	}: Props = $props();

	// ── Long-press acceleration ──

	let intervalId: ReturnType<typeof setInterval> | null = $state(null);
	let timeoutId: ReturnType<typeof setTimeout> | null = $state(null);

	function increment() {
		const next = max !== undefined ? Math.min(value + step, max) : value + step;
		if (next !== value) {
			value = next;
			onchange?.(value);
			selectionChanged();
		}
	}

	function decrement() {
		const next = Math.max(value - step, min);
		if (next !== value) {
			value = next;
			onchange?.(value);
			selectionChanged();
		}
	}

	function startRepeat(action: () => void) {
		cleanup();
		timeoutId = setTimeout(() => {
			intervalId = setInterval(action, 100);
		}, 400);
	}

	function cleanup() {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	const displayValue = $derived(format ? format(value) : String(value));
	const atMin = $derived(value <= min);
	const atMax = $derived(max !== undefined && value >= max);
</script>

<div class="flex items-center gap-1">
	<Button
		variant="outline"
		size="sm"
		class="size-8 shrink-0 p-0"
		disabled={disabled || atMin}
		onclick={decrement}
		onpointerdown={() => startRepeat(decrement)}
		onpointerup={cleanup}
		onpointerleave={cleanup}
	>
		<Minus class="size-3.5" />
		<span class="sr-only">{m.workout_stepper_decrease()}</span>
	</Button>

	<span class="text-center text-sm font-medium tabular-nums min-w-[3ch]">
		{displayValue}
	</span>

	<Button
		variant="outline"
		size="sm"
		class="size-8 shrink-0 p-0"
		disabled={disabled || atMax}
		onclick={increment}
		onpointerdown={() => startRepeat(increment)}
		onpointerup={cleanup}
		onpointerleave={cleanup}
	>
		<Plus class="size-3.5" />
		<span class="sr-only">{m.workout_stepper_increase()}</span>
	</Button>
</div>
