<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as Select from '@repo/ui/components/ui/select';

	interface Props {
		value: string;
		onValueChange?: (value: string) => void;
		/** When true, only the 30d option is available (free users) */
		restrictTo30d?: boolean;
	}

	let { value = $bindable('90d'), onValueChange, restrictTo30d = false }: Props = $props();

	const allOptions = $derived([
		{ value: '7d', label: m.analytics_timerange_7d() },
		{ value: '30d', label: m.analytics_timerange_30d() },
		{ value: '90d', label: m.analytics_timerange_90d() }
	]);

	const options = $derived(
		restrictTo30d ? allOptions.filter((o) => o.value === '30d') : allOptions
	);
</script>

<Select.Root
	type="single"
	{value}
	onValueChange={(v) => {
		value = v;
		onValueChange?.(v);
	}}
	disabled={restrictTo30d}
>
	<Select.Trigger class="w-[140px]">
		{options.find((o) => o.value === value)?.label ?? allOptions.find((o) => o.value === value)?.label ?? value}
	</Select.Trigger>
	<Select.Content>
		{#each options as option (option.value)}
			<Select.Item value={option.value} label={option.label} />
		{/each}
	</Select.Content>
</Select.Root>
