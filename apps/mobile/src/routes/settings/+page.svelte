<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime.js';
	import { userPrefersMode, setMode } from 'mode-watcher';
	import * as ToggleGroup from '@repo/ui/components/ui/toggle-group';
	import { Switch } from '@repo/ui/components/ui/switch';
	import { Sun, Moon, Monitor, Globe } from '@lucide/svelte';
	import { isPremiumUser, setPremiumStatus } from '$lib/services/premium.js';

	let premiumActive = $state(false);

	$effect(() => {
		isPremiumUser().then((status) => {
			premiumActive = status;
		});
	});

	async function handlePremiumToggle(checked: boolean) {
		premiumActive = checked;
		await setPremiumStatus(checked);
	}

	function handleModeChange(value: string | undefined) {
		if (value === 'system' || value === 'light' || value === 'dark') {
			setMode(value);
		}
	}

	function handleLocaleChange(value: string | undefined) {
		if (value === 'de' || value === 'en') {
			setLocale(value);
		}
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold">{m.settings_title()}</h1>
	</div>

	<!-- Theme Section -->
	<div class="space-y-3">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_theme_label()}</h2>
		<ToggleGroup.Root
			type="single"
			value={userPrefersMode.current}
			onValueChange={handleModeChange}
			variant="outline"
			class="w-full"
		>
			<ToggleGroup.Item value="system" class="flex-1 gap-2">
				<Monitor class="size-4" />
				{m.settings_theme_system()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="light" class="flex-1 gap-2">
				<Sun class="size-4" />
				{m.settings_theme_light()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="dark" class="flex-1 gap-2">
				<Moon class="size-4" />
				{m.settings_theme_dark()}
			</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<!-- Language Section -->
	<div class="space-y-3 mt-6">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_language_label()}</h2>
		<ToggleGroup.Root
			type="single"
			value={getLocale()}
			onValueChange={handleLocaleChange}
			variant="outline"
			class="w-full"
		>
			<ToggleGroup.Item value="de" class="flex-1 gap-2">
				<Globe class="size-4" />
				{m.settings_language_de()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="en" class="flex-1 gap-2">
				<Globe class="size-4" />
				{m.settings_language_en()}
			</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<!-- Premium Dev Toggle (dev mode only) -->
	{#if import.meta.env.DEV}
		<div class="space-y-3 mt-6">
			<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_premium_dev_label()}</h2>
			<div class="flex items-center justify-between rounded-md border px-4 py-3">
				<span class="text-sm font-medium">
					{premiumActive ? m.settings_premium_active() : m.settings_premium_inactive()}
				</span>
				<Switch
					checked={premiumActive}
					onCheckedChange={handlePremiumToggle}
				/>
			</div>
		</div>
	{/if}
</section>
