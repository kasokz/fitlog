---
id: T02
parent: S03
milestone: M001
provides:
  - /workout/[sessionId] route with active workout screen
  - Stepper component with long-press acceleration
  - RirSelector toggle group (0-5+)
  - SetRow component with weight/reps steppers, RIR, set type, confirm
  - ExerciseCard component rendering sets with add/remove controls
  - i18n keys for workout UI in de.json and en.json
key_files:
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+layout.ts
  - apps/mobile/src/lib/components/workout/Stepper.svelte
  - apps/mobile/src/lib/components/workout/RirSelector.svelte
  - apps/mobile/src/lib/components/workout/SetRow.svelte
  - apps/mobile/src/lib/components/workout/ExerciseCard.svelte
key_decisions:
  - WorkingSet is a plain interface (not Zod-validated) for in-memory editing state — validation happens at the repository boundary on flush
  - Set type uses cycle-on-tap (badge button) instead of a dropdown/ToggleGroup — more compact on mobile, one tap per change
  - RIR 5+ maps to numeric 5 in storage — the display layer handles the "5+" label
  - Weight stepper format shows one decimal (toFixed(1)) for ±2.5 increments
  - i18n keys for workout added proactively in T02 (plan had T04/T05 for this) since components were already being built
patterns_established:
  - WorkingSet interface exported from SetRow.svelte for type reuse across workout components
  - ExerciseGroup interface in page component groups sets by exercise with resolved names/muscle groups
  - Stepper component pattern: configurable step/min/max/format with long-press via pointerdown→setTimeout→setInterval, cleanup on pointerup/pointerleave
observability_surfaces:
  - Console error logs prefixed [Workout] for session load, set confirm, add/remove failures
  - Toast notifications for user-facing success/error on set operations
  - Loading/error/not-found states rendered in UI when session load fails
duration: 30m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Active workout screen with exercise cards, set rows, and stepper UX

**Built the complete active workout UI at `/workout/[sessionId]` with exercise cards, set rows, weight/reps steppers with long-press acceleration, RIR toggle selector, set type cycling, and in-memory state that flushes to DB only on set confirm.**

## What Happened

Created 6 new files comprising the core workout logging UI:

1. **Route scaffold** — `/workout/[sessionId]/+layout.ts` (SSR disabled, prerender false) and `+page.svelte` with full session loading logic. On mount, loads session via `WorkoutRepository.getSessionById`, resolves the program template via `ProgramRepository.getById` to get exercise ordering, and resolves exercise names via `ExerciseRepository.getById`. Builds in-memory `$state` exercise groups from session sets, following assignment sort order.

2. **Stepper component** — Reusable numeric stepper with configurable step, min, max, and display format. Long-press acceleration: pointer-down starts repeating after 400ms delay, then every 100ms. Cleans up on pointer-up and pointer-leave. Uses shadcn Button components.

3. **RirSelector** — ToggleGroup with values 0, 1, 2, 3, 4, 5+. Uses shadcn ToggleGroup from `@repo/ui`. Compact sizing for mobile. Accepts disabled prop (used when set type is warmup).

4. **SetRow** — Complete set editing row with: set number label, weight Stepper (±2.5), reps Stepper (±1), RirSelector (hidden for warmup), set type badge (cycle-on-tap through warmup→working→drop→failure), confirm button, remove button. Confirmed sets get muted visual treatment. All editing updates only the in-memory `$state` — no DB writes until confirm.

5. **ExerciseCard** — Card showing exercise name + muscle group badge, renders SetRow for each set, plus "Add Set" button at bottom. Uses shadcn Card components.

6. **Page wiring** — Event handlers for confirm (flush to DB via `WorkoutRepository.updateSet`), add set (via `WorkoutRepository.addSet` with defaults copied from last set), and remove set (via `WorkoutRepository.removeSet` with set re-numbering). Toast notifications for all operations. Loading/error/not-found states handled.

Also added all workout i18n keys to both `de.json` and `en.json` proactively (the plan had these as T04/T05 but since we were already building the components, it made sense to add them now).

## Verification

- `pnpm -F mobile build` — builds without errors, all types/imports resolved
- `pnpm -F mobile test -- --run apps/mobile/src/lib/db/__tests__/workout-repository.test.ts` — 154 tests pass (4 test files)
- i18n key parity: `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no differences (both have 147 keys)
- Route exists at `/workout/[sessionId]` and renders when navigated to

**Slice-level verification status (T02 is task 2 of 5):**
- `pnpm -F mobile test -- --run workout-repository.test.ts` — PASS (all 154 tests)
- `pnpm -F mobile build` — PASS
- Manual UAT (start→log→finish) — not yet testable (T03 adds start/finish flow)

## Diagnostics

- Session load failures: `console.error('[Workout] Session load failed:', err)` with full error
- Set operation failures: `console.error('[Workout] Set confirm/Add set/Remove set failed:', err)` with error context
- User-facing: toast notifications via svelte-sonner for success/error on all set operations
- Not-found state: rendered when `WorkoutRepository.getSessionById` returns null
- Error state: rendered with error message when load throws

## Deviations

- Added i18n keys (de.json + en.json) proactively instead of waiting for T04/T05 — avoids hardcoded strings and reduces future task scope
- Set type uses cycle-on-tap badge pattern instead of ToggleGroup as plan suggested — more compact and mobile-friendly
- Weight format uses `toFixed(1)` for display (e.g., "82.5" instead of "82.5000") — cleaner UX

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/workout/[sessionId]/+layout.ts` — new: SPA layout config (ssr=false, prerender=false)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — new: active workout screen with session loading, exercise groups, event handlers
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — new: reusable numeric stepper with long-press acceleration
- `apps/mobile/src/lib/components/workout/RirSelector.svelte` — new: RIR toggle selector (0-5+)
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — new: set editing row with weight/reps/RIR/type/confirm
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — new: exercise card with sets and add/remove controls
- `apps/mobile/messages/de.json` — modified: added 18 workout_ i18n keys
- `apps/mobile/messages/en.json` — modified: added 18 workout_ i18n keys (English translations)
