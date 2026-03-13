<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

	import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@repo/ui/components/ui/empty';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { ArrowLeft, Loader2, Plus, SearchX, CalendarDays, Dumbbell, Timer, Pencil } from '@lucide/svelte';

	import { getDb } from '$lib/db/database.js';
	import { ProgramRepository } from '$lib/db/repositories/program.js';
	import { ExerciseRepository } from '$lib/db/repositories/exercise.js';
	import { WorkoutRepository } from '$lib/db/repositories/workout.js';
	import type { ProgramWithDays, Mesocycle } from '$lib/types/program.js';
	import { applyDeloadTransform, type CandidateSet } from '$lib/services/analytics/deloadCalculator.js';

	import TrainingDayCard from '$lib/components/programs/TrainingDayCard.svelte';
	import TrainingDayForm from '$lib/components/programs/TrainingDayForm.svelte';
	import ExerciseAssignmentList from '$lib/components/programs/ExerciseAssignmentList.svelte';
	import ExerciseAssignmentForm from '$lib/components/programs/ExerciseAssignmentForm.svelte';
	import MesocycleForm from '$lib/components/programs/MesocycleForm.svelte';

	// ── State ──

	let program: ProgramWithDays | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let addDayDrawerOpen = $state(false);
	let addExerciseDrawerOpen = $state(false);
	let activeTrainingDayId = $state<string | null>(null);
	let mesocycle = $state<Mesocycle | null>(null);
	let mesocycleDrawerOpen = $state(false);

	/** Map of exercise_id → exercise name for resolving assignment display */
	let exerciseNames = $state<Map<string, string>>(new Map());

	const programId = $derived(page.params.id as string);

	// ── Data loading ──

	async function loadProgram() {
		try {
			program = await ProgramRepository.getById(programId);
			if (!program) {
				error = 'Program not found';
				return;
			}

			// Resolve exercise names for all assignments
			const exerciseIds = new Set<string>();
			for (const day of program.trainingDays) {
				for (const assignment of day.assignments) {
					exerciseIds.add(assignment.exercise_id);
				}
			}

			const nameMap = new Map<string, string>();
			for (const eid of exerciseIds) {
				try {
					const exercise = await ExerciseRepository.getById(eid);
					if (exercise) {
						nameMap.set(eid, exercise.name);
					}
				} catch {
					// Exercise may be deleted — we'll show fallback in the list
				}
			}
			exerciseNames = nameMap;

			// Load mesocycle
			mesocycle = await ProgramRepository.getMesocycleByProgramId(programId);
		} catch (err) {
			console.error('[Programs] Detail load failed:', err);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ── Init DB + load on mount ──

	$effect(() => {
		(async () => {
			try {
				await getDb();
				await loadProgram();
			} catch (err) {
				console.error('[Programs] Detail init failed:', err);
				error = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		})();
	});

	// ── Training Day Handlers ──

	function handleDayCreated() {
		addDayDrawerOpen = false;
		loadProgram();
	}

	async function handleMoveUp(index: number) {
		if (!program || index === 0) return;

		const days = [...program.trainingDays];
		[days[index - 1], days[index]] = [days[index], days[index - 1]];
		const orderedIds = days.map((d) => d.id);

		try {
			await ProgramRepository.reorderTrainingDays(programId, orderedIds);
			await loadProgram();
		} catch (err) {
			console.error('[Programs] Reorder failed:', err);
			toast.error(m.programs_day_form_error());
		}
	}

	async function handleMoveDown(index: number) {
		if (!program || index === program.trainingDays.length - 1) return;

		const days = [...program.trainingDays];
		[days[index], days[index + 1]] = [days[index + 1], days[index]];
		const orderedIds = days.map((d) => d.id);

		try {
			await ProgramRepository.reorderTrainingDays(programId, orderedIds);
			await loadProgram();
		} catch (err) {
			console.error('[Programs] Reorder failed:', err);
			toast.error(m.programs_day_form_error());
		}
	}

	async function handleRemove(dayId: string) {
		try {
			const removed = await ProgramRepository.removeTrainingDay(dayId);
			if (removed) {
				toast.success(m.programs_day_card_remove_success());
				await loadProgram();
			}
		} catch (err) {
			console.error('[Programs] Remove training day failed:', err);
			toast.error(m.programs_day_form_error());
		}
	}

	// ── Assignment Handlers ──

	function openAddExercise(trainingDayId: string) {
		activeTrainingDayId = trainingDayId;
		addExerciseDrawerOpen = true;
	}

	function handleAssignmentCreated() {
		addExerciseDrawerOpen = false;
		activeTrainingDayId = null;
		loadProgram();
	}

	async function handleReorderAssignments(trainingDayId: string, orderedIds: string[]) {
		try {
			await ProgramRepository.reorderExerciseAssignments(trainingDayId, orderedIds);
			await loadProgram();
		} catch (err) {
			console.error('[Programs] Reorder assignments failed:', err);
			toast.error(m.programs_assignment_error());
		}
	}

	function handleMesocycleSaved() {
		mesocycleDrawerOpen = false;
		loadProgram();
	}

	async function handleRemoveAssignment(assignmentId: string) {
		try {
			const removed = await ProgramRepository.removeExerciseAssignment(assignmentId);
			if (removed) {
				toast.success(m.programs_assignment_remove_success());
				await loadProgram();
			}
		} catch (err) {
			console.error('[Programs] Remove assignment failed:', err);
			toast.error(m.programs_assignment_error());
		}
	}

	// ── Start Workout Handler ──

	async function handleStartWorkout(trainingDayId: string) {
		try {
			// Check for existing in-progress session
			const existing = await WorkoutRepository.getInProgressSession();
			if (existing) {
				toast.info(m.workout_session_in_progress(), {
					action: {
						label: m.workout_resume(),
						onClick: () => goto(`/workout/${existing.id}`)
					}
				});
				return;
			}

			// Create new session
			const session = await WorkoutRepository.createSession({
				program_id: programId,
				training_day_id: trainingDayId,
				mesocycle_id: mesocycle?.id ?? null,
				mesocycle_week: mesocycle?.current_week ?? null
			});

			console.log('[Workout] Session started from program detail', {
				sessionId: session.id,
				trainingDayId,
				programId
			});

			// ── Collect candidate sets for pre-fill ──
			let candidates: CandidateSet[] = [];

			const lastSession = await WorkoutRepository.getLastSessionForDay(trainingDayId);
			if (lastSession && lastSession.sets.length > 0) {
				// Last-session branch: carry forward previous sets
				candidates = lastSession.sets.map((prevSet) => ({
					exercise_id: prevSet.exercise_id,
					assignment_id: prevSet.assignment_id,
					set_type: prevSet.set_type,
					weight: prevSet.weight,
					reps: prevSet.reps,
					rir: prevSet.rir
				}));
			} else {
				// First time — create default sets from template assignments
				const day = program?.trainingDays.find((d) => d.id === trainingDayId);
				if (day) {
					for (const assignment of day.assignments) {
						const targetSets = assignment.target_sets ?? 3;
						for (let i = 0; i < targetSets; i++) {
							candidates.push({
								exercise_id: assignment.exercise_id,
								assignment_id: assignment.id,
								set_type: 'working',
								weight: 0,
								reps: assignment.min_reps ?? 0,
								rir: 2
							});
						}
					}
				}
			}

			// ── Apply deload transform if in deload week ──
			try {
				const transformed = applyDeloadTransform(candidates, mesocycle);
				if (transformed !== candidates) {
					console.log('[Workout] Deload week detected, applying deload transform', {
						mesocycleId: mesocycle?.id,
						currentWeek: mesocycle?.current_week
					});
				}
				candidates = transformed;
			} catch (err) {
				console.error('[Workout] Deload transform failed', err);
				// Fall through to normal pre-fill on error
			}

			// ── Write candidate sets to session ──
			for (const c of candidates) {
				await WorkoutRepository.addSet(session.id, {
					exercise_id: c.exercise_id,
					assignment_id: c.assignment_id,
					set_type: c.set_type as 'working' | 'warmup' | 'drop' | 'failure',
					weight: c.weight,
					reps: c.reps,
					rir: c.rir
				});
			}

			goto(`/workout/${session.id}`);
		} catch (err) {
			console.error('[Workout] Start workout failed:', err);
			toast.error(m.workout_start_error());
		}
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-4">
		<Button
			variant="ghost"
			size="sm"
			class="-ml-2 mb-2 border-2 border-border shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => goto('/programs')}
		>
			<ArrowLeft class="mr-1 size-4" />
			{m.programs_detail_back()}
		</Button>

		{#if program}
			<h1 class="text-2xl font-bold">{program.name}</h1>
			{#if program.description}
				<p class="text-muted-foreground mt-1 text-sm">{program.description}</p>
			{/if}
		{/if}
	</div>

	<!-- Content -->
	{#if loading}
		<div class="flex flex-col items-center justify-center py-16">
			<Loader2 class="text-muted-foreground size-8 animate-spin" />
		</div>
	{:else if error}
		<Empty>
			<EmptyMedia variant="icon">
				<SearchX />
			</EmptyMedia>
			<EmptyTitle>{m.programs_empty_title()}</EmptyTitle>
			<EmptyDescription>{error}</EmptyDescription>
		</Empty>
	{:else if program}
		<!-- Training Days Section -->
		<div class="mt-2">
			<h2 class="text-muted-foreground mb-3 text-sm font-bold uppercase tracking-wide">
				{m.programs_detail_days_title()}
			</h2>

			{#if program.trainingDays.length === 0}
				<Empty>
					<EmptyMedia variant="icon">
						<CalendarDays />
					</EmptyMedia>
					<EmptyTitle>{m.programs_detail_days_empty()}</EmptyTitle>
					<EmptyDescription>{m.programs_detail_days_empty_description()}</EmptyDescription>
				</Empty>
			{:else}
				<div class="space-y-4">
					{#each program.trainingDays as day, index (day.id)}
						<div>
							<TrainingDayCard
								trainingDay={day}
								{index}
								total={program.trainingDays.length}
								onmoveup={() => handleMoveUp(index)}
								onmovedown={() => handleMoveDown(index)}
								onremove={() => handleRemove(day.id)}
								onclick={() => {}}
								onstartworkout={() => handleStartWorkout(day.id)}
							/>

							<!-- Inline exercise assignments -->
							<div class="ml-8 mr-8">
								<ExerciseAssignmentList
									assignments={day.assignments}
									{exerciseNames}
									onreorder={(orderedIds) => handleReorderAssignments(day.id, orderedIds)}
									onremove={handleRemoveAssignment}
								/>

								<!-- Add exercise button -->
								<Button
									variant="ghost"
									size="sm"
									class="text-muted-foreground mt-1.5 w-full"
									onclick={() => openAddExercise(day.id)}
								>
									<Dumbbell class="mr-1.5 size-3.5" />
									{m.programs_assignment_add()}
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Mesocycle Section -->
		<div class="mt-8">
			<h2 class="text-muted-foreground mb-3 text-sm font-bold uppercase tracking-wide">
				{m.programs_mesocycle_title()}
			</h2>

			{#if mesocycle}
				<!-- Mesocycle card -->
				<div class="bg-card border-2 border-border shadow-md p-4">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<Timer class="text-muted-foreground size-4" />
							<span class="font-bold">{m.programs_mesocycle_title()}</span>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={() => { mesocycleDrawerOpen = true; }}
						>
							<Pencil class="size-3.5" />
							<span class="ml-1">{m.programs_mesocycle_edit()}</span>
						</Button>
					</div>
					<div class="text-muted-foreground space-y-1 text-sm">
						<p class="font-mono">{m.programs_mesocycle_weeks_display({ count: mesocycle.weeks_count })}</p>
						<p class="font-mono">
							{#if mesocycle.deload_week_number === 0}
								{m.programs_mesocycle_deload_none()}
							{:else}
								{m.programs_mesocycle_deload_display({ week: mesocycle.deload_week_number })}
							{/if}
						</p>
						<p class="font-mono">{m.programs_mesocycle_current_week_display({ week: mesocycle.current_week })}</p>
					</div>
				</div>
			{:else}
				<Empty>
					<EmptyMedia variant="icon">
						<Timer />
					</EmptyMedia>
					<EmptyTitle>{m.programs_mesocycle_empty()}</EmptyTitle>
					<EmptyDescription>{m.programs_mesocycle_empty_description()}</EmptyDescription>
				</Empty>
				<div class="mt-3 flex justify-center">
					<Button
						variant="outline"
						class="border-2 border-border shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						onclick={() => { mesocycleDrawerOpen = true; }}
					>
						<Plus class="mr-1.5 size-4" />
						{m.programs_mesocycle_define()}
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</section>

<!-- FAB: Add Training Day -->
{#if !loading && !error && program}
	<div class="fixed right-4 bottom-24 z-50">
		<Button
			size="lg"
			class="border-2 border-border shadow-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
			onclick={() => { addDayDrawerOpen = true; }}
		>
			<Plus class="mr-2 size-5" />
			{m.programs_detail_add_day()}
		</Button>
	</div>
{/if}

<!-- Add Training Day Drawer -->
<Drawer.Root bind:open={addDayDrawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_day_form_title()}</Drawer.Title>
			<Drawer.Description>{m.programs_day_form_description()}</Drawer.Description>
		</Drawer.Header>
		<TrainingDayForm {programId} oncreated={handleDayCreated} />
	</Drawer.Content>
</Drawer.Root>

<!-- Add Exercise Assignment Drawer -->
<Drawer.Root bind:open={addExerciseDrawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_assignment_form_title()}</Drawer.Title>
			<Drawer.Description>{m.programs_assignment_form_description()}</Drawer.Description>
		</Drawer.Header>
		{#if activeTrainingDayId}
			<ExerciseAssignmentForm
				trainingDayId={activeTrainingDayId}
				oncreated={handleAssignmentCreated}
			/>
		{/if}
	</Drawer.Content>
</Drawer.Root>

<!-- Mesocycle Drawer -->
<Drawer.Root bind:open={mesocycleDrawerOpen}>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_mesocycle_form_title()}</Drawer.Title>
			<Drawer.Description>{m.programs_mesocycle_form_description()}</Drawer.Description>
		</Drawer.Header>
		<MesocycleForm
			{programId}
			existingMesocycle={mesocycle ?? undefined}
			onsaved={handleMesocycleSaved}
		/>
	</Drawer.Content>
</Drawer.Root>
