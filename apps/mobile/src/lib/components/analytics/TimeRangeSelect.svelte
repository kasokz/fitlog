<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as Select from '@repo/ui/components/ui/select';

	interface Props {
		value: string;
		onValueChange?: (value: string) => void;
	}

	let { value = $bindable('90d'), onValueChange }: Props = $props();

	const options = $derived([
		{ value: '7d', label: m.analytics_timerange_7d() },
		{ value: '30d', label: m.analytics_timerange_30d() },
		{ value: '90d', label: m.analytics_timerange_90d() }
	]);
</script>

<Select.Root
	type="single"
	{value}
	onValueChange={(v) => {
		value = v;
		onValueChange?.(v);
	}}
>
	<Select.Trigger class="w-[140px]">
		{options.find((o) => o.value === value)?.label ?? value}
	</Select.Trigger>
	<Select.Content>
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label} />
		{/each}
	</Select.Content>
</Select.Root>
