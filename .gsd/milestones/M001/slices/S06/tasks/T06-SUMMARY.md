---
id: T06
parent: S06
milestone: M001
provides:
  - Neobrutalist polish on SetRow (border-2, font-mono, completed opacity, bold type badges)
  - Neobrutalist polish on RestTimer (border-t-2, bg-background, larger bold timer display)
key_files:
  - apps/mobile/src/lib/components/workout/SetRow.svelte
  - apps/mobile/src/lib/components/workout/RestTimer.svelte
key_decisions:
  - "Most component cards were already polished in T05 at page level — T06 only needed to finish SetRow and RestTimer"
patterns_established:
  - "Completed set visual distinction: opacity-75 on the entire set row container"
  - "Set type badge prominence: border border-border font-bold on Badge class"
observability_surfaces:
  - none
duration: 1 step (2 files changed)
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T06: Neobrutalist polish pass — workout and component cards

**Applied neobrutalist border treatment to SetRow and RestTimer — the two remaining unpolished workout components.**

## What Happened

Reviewed all 8 target components. Found that 6 of 8 (ExerciseCard, SessionCard, SessionDetail, ProgramCard, TrainingDayCard, TemplateCard) were already polished in T05's page-level pass. The remaining two needed work:

- **SetRow.svelte**: Upgraded from `border` to `border-2 border-border`. Added `font-mono` to set number label. Completed sets now get `opacity-75` for visual muting. Set type badges got `border border-border font-bold` for prominence.
- **RestTimer.svelte**: Changed from `bg-card border-t` to `bg-background border-t-2 border-border` for strong visual separation from workout content. Timer display upgraded from `text-lg font-semibold` to `text-2xl font-bold` for prominence.

## Verification

- `grep 'border-2' apps/mobile/src/lib/components/workout/SetRow.svelte` — confirms neobrutalist border
- `grep 'font-mono' apps/mobile/src/lib/components/workout/SetRow.svelte` — confirms monospace numerics
- `grep 'border-t-2' apps/mobile/src/lib/components/workout/RestTimer.svelte` — confirms border separation
- `grep -E 'border-2|shadow-md'` on SessionCard, ProgramCard, ExerciseCard, TrainingDayCard, TemplateCard — all confirm styling
- `grep 'font-mono'` on SessionDetail — confirms monospace numerics throughout
- `pnpm --filter mobile check` — pre-existing type errors in exercise-repository.test.ts and ExerciseForm.svelte (unrelated to T06 changes), no new errors introduced
- All slice-level verification checks pass (haptics, mode-watcher, dnd-kit, BottomNav, safe-area, key count 236)

## Diagnostics

None — purely visual changes. Grep for neobrutalist patterns:
- `grep -rl 'border-2' apps/mobile/src/lib/components/` — all components with neobrutalist borders
- `grep -rl 'font-mono' apps/mobile/src/lib/components/` — monospace numeric displays
- `grep -rl 'opacity-75' apps/mobile/src/lib/components/workout/SetRow.svelte` — completed set treatment

## Deviations

6 of 8 target components were already polished by T05. Only SetRow and RestTimer required changes. This is a scope reduction, not a deviation — T05 was thorough in its page-level pass.

## Known Issues

- Pre-existing type errors in `exercise-repository.test.ts` and `ExerciseForm.svelte` (zod schema `id` field mismatch and string type narrowing) — unrelated to design polish work.

## Files Created/Modified

- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Added border-2, font-mono, opacity-75 completed state, bold type badges
- `apps/mobile/src/lib/components/workout/RestTimer.svelte` — Added border-t-2 separation, bg-background, larger bold timer display
