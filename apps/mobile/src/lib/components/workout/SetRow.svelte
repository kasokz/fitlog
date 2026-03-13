<script lang="ts">
	import { Button } from '@repo/ui/components/ui/button';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Check, X } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { impactMedium } from '$lib/services/haptics.js';

	import type { SetType } from '$lib/types/workout.js';

	import Stepper from './Stepper.svelte';
	import RirSelector from './RirSelector.svelte';

	// ── Working set shape (in-memory copy) ──

	export interface WorkingSet {
		id: string;
		exercise_id: string;
		assignment_id: string | null;
		set_number: number;
		set_type: SetType;
		weight: number | null;
		reps: number | null;
		rir: number | null;
		completed: boolean;
	}

	interface Props {
		set: WorkingSet;
		onconfirm: () => void;
		onremove: () => void;
	}

	let { set = $bindable(), onconfirm, onremove }: Props = $props();

	// ── Set type options ──

	const setTypes: { value: SetType; label: () => string }[] = [
		{ value: 'warmup', label: m.workout_set_type_warmup },
		{ value: 'working', label: m.workout_set_type_working },
		{ value: 'drop', label: m.workout_set_type_drop },
		{ value: 'failure', label: m.workout_set_type_failure }
	];

	function cycleSetType() {
		const idx = setTypes.findIndex((t) => t.value === set.set_type);
		const next = (idx + 1) % setTypes.length;
		set.set_type = setTypes[next].value;
	}

	function currentTypeLabel(): string {
		return setTypes.find((t) => t.value === set.set_type)?.label() ?? set.set_type;
	}

	// ── RIR value conversion ──
	// RIR is stored as number (0-10) but RirSelector uses string ('0'-'4', '5+')

	const rirDisplay = $derived(
		set.rir !== null && set.rir !== undefined
			? set.rir >= 5
				? '5+'
				: String(set.rir)
			: '2'
	);

	function handleRirChange(val: string) {
		set.rir = val === '5+' ? 5 : Number(val);
	}

	// ── Weight/reps null-safe accessors ──

	let weightValue = $derived(set.weight ?? 0);
	let repsValue = $derived(set.reps ?? 0);

	function handleWeightChange(val: number) {
		set.weight = val;
	}

	function handleRepsChange(val: number) {
		set.reps = val;
	}

	const isWarmup = $derived(set.set_type === 'warmup');
</script>

<div
	class="flex flex-col gap-2 rounded-lg border-2 border-border p-3 transition-colors {set.completed
		? 'bg-muted/50 opacity-75'
		: 'bg-card'}"
>
	<!-- Top row: set number, type badge, actions -->
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<span class="text-muted-foreground font-mono text-xs font-medium tabular-nums min-w-[2.5rem]">
				{m.workout_set_label({ number: set.set_number })}
			</span>
			<button
				type="button"
				class="cursor-pointer"
				onclick={cycleSetType}
				disabled={set.completed}
			>
				<Badge
					variant={set.set_type === 'working' ? 'default' : 'secondary'}
					class="border border-border text-xs font-bold select-none"
				>
					{currentTypeLabel()}
				</Badge>
			</button>
		</div>
		<div class="flex items-center gap-1">
			{#if !set.completed}
				<Button
					variant="ghost"
					size="sm"
					class="size-7 p-0 text-destructive hover:text-destructive"
					onclick={onremove}
				>
					<X class="size-3.5" />
					<span class="sr-only">{m.workout_remove_set()}</span>
				</Button>
			{/if}
			<Button
				variant={set.completed ? 'secondary' : 'default'}
				size="sm"
				class="size-7 p-0"
				onclick={() => { impactMedium(); onconfirm(); }}
			>
				<Check class="size-3.5" />
				<span class="sr-only">{m.workout_confirm_set()}</span>
			</Button>
		</div>
	</div>

	<!-- Stepper row: weight, reps, RIR -->
	<div class="flex items-center gap-3 flex-wrap">
		<div class="flex flex-col items-center gap-0.5">
			<span class="text-muted-foreground text-[10px] uppercase tracking-wide">
				{m.workout_weight()}
			</span>
			<Stepper
				value={weightValue}
				step={2.5}
				min={0}
				max={9999}
				format={(v) => v.toFixed(1)}
				onchange={handleWeightChange}
				disabled={set.completed}
			/>
		</div>

		<div class="flex flex-col items-center gap-0.5">
			<span class="text-muted-foreground text-[10px] uppercase tracking-wide">
				{m.workout_reps()}
			</span>
			<Stepper
				value={repsValue}
				step={1}
				min={0}
				max={999}
				onchange={handleRepsChange}
				disabled={set.completed}
			/>
		</div>

		{#if !isWarmup}
			<div class="flex flex-col items-center gap-0.5">
				<span class="text-muted-foreground text-[10px] uppercase tracking-wide">
					{m.workout_rir()}
				</span>
				<RirSelector
					value={rirDisplay}
					onchange={handleRirChange}
					disabled={set.completed}
				/>
			</div>
		{/if}
	</div>
</div>
