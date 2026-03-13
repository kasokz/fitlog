---
id: T02
parent: S06
milestone: M001
provides:
  - Persistent bottom tab navigation (BottomNav.svelte) with 5 tabs — Programs, Exercises, History, Body Weight, Settings
  - Safe-area insets applied to layout (pt-safe-top) and bottom nav (pb-safe-bottom)
  - Home page redirects to /programs as default destination
key_files:
  - apps/mobile/src/lib/components/BottomNav.svelte
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/src/routes/+page.svelte
key_decisions:
  - Home page redirects to /programs instead of showing a dashboard — navigation grid is fully replaced by bottom tab bar
  - Bottom nav hidden during workout sessions (/workout/*) so RestTimer at z-40 has no z-index conflict
  - Bottom nav also hidden during onboarding
patterns_established:
  - showBottomNav derived state in layout controls both nav rendering and main content bottom padding (class:pb-20)
  - Tab active state detected via pathname prefix matching (exact or startsWith with /)
observability_surfaces:
  - none — purely UI/layout change
duration: 1 context window
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Add bottom tab navigation and safe-area layout

**Built persistent bottom tab bar with 5 tabs, safe-area insets, and redirected home page to /programs.**

## What Happened

Created `BottomNav.svelte` — a fixed-bottom navigation bar with 5 tabs (Programs, Exercises, History, Body Weight, Settings). Each tab uses a Lucide icon and i18n label. Active tab is determined by matching `page.url.pathname` against each tab's href (exact match or prefix). Active tabs get `text-primary font-bold`; inactive get `text-muted-foreground`.

Updated `+layout.svelte` to import and conditionally render the BottomNav. A `showBottomNav` derived state hides the nav during onboarding and active workout sessions. Added `pt-safe-top` to the outer container and conditional `pb-20` to main content so it's not occluded by the fixed nav. The BottomNav itself applies `pb-safe-bottom` for home indicator clearance.

Transformed `+page.svelte` from a 2x2 card navigation grid to a simple redirect to `/programs`, since the bottom tab bar now handles all primary navigation.

Added missing `nav_settings` key to `en.json` (was already present in `de.json`).

No z-index coordination needed for the rest timer — the bottom nav is hidden during workout pages, so the RestTimer's `z-40 fixed bottom-0` has no overlap.

## Verification

- `test -f apps/mobile/src/lib/components/BottomNav.svelte` — PASS
- `grep 'BottomNav' apps/mobile/src/routes/+layout.svelte` — PASS (import + rendering)
- `grep 'pt-safe-top' apps/mobile/src/routes/+layout.svelte` — PASS
- `grep 'pb-safe-bottom' apps/mobile/src/lib/components/BottomNav.svelte` — PASS
- `pnpm --filter mobile check` — 0 errors from new/modified files (10 pre-existing errors in exercise repository tests and ExerciseForm, unrelated)
- Slice checks: BottomNav in layout PASS, safe-area classes PASS, key count 236 > 230 PASS

## Diagnostics

None — purely UI/layout. Future agents can inspect `+layout.svelte` for the `showBottomNav` logic and `BottomNav.svelte` for tab configuration.

## Deviations

- Plan Step 3 suggested keeping a minimal dashboard or redirecting. Chose redirect to `/programs` as simplest approach — bottom nav makes a separate dashboard redundant.
- Plan Step 5 (z-index coordination with rest timer) turned out to be unnecessary — bottom nav is already hidden on workout pages, so no overlap occurs.

## Known Issues

- Pre-existing: 10 type errors in exercise repository tests and ExerciseForm (unrelated to this task)

## Files Created/Modified

- `apps/mobile/src/lib/components/BottomNav.svelte` — New bottom tab navigation component with 5 tabs, icons, i18n labels, and active state detection
- `apps/mobile/src/routes/+layout.svelte` — Added BottomNav import, showBottomNav derived state, pt-safe-top, conditional pb-20
- `apps/mobile/src/routes/+page.svelte` — Replaced navigation grid with redirect to /programs
- `apps/mobile/messages/en.json` — Added missing nav_settings key
