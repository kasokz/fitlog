<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as AlertDialog from '@repo/ui/components/ui/alert-dialog';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, SearchX, AlertTriangle, CheckCircle2 } from '@lucide/svelte';

	import { notifySuccess } from '$lib/services/haptics.js';
	import { getDb } from '$lib/db/database.js';
	import { WorkoutRepository } from '$lib/db/repositories/workout.js';
	import { ProgramRepository } from '$lib/db/repositories/program.js';
	import { ExerciseRepository } from '$lib/db/repositories/exercise.js';
	import type { WorkoutSessionWithSets } from '$lib/types/workout.js';
	import type { SetType } from '$lib/types/workout.js';
	import type { ProgramWithDays, ExerciseAssignment } from '$lib/types/program.js';
	import type { Exercise } from '$lib/types/exercise.js';

	import ExerciseCard from '$lib/components/workout/ExerciseCard.svelte';
	import DurationTimer from '$lib/components/workout/DurationTimer.svelte';
	import RestTimer from '$lib/components/workout/RestTimer.svelte';
	import type { WorkingSet } from '$lib/components/workout/SetRow.svelte';

	// ── State ──

	let loading = $state(true);
	let error = $state<string | null>(null);
	let notFound = $state(false);

	let session = $state<WorkoutSessionWithSets | null>(null);
	let programId = $state<string | null>(null);
	let trainingDayName = $state<string>('');

	/** In-memory working copy, grouped by exercise */
	let exerciseGroups = $state<ExerciseGroup[]>([]);

	let finishDialogOpen = $state(false);
	let finishing = $state(false);

	interface ExerciseGroup {
		exerciseId: string;
		exerciseName: string;
		muscleGroup: Exercise['muscle_group'];
		assignmentId: string | null;
		sets: WorkingSet[];
	}

	const sessionId = $derived(page.params.sessionId as string);

	/** Count of unconfirmed sets across all exercise groups */
	const unconfirmedSetCount = $derived(
		exerciseGroups.reduce(
			(count, group) => count + group.sets.filter((s) => !s.completed).length,
			0
		)
	);

	// ── Data loading ──

	async function loadSession() {
		try {
			await getDb();

			const loadedSession = await WorkoutRepository.getSessionById(sessionId);
			if (!loadedSession) {
				notFound = true;
				return;
			}

			session = loadedSession;
			programId = loadedSession.program_id;

			// Load the program template to get exercise order and assignment details
			const program = await ProgramRepository.getById(loadedSession.program_id);
			if (!program) {
				error = m.workout_program_not_found();
				return;
			}

			// Find the training day
			const trainingDay = program.trainingDays.find(
				(d) => d.id === loadedSession.training_day_id
			);
			trainingDayName = trainingDay?.name ?? '';

			// Build exercise info map
			const exerciseMap = new Map<string, Exercise>();
			const exerciseIds = new Set<string>();

			// Collect exercise IDs from session sets
			for (const s of loadedSession.sets) {
				exerciseIds.add(s.exercise_id);
			}
			// Also collect from assignments (in case sets haven't been created yet)
			if (trainingDay) {
				for (const a of trainingDay.assignments) {
					exerciseIds.add(a.exercise_id);
				}
			}

			// Resolve exercise details
			for (const eid of exerciseIds) {
				try {
					const exercise = await ExerciseRepository.getById(eid);
					if (exercise) {
						exerciseMap.set(eid, exercise);
					}
				} catch {
					// Exercise may have been deleted
				}
			}

			// Build exercise groups following assignment order from the training day
			const groups: ExerciseGroup[] = [];
			const processedExerciseIds = new Set<string>();

			if (trainingDay) {
				for (const assignment of trainingDay.assignments) {
					const exercise = exerciseMap.get(assignment.exercise_id);
					const setsForExercise = loadedSession.sets
						.filter((s) => s.exercise_id === assignment.exercise_id)
						.map(setToWorking);

					groups.push({
						exerciseId: assignment.exercise_id,
						exerciseName: exercise?.name ?? m.workout_deleted_exercise(),
						muscleGroup: exercise?.muscle_group ?? 'full_body',
						assignmentId: assignment.id,
						sets: setsForExercise
					});
					processedExerciseIds.add(assignment.exercise_id);
				}
			}

			// Add any sets for exercises not in the current template (edge case)
			const remainingExerciseIds = new Set(
				loadedSession.sets
					.map((s) => s.exercise_id)
					.filter((eid) => !processedExerciseIds.has(eid))
			);
			for (const eid of remainingExerciseIds) {
				const exercise = exerciseMap.get(eid);
				const setsForExercise = loadedSession.sets
					.filter((s) => s.exercise_id === eid)
					.map(setToWorking);

				groups.push({
					exerciseId: eid,
					exerciseName: exercise?.name ?? m.workout_deleted_exercise(),
					muscleGroup: exercise?.muscle_group ?? 'full_body',
					assignmentId: null,
					sets: setsForExercise
				});
			}

			exerciseGroups = groups;
		} catch (err) {
			console.error('[Workout] Session load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		} finally {
			loading = false;
		}
	}

	function setToWorking(s: WorkoutSessionWithSets['sets'][number]): WorkingSet {
		return {
			id: s.id,
			exercise_id: s.exercise_id,
			assignment_id: s.assignment_id,
			set_number: s.set_number,
			set_type: s.set_type,
			weight: s.weight,
			reps: s.reps,
			rir: s.rir,
			completed: s.completed
		};
	}

	// ── Init ──

	$effect(() => {
		loadSession();
	});

	// ── Event handlers ──

	async function handleConfirmSet(groupIndex: number, setIndex: number) {
		const group = exerciseGroups[groupIndex];
		const set = group.sets[setIndex];

		try {
			await WorkoutRepository.updateSet(set.id, {
				set_type: set.set_type,
				weight: set.weight,
				reps: set.reps,
				rir: set.rir,
				completed: true
			});
			set.completed = true;
			toast.success(m.workout_set_confirmed());
		} catch (err) {
			console.error('[Workout] Set confirm failed:', err);
			toast.error(m.workout_set_update_error());
		}
	}

	async function handleAddSet(groupIndex: number) {
		const group = exerciseGroups[groupIndex];

		// Default values: copy from last set in group or use defaults
		const lastSet = group.sets.length > 0 ? group.sets[group.sets.length - 1] : null;

		try {
			const newSet = await WorkoutRepository.addSet(sessionId, {
				exercise_id: group.exerciseId,
				assignment_id: group.assignmentId,
				set_type: lastSet?.set_type ?? 'working',
				weight: lastSet?.weight ?? 0,
				reps: lastSet?.reps ?? 0,
				rir: lastSet?.rir ?? 2
			});

			group.sets.push(setToWorking(newSet));
			// Trigger reactivity
			exerciseGroups = exerciseGroups;
			toast.success(m.workout_set_added());
		} catch (err) {
			console.error('[Workout] Add set failed:', err);
			toast.error(m.workout_set_add_error());
		}
	}

	async function handleRemoveSet(groupIndex: number, setIndex: number) {
		const group = exerciseGroups[groupIndex];
		const set = group.sets[setIndex];

		try {
			await WorkoutRepository.removeSet(set.id);
			group.sets.splice(setIndex, 1);
			// Re-number remaining sets
			group.sets.forEach((s, i) => {
				s.set_number = i + 1;
			});
			// Trigger reactivity
			exerciseGroups = exerciseGroups;
			toast.success(m.workout_set_removed());
		} catch (err) {
			console.error('[Workout] Remove set failed:', err);
			toast.error(m.workout_set_remove_error());
		}
	}

	// ── Finish workout flow ──

	async function handleFinishWorkout() {
		if (!session) return;

		finishing = true;
		try {
			const durationSeconds = Math.floor(
				(Date.now() - Date.parse(session.started_at)) / 1000
			);

			await WorkoutRepository.completeSession(sessionId, durationSeconds);

			console.log('[Workout] Session completed', {
				sessionId,
				trainingDayName,
				durationSeconds
			});

			notifySuccess();

			finishDialogOpen = false;
			toast.success(m.workout_finish_success());

			// Navigate back to program detail
			if (programId) {
				goto(`/programs/${programId}`);
			} else {
				goto('/programs');
			}
		} catch (err) {
			console.error('[Workout] Finish workout failed:', err);
			toast.error(m.workout_finish_error());
		} finally {
			finishing = false;
		}
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4 pb-24">
	<!-- Header -->
	<div class="mb-4">
		<div class="flex items-center justify-between">
			<Button
				variant="ghost"
				size="sm"
				class="-ml-2 border-2 border-border shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
				onclick={() => history.back()}
			>
				<ArrowLeft class="mr-1 size-4" />
				{m.workout_back()}
			</Button>

			{#if session && !loading && !error && !notFound}
				<div class="flex items-center gap-3">
					<DurationTimer startedAt={session.started_at} />
					<Button
						variant="default"
						size="sm"
						onclick={() => { finishDialogOpen = true; }}
					>
						<CheckCircle2 class="mr-1 size-4" />
						{m.workout_finish()}
					</Button>
				</div>
			{/if}
		</div>

		{#if trainingDayName && !loading && !error && !notFound}
			<h1 class="mt-2 text-2xl font-bold">{trainingDayName}</h1>
		{/if}
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
			<p class="text-muted-foreground mt-2 text-sm">{m.workout_loading()}</p>
		</div>
	{:else if notFound}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.workout_not_found()}</EmptyTitle>
			<EmptyDescription>{m.workout_not_found_description()}</EmptyDescription>
		</Empty>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<AlertTriangle />
			</EmptyMedia>
			<EmptyTitle>{m.workout_error()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else}
		<div class="space-y-4">
			{#each exerciseGroups as group, groupIndex (group.exerciseId)}
				<ExerciseCard
					exerciseName={group.exerciseName}
					muscleGroup={group.muscleGroup}
					bind:sets={group.sets}
					onconfirm={(setIndex) => handleConfirmSet(groupIndex, setIndex)}
					onadd={() => handleAddSet(groupIndex)}
					onremove={(setIndex) => handleRemoveSet(groupIndex, setIndex)}
				/>
			{/each}
		</div>
	{/if}
</section>

<!-- Rest Timer — fixed at bottom -->
{#if session && !loading && !error && !notFound}
	<div class="fixed right-0 bottom-0 left-0 z-40">
		<RestTimer />
	</div>
{/if}

<!-- Finish Workout AlertDialog -->
<AlertDialog.Root bind:open={finishDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.workout_finish_title()}</AlertDialog.Title>
			<AlertDialog.Description>
				{m.workout_finish_description()}
				{#if unconfirmedSetCount > 0}
					<span class="text-warning mt-2 block text-sm font-medium">
						{m.workout_finish_warning_unconfirmed({ count: unconfirmedSetCount })}
					</span>
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.workout_finish_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleFinishWorkout}
				disabled={finishing}
			>
				{#if finishing}
					<Loader2 class="mr-1 size-4 animate-spin" />
				{/if}
				{m.workout_finish_confirm()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
