---
id: T03
parent: S04
milestone: M001
provides:
  - /history route with completed session list (cards with date, training day name, exercise count, sets, duration)
  - /history/[sessionId] route with read-only session detail (exercises, sets, weight, reps, RIR, set type)
  - SessionCard and SessionDetail reusable components
  - 15 history_* i18n keys in de.json
key_files:
  - apps/mobile/src/routes/history/+page.svelte
  - apps/mobile/src/routes/history/[sessionId]/+page.svelte
  - apps/mobile/src/lib/components/history/SessionCard.svelte
  - apps/mobile/src/lib/components/history/SessionDetail.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Detail page dynamically imports ProgramRepository to resolve training day name rather than adding a join to getSessionDetail — keeps repository method simple and reuses existing ProgramRepository.getById
  - SessionDetail groups sets by exercise_id preserving first-appearance order rather than relying on assignment order — works correctly even for sessions with exercises not in the current program template
patterns_established:
  - History page pattern: init DB in $effect, load via repository, loading/empty/error states, card-based list with goto navigation
  - Read-only session detail pattern: reuse workout set type labels, show weight/reps/RIR in compact row format with badges
observability_surfaces:
  - "[History] Load failed:" and "[History] Detail load failed:" console errors propagate to UI error state
  - Loading, empty, not-found, and error states visible in UI
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Workout history UI — list and detail routes with i18n

**Built workout history browsing: /history list page with session cards and /history/[sessionId] detail page with read-only exercise/set data, all using German i18n keys.**

## What Happened

Added 15 `history_*` i18n keys to `de.json` covering both list and detail views. Created `+layout.ts` with `ssr = false` in both route directories. Built `SessionCard.svelte` component that renders a completed session as a Card with formatted date, training day name, and badges for exercise count, set count, and duration. Built the `/history` list page following the exercises page pattern (init DB in `$effect`, loading/empty/error states). Built `SessionDetail.svelte` that groups sets by exercise, rendering each set as a compact read-only row with set number, type badge, weight, reps, and RIR. Built the `/history/[sessionId]` detail page that loads session data via `WorkoutRepository.getSessionDetail()` and resolves the training day name from the program.

## Verification

- `pnpm --filter mobile build` — succeeds with no type errors
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^"history_'` — returns 15 (>= 10 required)
- Route files exist: `src/routes/history/+page.svelte`, `src/routes/history/[sessionId]/+page.svelte`
- All 180 existing tests pass (bodyweight-repository + workout-repository)
- Slice-level checks: build passes, history i18n keys exist, all repository tests pass

## Diagnostics

- Navigate to `/history` to see completed session list; empty state shows when no sessions exist
- Navigate to `/history/[id]` to see session detail; not-found state shows for invalid IDs
- Console errors prefixed with `[History]` on load failures

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/de.json` — added 15 history_* i18n keys
- `apps/mobile/src/routes/history/+layout.ts` — ssr=false for history routes
- `apps/mobile/src/routes/history/+page.svelte` — history list page
- `apps/mobile/src/routes/history/[sessionId]/+layout.ts` — ssr=false for detail route
- `apps/mobile/src/routes/history/[sessionId]/+page.svelte` — session detail page
- `apps/mobile/src/lib/components/history/SessionCard.svelte` — session summary card component
- `apps/mobile/src/lib/components/history/SessionDetail.svelte` — read-only session detail component
