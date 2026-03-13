<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Alert, AlertTitle, AlertDescription } from '@repo/ui/components/ui/alert';
	import { Button } from '@repo/ui/components/ui/button';
	import { TrendingDown, X } from '@lucide/svelte';

	interface Props {
		week: number;
		ondismiss: () => void;
	}

	const { week, ondismiss }: Props = $props();
</script>

<Alert
	variant="default"
	class="relative border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5"
>
	<TrendingDown class="text-amber-600 dark:text-amber-400" />
	<AlertTitle>{m.deload_banner_title()}</AlertTitle>
	<AlertDescription>
		<p>{m.deload_banner_description()}</p>
		<p class="text-muted-foreground mt-1 text-xs">
			{m.deload_banner_week({ week: String(week) })}
		</p>
	</AlertDescription>
	<Button
		variant="ghost"
		size="icon-sm"
		class="absolute top-2 right-2"
		onclick={ondismiss}
		aria-label={m.deload_banner_dismiss()}
	>
		<X class="size-4" />
	</Button>
</Alert>
