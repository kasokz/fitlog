---
estimated_steps: 4
estimated_files: 8
---

# T06: Neobrutalist polish pass — workout and component cards

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Polish the shared card-level components used across multiple routes. These components (SetRow, ExerciseCard, SessionCard, ProgramCard, TrainingDayCard, TemplateCard, RestTimer, SessionDetail) are the building blocks that users interact with most. Consistent neobrutalist treatment at the component level ensures every screen inherits the design language automatically. This completes R009's visual requirement at the component layer.

## Steps

1. Polish workout components — `SetRow.svelte`: Add `border-2 border-border` to the set container. Completed sets get `opacity-75` and a subtle strikethrough or muted treatment. Set type badges get `border border-border font-bold` for prominence. `ExerciseCard.svelte` (workout variant): Bold exercise name, clear visual separation between exercises with `border-2 shadow-sm`. `RestTimer.svelte`: Make timer display larger and bolder. Add `border-t-2 border-border bg-background` to the fixed container for clear separation from content.
2. Polish history components — `SessionCard.svelte`: Apply `border-2 border-border shadow-md` card treatment. Date in `font-mono`. Exercise count and duration as badges. `SessionDetail.svelte`: Consistent card sections for each exercise, `font-mono` for all numeric data (weights, reps, RIR).
3. Polish program components — `ProgramCard.svelte`: `border-2 border-border shadow-md` with press-down effect on tap. Training day count as a badge. `TrainingDayCard.svelte`: Bold day name, clear visual container with `border-2`. `TemplateCard.svelte` (onboarding): Strong visual presence with hard shadow, clear selection/hover state.
4. Run `pnpm --filter @repo/mobile check` to verify no type errors.

## Must-Haves

- [ ] `SetRow.svelte` has neobrutalist border treatment, completed set visual distinction
- [ ] `ExerciseCard.svelte` (workout) has bold borders and clear exercise separation
- [ ] `RestTimer.svelte` has prominent visual presence with border separation
- [ ] `SessionCard.svelte` and `SessionDetail.svelte` have neobrutalist card styling with monospace numerics
- [ ] `ProgramCard.svelte` and `TrainingDayCard.svelte` have consistent card treatment
- [ ] `TemplateCard.svelte` has striking visual presence for onboarding
- [ ] All numeric displays use `font-mono`

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `grep 'border-2' apps/mobile/src/lib/components/workout/SetRow.svelte` confirms styling
- `grep 'border-2\|shadow-md' apps/mobile/src/lib/components/history/SessionCard.svelte` confirms styling
- `grep 'border-2\|shadow-md' apps/mobile/src/lib/components/programs/ProgramCard.svelte` confirms styling
- `grep 'font-mono' apps/mobile/src/lib/components/workout/SetRow.svelte apps/mobile/src/lib/components/history/SessionDetail.svelte` confirms monospace numerics

## Observability Impact

- Signals added/changed: None — purely visual changes
- How a future agent inspects this: Grep for neobrutalist patterns in component files
- Failure state exposed: None

## Inputs

- All component files from S01–S05 (functional but plain)
- `packages/ui/src/globals.css` — Design tokens
- T05 output — Page-level polish patterns to maintain consistency with

## Expected Output

- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Polished with neobrutalist borders
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — Bold borders and separation
- `apps/mobile/src/lib/components/workout/RestTimer.svelte` — Prominent visual presence
- `apps/mobile/src/lib/components/history/SessionCard.svelte` — Neobrutalist card with monospace
- `apps/mobile/src/lib/components/history/SessionDetail.svelte` — Polished detail view
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte` — Hard shadow card
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — Bold container
- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — Striking onboarding card
