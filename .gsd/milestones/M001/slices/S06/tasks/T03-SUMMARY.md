---
id: T03
parent: S06
milestone: M001
provides:
  - Haptic feedback wired into three workout interaction points (set confirm, stepper tick, workout finish)
key_files:
  - apps/mobile/src/lib/components/workout/SetRow.svelte
  - apps/mobile/src/lib/components/workout/Stepper.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
key_decisions:
  - All haptic calls are fire-and-forget (not awaited) to avoid blocking UI responsiveness
patterns_established:
  - Import specific haptics function from service, call inline without await — pattern for future haptics integration points
observability_surfaces:
  - console.debug logs from haptics service confirm calls at each feedback point — '[Haptics] impactMedium()', '[Haptics] selectionChanged()', '[Haptics] notifySuccess()'
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Wire haptics into workout components

**Integrated haptic feedback into set confirmation, stepper value changes, and workout completion.**

## What Happened

Wired the haptics service (from T01) into three workout interaction points:

1. **SetRow.svelte** — `impactMedium()` fires on the confirm button click, alongside the existing `onconfirm` callback. Both calls are inline in the onclick handler.
2. **Stepper.svelte** — `selectionChanged()` fires inside both `increment()` and `decrement()` after the value changes (inside the `if (next !== value)` guard). Since the long-press repeat interval calls these same functions, haptics automatically fire on each tick.
3. **Workout page** — `notifySuccess()` fires after `WorkoutRepository.completeSession()` succeeds but before navigation and toast, giving the user immediate haptic confirmation of workout completion.

All three calls are fire-and-forget — no `await` is used, so UI responsiveness is never blocked by the async Capacitor bridge.

## Verification

- `grep 'impactMedium' apps/mobile/src/lib/components/workout/SetRow.svelte` — found import and call ✅
- `grep 'selectionChanged' apps/mobile/src/lib/components/workout/Stepper.svelte` — found import and 2 calls (increment + decrement) ✅
- `grep 'notifySuccess' apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — found import and call ✅
- `pnpm --filter mobile check` — 10 pre-existing errors (all in exercise repository tests and form), 0 new errors from haptics changes ✅
- Slice-level grep check: `grep 'impactMedium\|selectionChanged\|notifySuccess'` across all 3 files confirms all haptic calls wired ✅

## Diagnostics

- Open browser devtools console during workout flow — `[Haptics] impactMedium()` on set confirm, `[Haptics] selectionChanged()` on stepper taps/long-press, `[Haptics] notifySuccess()` on workout finish
- On web, Capacitor errors are caught and silently swallowed (by design from T01 service)
- On device, actual haptic vibrations fire at each point

## Deviations

None.

## Known Issues

- 10 pre-existing type errors in `exercise-repository.test.ts` and `ExerciseForm.svelte` — unrelated to this task, existed before T03.

## Files Created/Modified

- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Added `impactMedium` import and fire-and-forget call on confirm button click
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — Added `selectionChanged` import and calls in both increment and decrement functions
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Added `notifySuccess` import and call after successful workout completion
