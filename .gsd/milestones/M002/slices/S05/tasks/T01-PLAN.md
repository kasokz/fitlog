---
estimated_steps: 5
estimated_files: 3
---

# T01: Wire deload transform into session pre-fill and add integration test

**Slice:** S05 — Deload Auto-Adjustment
**Milestone:** M002

## Description

Modify `handleStartWorkout()` in the program detail page to detect deload weeks and apply `calculateDeloadSets()` to pre-filled sets. This is the core R017 behavior — when `isDeloadWeek(mesocycle)` is true, the pre-fill path transforms sets before writing them to the DB. Both branches (last-session pre-fill and first-time template defaults) must apply the deload transform. An integration test validates both branches plus bypass cases.

## Steps

1. **Read** `apps/mobile/src/routes/programs/[id]/+page.svelte` lines ~190–250 to understand the full `handleStartWorkout` function and both pre-fill branches.

2. **Modify `handleStartWorkout()`** — Import `isDeloadWeek` and `calculateDeloadSets` from `deloadCalculator.ts`. After the existing pre-fill logic (both branches), add a deload detection check:
   - If `mesocycle && isDeloadWeek(mesocycle)`, log `[Workout] Deload week detected`.
   - For the **last-session branch**: Group `lastSession.sets` by `exercise_id`, run `calculateDeloadSets()` on each group, and use the returned `DeloadSet[]` for the `addSet()` calls instead of the raw previous sets. Map `DeloadSet` fields to `addSet` params: `exercise_id`, `assignment_id` (from matching prev set), `set_type`, `weight`, `reps`, `rir: null`.
   - For the **template-defaults branch**: After generating the default sets (weight: 0, reps from assignment), collect them into a similar structure and run `calculateDeloadSets()`. Since weight is 0, deload produces 0 — this is correct but volume is still capped at 3 sets per exercise.
   - Both branches must iterate over the `DeloadSet[]` output (not the original sets) to respect volume capping.

3. **Restructure the pre-fill to support deload interposition**: The current code has two branches that directly call `addSet()` in their own loops. Refactor to: (a) collect the "candidate sets" from either branch as an array of `{exercise_id, assignment_id, set_type, weight, reps, rir}` objects, (b) if deload, transform via `calculateDeloadSets()` grouped by exercise, (c) write the final set array via `addSet()` in a single loop.

4. **Create integration test** `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts`:
   - Test `deloadPreFillTransform()` — extract the deload transform logic into a pure helper function (or test the logic inline) that takes candidate sets + mesocycle state and returns the transformed set list.
   - Cases: (a) deload week active → sets have ~60% weight, max 3 per exercise, (b) non-deload week → sets unchanged, (c) mesocycle null → sets unchanged, (d) deload disabled (deload_week_number=0) → sets unchanged, (e) template defaults (weight=0) → weight stays 0, volume still capped at 3.

5. **Run tests**: `pnpm test -- deloadIntegration` — all cases pass.

## Must-Haves

- [ ] `handleStartWorkout()` applies deload transform when `isDeloadWeek(mesocycle)` is true
- [ ] Last-session pre-fill branch produces ~60% weight and max 3 working sets when in deload
- [ ] Template-defaults branch caps volume at 3 sets per exercise when in deload
- [ ] Non-deload sessions are completely unaffected (zero behavioral change)
- [ ] Integration test covers both branches and bypass cases

## Verification

- `pnpm test -- deloadIntegration` passes with all 5+ test cases
- `pnpm run build` succeeds

## Observability Impact

- Signals added/changed: `console.log('[Workout] Deload week detected, applying deload transform', ...)` added in `handleStartWorkout()` when deload is active. `console.error('[Workout] Deload transform failed', err)` on any transform error (falls through to normal pre-fill).
- How a future agent inspects this: Check console logs for `[Workout] Deload week detected` after starting a session from a deload-week program.
- Failure state exposed: Deload transform is wrapped in try/catch — on failure, normal weights are used and error is logged. Session still creates successfully.

## Inputs

- `apps/mobile/src/routes/programs/[id]/+page.svelte` — `handleStartWorkout()` function (~line 197)
- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — `isDeloadWeek()`, `calculateDeloadSets()` (tested, 17 tests)
- `apps/mobile/src/lib/types/analytics.ts` — `DeloadSet` type with `original_weight`, `weight`, `reps`, `set_type`
- S01 T05 summary: deloadCalculator returns `DeloadSet[]` with volume capped at 3, weight at 60%, 2.5kg rounding

## Expected Output

- `apps/mobile/src/routes/programs/[id]/+page.svelte` — `handleStartWorkout()` modified with deload detection and transform
- `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts` — new test file with 5+ test cases for deload pre-fill logic
- Optionally: a small extracted helper function if the transform logic benefits from being testable outside the Svelte component
