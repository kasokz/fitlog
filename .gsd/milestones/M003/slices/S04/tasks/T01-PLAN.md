---
estimated_steps: 8
estimated_files: 8
---

# T01: Author 5 premium template data files and extend type/registry

**Slice:** S04 — Premium Program Templates
**Milestone:** M003

## Description

Create the 5 premium program template data files representing distinct training methodologies, extend `ProgramTemplate` with an optional `premium` field, and update the template registry with new exports. This is the foundational data task — no UI, no tests (those are T02). Every exercise name must exactly match a SEED_EXERCISES entry (D032).

## Steps

1. Add `premium?: boolean` to the `ProgramTemplate` interface in `types.ts` (optional field, backwards compatible — existing templates don't need changes)
2. Create `periodized-strength-531.ts` — 4-day program inspired by 5/3/1: main compound lifts with progressive rep scheme across weeks. Week 1: 5×5 heavy, Week 2: 3×5 heavier, Week 3: 1×5 heaviest. 7 weeks with deload week 7. Days: Squat day, Bench day, Deadlift day, OHP day. Each day has 1 main lift + 3-4 accessories.
3. Create `linear-progression-lp.ts` — 4-day upper/lower split with heavy main lifts (3-5 reps) + volume backoff sets (8-12 reps). 6 weeks, deload week 6. Focus on progressive overload through linear weight increases.
4. Create `tiered-volume-method.ts` — 4-day program with T1/T2/T3 tier structure per day: T1 heavy compound (3-5 reps, 4-5 sets), T2 moderate compound (6-10 reps, 3-4 sets), T3 isolation (12-15 reps, 3 sets). 6 weeks, deload week 6.
5. Create `periodized-hypertrophy.ts` — 5-day program focused on hypertrophy: higher rep ranges (8-15), more isolation work, moderate weights. Push/Pull/Legs/Upper/Lower style split. 8 weeks, deload week 8.
6. Create `strength-endurance-block.ts` — 3-day full body with daily undulation: Day 1 heavy (3-5 reps), Day 2 moderate (6-10 reps), Day 3 light/volume (12-15 reps). 6 weeks, deload week 6.
7. Update `index.ts`: add named exports for all 5 templates, create `PREMIUM_PROGRAM_TEMPLATES` array and `ALL_TEMPLATES` array (free + premium). Keep `PROGRAM_TEMPLATES` unchanged (3 free templates).
8. Verify all exercise names by cross-referencing with `SEED_EXERCISES` list. Run `pnpm run build` to confirm type correctness.

## Must-Haves

- [ ] `ProgramTemplate` interface has `premium?: boolean` (optional, backwards compatible)
- [ ] 5 template files exist, each with `premium: true` and unique `id`
- [ ] All exercise names exactly match SEED_EXERCISES entries (case-sensitive)
- [ ] Each template represents a genuinely distinct training philosophy (not just PPL variants)
- [ ] No trademarked names used (D069) — generic descriptive names only
- [ ] No emojis in names or descriptions
- [ ] `PROGRAM_TEMPLATES` still exports exactly 3 free templates (onboarding safe)
- [ ] `PREMIUM_PROGRAM_TEMPLATES` exports 5 premium templates
- [ ] `ALL_TEMPLATES` exports 8 combined templates
- [ ] `pnpm run build` succeeds

## Verification

- `pnpm run build` — zero type errors
- Manual audit: every exercise name in each template file appears in the SEED_EXERCISES grep output
- `PROGRAM_TEMPLATES` length is still 3 (onboarding unchanged)
- Each template has unique `id`, meaningful `description`, correct `mesocycleDefaults`

## Observability Impact

- Signals added/changed: None — pure data files with no runtime behavior
- How a future agent inspects this: Read template files directly, or check `ALL_TEMPLATES` export
- Failure state exposed: Build-time type errors if `ProgramTemplate` shape is wrong; runtime `createProgramFromTemplate()` fails fast listing unresolved names (D033)

## Inputs

- `src/lib/data/templates/ppl.ts` — reference pattern for template file structure
- `src/lib/data/templates/types.ts` — `ProgramTemplate` interface to extend
- `src/lib/data/templates/index.ts` — registry to update
- `src/lib/db/seed/exercises.ts` — 55 seed exercise names (must match exactly)
- Research: 5 methodology descriptions from S04-RESEARCH.md

## Expected Output

- `src/lib/data/templates/types.ts` — `ProgramTemplate` with `premium?: boolean`
- `src/lib/data/templates/periodized-strength-531.ts` — 4-day, 7-week template
- `src/lib/data/templates/linear-progression-lp.ts` — 4-day, 6-week template
- `src/lib/data/templates/tiered-volume-method.ts` — 4-day, 6-week template
- `src/lib/data/templates/periodized-hypertrophy.ts` — 5-day, 8-week template
- `src/lib/data/templates/strength-endurance-block.ts` — 3-day, 6-week template
- `src/lib/data/templates/index.ts` — updated with all exports
