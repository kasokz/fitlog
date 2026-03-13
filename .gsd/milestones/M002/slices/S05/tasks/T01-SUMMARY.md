---
id: T01
parent: S05
milestone: M002
provides:
  - applyDeloadTransform helper function for pre-fill deload interposition
  - CandidateSet type for pre-fill intermediate representation
  - deload transform wired into handleStartWorkout() for both branches
  - integration test with 14 test cases covering deload and bypass paths
key_files:
  - apps/mobile/src/lib/services/analytics/deloadCalculator.ts
  - apps/mobile/src/routes/programs/[id]/+page.svelte
  - apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts
key_decisions:
  - Extracted CandidateSet type and applyDeloadTransform() into deloadCalculator.ts rather than inline in Svelte component — keeps deload logic co-located and fully testable without component mocking
  - Refactored handleStartWorkout to collect-then-transform-then-write pattern instead of direct addSet loops — enables clean deload interposition
  - applyDeloadTransform returns the original array reference when no deload applies — enables cheap identity check for logging
patterns_established:
  - CandidateSet as pre-fill intermediate type between data fetch and DB write
  - Collect → transform → write pattern in handleStartWorkout for extensible pre-fill pipeline
observability_surfaces:
  - console.log('[Workout] Deload week detected, applying deload transform', {mesocycleId, currentWeek}) when deload is active
  - console.error('[Workout] Deload transform failed', err) on transform error with fallthrough to normal pre-fill
duration: 20m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Wire deload transform into session pre-fill and add integration test

**Added `applyDeloadTransform()` helper and wired it into `handleStartWorkout()` so deload weeks produce ~60% weight and max 3 sets per exercise, with 14-case integration test.**

## What Happened

Refactored `handleStartWorkout()` in the program detail page from two separate addSet-loop branches into a three-phase pattern: (1) collect candidate sets from either last-session or template-defaults branch, (2) apply deload transform if mesocycle is in deload week, (3) write final candidates via addSet loop.

Created `CandidateSet` interface and `applyDeloadTransform()` function in `deloadCalculator.ts`. The helper groups candidates by exercise_id, converts them to WorkoutSet-shaped objects for `calculateDeloadSets()`, and maps DeloadSet results back to CandidateSet format preserving assignment_id. When not in a deload week (or mesocycle is null), returns the original array unchanged.

The integration test covers 14 cases across 4 describe blocks: deload active with last-session data (weight reduction, volume capping, multi-exercise, assignment_id preservation), deload active with template defaults (weight stays 0, volume still capped), bypass cases (non-deload week, null mesocycle, deload disabled), and edge cases (empty input, null weight, non-working set filtering).

## Verification

- `pnpm test -- deloadIntegration` — 14 tests pass (deloadIntegration.test.ts)
- `pnpm test -- deloadCalculator` — 17 existing tests still pass (no regressions)
- `pnpm test` — all 339 tests pass across 15 test files
- `pnpm run build` — build succeeds, adapter-static writes to build/

### Slice-level verification status:
- ✅ `pnpm test -- deloadIntegration` passes
- ✅ `pnpm run build` succeeds
- ⬜ Manual: deload banner visible (T02 scope)

## Diagnostics

- When deload is active: look for `[Workout] Deload week detected, applying deload transform` in console with mesocycleId and currentWeek
- On transform error: `[Workout] Deload transform failed` logged, session still creates with normal weights (graceful degradation)
- Identity check: `applyDeloadTransform` returns same reference when no deload — the `transformed !== candidates` check in the component only logs when deload was actually applied

## Deviations

None — plan executed as written. The "optionally extract helper" suggestion was followed (applyDeloadTransform in deloadCalculator.ts).

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/analytics/deloadCalculator.ts` — Added `CandidateSet` type, `applyDeloadTransform()` function, updated module doc
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — Refactored `handleStartWorkout()` to collect→transform→write pattern with deload interposition
- `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts` — New test file with 14 cases covering both branches and bypass paths
