<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as Select from '@repo/ui/components/ui/select';

	interface Props {
		exercises: { id: string; name: string }[];
		value: string;
		onValueChange?: (value: string) => void;
	}

	let { exercises, value = $bindable(), onValueChange }: Props = $props();
</script>

<Select.Root
	type="single"
	{value}
	onValueChange={(v) => {
		value = v;
		onValueChange?.(v);
	}}
>
	<Select.Trigger class="w-full">
		{#if value}
			{exercises.find((e) => e.id === value)?.name ?? m.analytics_exercise_picker_placeholder()}
		{:else}
			<span class="text-muted-foreground">{m.analytics_exercise_picker_placeholder()}</span>
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#each exercises as exercise (exercise.id)}
			<Select.Item value={exercise.id} label={exercise.name} />
		{/each}
	</Select.Content>
</Select.Root>
