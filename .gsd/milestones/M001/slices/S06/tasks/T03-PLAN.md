---
estimated_steps: 4
estimated_files: 3
---

# T03: Wire haptics into workout components

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Integrate the haptics service (from T01) into the active workout flow. Three distinct haptic feedback points are wired: (1) medium impact on set confirmation, (2) selection changed on each stepper tick during long-press, and (3) success notification on workout completion. All haptic calls are fire-and-forget — they must not block UI responsiveness.

## Steps

1. Update `src/lib/components/workout/SetRow.svelte` — Import `impactMedium` from `$lib/services/haptics.js`. In the `onconfirm` handler call site (the confirm button's onclick), call `impactMedium()` before or alongside `onconfirm()`. The call is not awaited.
2. Update `src/lib/components/workout/Stepper.svelte` — Import `selectionChanged` from `$lib/services/haptics.js`. In both `increment()` and `decrement()` functions, after the value changes (inside the `if (next !== value)` block), call `selectionChanged()`. Also call it during the long-press repeat interval — the existing `setInterval(action, 100)` already calls increment/decrement, so the haptic fires on each tick.
3. Update `src/routes/workout/[sessionId]/+page.svelte` — Import `notifySuccess` from `$lib/services/haptics.js`. In the workout finish handler (the function that completes the session and navigates away), call `notifySuccess()` after successful DB save but before navigation.
4. Verify by grepping all 3 files for haptics imports.

## Must-Haves

- [ ] `SetRow.svelte` calls `impactMedium()` on set confirm
- [ ] `Stepper.svelte` calls `selectionChanged()` on each value change (single tap and long-press repeat)
- [ ] Workout page calls `notifySuccess()` on workout completion
- [ ] All haptic calls are fire-and-forget (no `await` blocking UI)
- [ ] No new i18n keys needed (haptics are invisible to user text)

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `grep 'impactMedium' apps/mobile/src/lib/components/workout/SetRow.svelte` finds the call
- `grep 'selectionChanged' apps/mobile/src/lib/components/workout/Stepper.svelte` finds the call
- `grep 'notifySuccess' apps/mobile/src/routes/workout/\[sessionId\]/+page.svelte` finds the call

## Observability Impact

- Signals added/changed: Each haptic call triggers a `console.debug('[Haptics] ...')` log (from T01 service). During dev, these logs confirm the calls are being made at the right moments.
- How a future agent inspects this: Open browser devtools console, perform workout actions — debug logs confirm haptic firing
- Failure state exposed: Haptics errors logged to console.error (from T01 try/catch) — silent on web, visible if Capacitor plugin fails on device

## Inputs

- `apps/mobile/src/lib/services/haptics.ts` — Haptics service from T01 with `impactMedium`, `selectionChanged`, `notifySuccess`
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Current SetRow with confirm button onclick
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — Current Stepper with increment/decrement and long-press repeat
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Current workout page with finish handler

## Expected Output

- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Modified with haptics import and `impactMedium()` call
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — Modified with haptics import and `selectionChanged()` calls
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Modified with haptics import and `notifySuccess()` call
