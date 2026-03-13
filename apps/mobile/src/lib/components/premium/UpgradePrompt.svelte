<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Button } from '@repo/ui/components/ui/button';
	import { Lock } from '@lucide/svelte';

	interface Props {
		/** Feature context key used to select the appropriate description message */
		feature: 'full_charts' | 'extended_history';
	}

	const { feature }: Props = $props();

	const description = $derived(
		feature === 'full_charts'
			? m.premium_upgrade_description_full_charts()
			: m.premium_upgrade_description_extended_history()
	);

	function handleUpgrade() {
		console.log(`[Premium] Upgrade tapped — feature: ${feature} (coming soon)`);
	}
</script>

<Card class="border-primary/20 bg-primary/5 border-2">
	<CardContent class="flex flex-col items-center gap-3 pt-6 text-center">
		<div class="bg-primary/10 rounded-full p-3">
			<Lock class="text-primary size-6" />
		</div>
		<h3 class="text-base font-bold">{m.premium_upgrade_title()}</h3>
		<p class="text-muted-foreground text-sm">{description}</p>
		<Button class="w-full" onclick={handleUpgrade}>
			{m.premium_upgrade_button()}
		</Button>
	</CardContent>
</Card>
