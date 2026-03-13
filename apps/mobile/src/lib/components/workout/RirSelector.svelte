<script lang="ts">
	import * as ToggleGroup from '@repo/ui/components/ui/toggle-group';

	interface Props {
		value: string;
		onchange?: (value: string) => void;
		disabled?: boolean;
	}

	let {
		value = $bindable('2'),
		onchange,
		disabled = false
	}: Props = $props();

	const options = ['0', '1', '2', '3', '4', '5+'];

	function handleValueChange(newValue: string | undefined) {
		if (newValue && newValue !== value) {
			value = newValue;
			onchange?.(value);
		}
	}
</script>

<ToggleGroup.Root
	type="single"
	value={value}
	onValueChange={handleValueChange}
	variant="outline"
	size="sm"
	class="gap-0.5"
	{disabled}
>
	{#each options as opt (opt)}
		<ToggleGroup.Item
			value={opt}
			class="h-7 min-w-[2rem] px-1.5 text-xs"
			disabled={disabled}
		>
			{opt}
		</ToggleGroup.Item>
	{/each}
</ToggleGroup.Root>
