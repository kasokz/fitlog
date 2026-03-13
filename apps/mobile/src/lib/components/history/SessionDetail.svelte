<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Separator } from '@repo/ui/components/ui/separator';
	import { Calendar, Clock } from '@lucide/svelte';

	import type { SessionDetailWithNames } from '$lib/types/workout.js';
	import type { SetType } from '$lib/types/workout.js';

	interface Props {
		session: SessionDetailWithNames;
	}

	const { session }: Props = $props();

	// ── Derived data ──

	const formattedDate = $derived(
		new Intl.DateTimeFormat('de-DE', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(session.started_at))
	);

	const durationMinutes = $derived(
		session.duration_seconds != null ? Math.round(session.duration_seconds / 60) : null
	);

	/** Group sets by exercise_id, preserving order of first appearance */
	const exerciseGroups = $derived.by(() => {
		const groups: { exerciseId: string; exerciseName: string; sets: typeof session.sets }[] = [];
		const seen = new Map<string, number>();

		for (const set of session.sets) {
			const idx = seen.get(set.exercise_id);
			if (idx !== undefined) {
				groups[idx].sets.push(set);
			} else {
				seen.set(set.exercise_id, groups.length);
				groups.push({
					exerciseId: set.exercise_id,
					exerciseName: session.exerciseNames[set.exercise_id] ?? 'Unknown Exercise',
					sets: [set]
				});
			}
		}

		return groups;
	});

	// ── Set type labels ──

	const setTypeLabels: Record<SetType, () => string> = {
		warmup: m.workout_set_type_warmup,
		working: m.workout_set_type_working,
		drop: m.workout_set_type_drop,
		failure: m.workout_set_type_failure
	};

	function getSetTypeLabel(type: SetType): string {
		return setTypeLabels[type]?.() ?? type;
	}
</script>

<!-- Date & Duration header -->
<div class="mb-4 flex flex-wrap items-center gap-3">
	<div class="flex items-center gap-1.5 text-sm">
		<Calendar class="text-muted-foreground size-4" />
		<span class="font-mono">{formattedDate}</span>
	</div>
	{#if durationMinutes != null}
		<div class="flex items-center gap-1.5 text-sm">
			<Clock class="text-muted-foreground size-4" />
			<span class="font-mono">{m.history_session_duration({ minutes: durationMinutes })}</span>
		</div>
	{/if}
</div>

<Separator class="mb-4" />

<!-- Exercise groups -->
<div class="space-y-4">
	{#each exerciseGroups as group (group.exerciseId)}
		<Card class="border-2 border-border shadow-md">
			<CardHeader class="pb-2">
				<CardTitle class="text-base font-bold">{group.exerciseName}</CardTitle>
			</CardHeader>
			<CardContent class="space-y-2">
				{#each group.sets as set (set.id)}
					<div class="flex items-center gap-3 border-2 border-border bg-muted/50 p-3">
						<!-- Set number -->
						<span class="text-muted-foreground min-w-[2.5rem] font-mono text-xs font-medium tabular-nums">
							{m.history_detail_set_label({ number: set.set_number })}
						</span>

						<!-- Set type badge -->
						<Badge
							variant={set.set_type === 'working' ? 'default' : 'secondary'}
							class="text-xs"
						>
							{getSetTypeLabel(set.set_type)}
						</Badge>

						<!-- Weight / Reps / RIR -->
						<div class="flex flex-1 items-center justify-end gap-3 font-mono text-sm tabular-nums">
							{#if set.weight != null}
								<span>
									<span class="font-bold">{set.weight}</span>
									<span class="text-muted-foreground text-xs">{m.workout_kg_unit()}</span>
								</span>
							{/if}
							{#if set.reps != null}
								<span>
									<span class="font-bold">{set.reps}</span>
									<span class="text-muted-foreground text-xs">{m.workout_reps()}</span>
								</span>
							{/if}
							{#if set.rir != null && set.set_type !== 'warmup'}
								<span>
									<span class="font-bold">{set.rir}</span>
									<span class="text-muted-foreground text-xs">{m.workout_rir()}</span>
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>
	{/each}
</div>
