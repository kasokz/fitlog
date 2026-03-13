<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Alert, AlertTitle, AlertDescription } from '@repo/ui/components/ui/alert';
	import { Button } from '@repo/ui/components/ui/button';
	import { TrendingUp, X } from '@lucide/svelte';
	import type { ProgressionSuggestion } from '$lib/types/analytics.js';

	interface Props {
		suggestion: ProgressionSuggestion;
		ondismiss: () => void;
	}

	const { suggestion, ondismiss }: Props = $props();
</script>

<Alert
	variant="default"
	class="relative border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5"
>
	<TrendingUp class="text-green-600 dark:text-green-400" />
	<AlertTitle>{m.progression_banner_title()}</AlertTitle>
	<AlertDescription>
		<p>
			{m.progression_banner_message({
				suggestedWeight: suggestion.suggested_weight.toFixed(1),
				increment: suggestion.increment_kg.toFixed(1)
			})}
		</p>
		<p class="text-muted-foreground mt-1 text-xs">
			{m.progression_banner_reason({
				avgRir: suggestion.avg_rir.toFixed(1),
				sessions: String(suggestion.sessions_analyzed)
			})}
		</p>
	</AlertDescription>
	<Button
		variant="ghost"
		size="icon-sm"
		class="absolute top-2 right-2"
		onclick={ondismiss}
		aria-label={m.progression_banner_dismiss()}
	>
		<X class="size-4" />
	</Button>
</Alert>
