<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Dumbbell, Clock, ChevronRight } from '@lucide/svelte';

	import type { CompletedSessionSummary } from '$lib/types/workout.js';

	interface Props {
		session: CompletedSessionSummary;
		onclick: () => void;
	}

	const { session, onclick }: Props = $props();

	const formattedDate = $derived(
		new Intl.DateTimeFormat('de-DE', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(session.completed_at))
	);

	const durationMinutes = $derived(
		session.duration_seconds != null ? Math.round(session.duration_seconds / 60) : null
	);
</script>

<button type="button" class="w-full text-left" {onclick}>
	<Card class="transition-colors active:bg-muted/50">
		<CardContent class="flex items-center gap-3 p-3">
			<div class="min-w-0 flex-1">
				<div class="flex items-center justify-between">
					<h3 class="truncate text-sm font-medium">{session.training_day_name}</h3>
					<span class="text-muted-foreground text-xs">{formattedDate}</span>
				</div>
				<div class="mt-1.5 flex flex-wrap gap-1.5">
					<Badge variant="secondary" class="text-xs">
						<Dumbbell class="mr-1 size-3" />
						{m.history_session_exercises({ count: session.exercise_count })}
					</Badge>
					<Badge variant="outline" class="text-xs">
						{m.history_session_sets({ count: session.total_sets })}
					</Badge>
					{#if durationMinutes != null}
						<Badge variant="outline" class="text-xs">
							<Clock class="mr-1 size-3" />
							{m.history_session_duration({ minutes: durationMinutes })}
						</Badge>
					{/if}
				</div>
			</div>
			<ChevronRight class="text-muted-foreground/50 size-4 shrink-0" />
		</CardContent>
	</Card>
</button>
