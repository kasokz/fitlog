---
id: T04
parent: S01
milestone: M001
provides:
  - Exercise library browse page at /exercises with real SQLite data
  - Search input with debounced query via runed Debounced (300ms)
  - Muscle group and equipment filter toggles with visual badge selection
  - Exercise detail bottom sheet drawer with full metadata display
  - Empty state UI for no results
  - i18n keys for all exercise UI in de.json and en.json
key_files:
  - apps/mobile/src/routes/exercises/+page.svelte
  - apps/mobile/src/lib/components/exercises/ExerciseCard.svelte
  - apps/mobile/src/lib/components/exercises/ExerciseFilters.svelte
  - apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte
  - apps/mobile/src/lib/components/exercises/i18n-maps.ts
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Horizontally scrollable badge toggles for filters instead of dropdown selects — better mobile UX and touch targets
  - i18n-maps.ts as separate module to map MuscleGroup/Equipment enums to paraglide message functions — avoids repeated switch statements across components
  - Debounced search combined with immediate filter change dispatch — search debounces via runed Debounced, but muscle group and equipment filter changes trigger immediate re-query
  - Button wrapper around Card for exercise items (not Card onclick) — better accessibility with native button semantics
patterns_established:
  - Exercise component directory at src/lib/components/exercises/ with co-located i18n helper
  - Filter state held in page orchestrator, passed to filter component via bindable props, changes dispatched via onchange callback
  - Drawer-based mobile detail view pattern — exercise card click opens bottom sheet with full metadata
observability_surfaces:
  - Console: [DB] prefix logs for database initialization on page mount
  - Console: [Exercises] prefix logs for load/init failures
  - UI: exercise count displayed in header reflects current filter state
  - UI: active filter count badge shows how many filters are active
duration: ~30 minutes
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Build exercise browse, search, and filter UI

**Built the /exercises page with search, muscle group/equipment filters, exercise cards, and detail drawer — all rendering real data from 55 seeded SQLite exercises.**

## What Happened

Created the primary exercise library UI as 4 components plus a page orchestrator:

1. **ExerciseCard** — compact card showing exercise name, compound indicator icon (Layers), primary muscle group badge, and equipment badge
2. **ExerciseFilters** — search input with Lucide Search icon, horizontally scrollable muscle group badges, equipment badges, active filter count, and clear button
3. **ExerciseDetail** — vaul-svelte bottom sheet drawer showing full exercise metadata (name, description, primary/secondary muscles, equipment, compound/isolation type, conditional edit button for custom exercises)
4. **Page orchestrator** (`+page.svelte`) — initializes DB on mount via $effect, manages reactive state for search/filters, uses runed Debounced (300ms) for search input, dispatches ExerciseRepository.combinedFilter on every filter change
5. **i18n-maps.ts** — maps MuscleGroup and Equipment enum values to their paraglide message functions, used by all three display components

Added 38 new i18n keys to both de.json and en.json covering exercise screen title, search placeholder, all 12 muscle group labels, all 8 equipment labels, filter UI, detail labels, and empty state text.

## Verification

- **Tests**: `pnpm --filter mobile test -- --run` — 70 tests pass (2 files, all green)
- **Dev server /exercises**: Page loads showing all 55 seeded exercises with cards
- **Search "bench"**: After 300ms debounce, filters to 3 exercises (Bench Press, Close-Grip Bench Press, Incline Bench Press)
- **Muscle group filter "Chest"**: Clicking Chest badge highlights it and shows 6 chest exercises
- **Equipment filter "Barbell"**: Combined with Chest filter, narrows to 2 exercises
- **Detail drawer**: Clicking Bench Press opens drawer showing description, Chest primary, Triceps/Shoulders secondary, Barbell equipment, Compound type
- **Empty state**: Searching "xyznonexistent" shows empty state with icon, "No exercises found" title, and suggestion text
- **Clear filters**: Resets all filters and shows all 55 exercises
- **i18n**: All UI strings use paraglide message functions, both de.json and en.json have matching keys

## Diagnostics

- Navigate to `/exercises` route to see the exercise library
- Browser accessibility tree shows exercise card buttons, filter badges, search input
- Console logs with `[DB]` prefix show database initialization state
- Console logs with `[Exercises]` prefix surface load/init errors
- Exercise count in header reflects current filter results (e.g., "6 exercises" when Chest selected)

## Deviations

- Used native `overflow-x-auto` with `scrollbar-none` class for horizontal filter scrolling instead of ScrollArea component — simpler and works well for badge rows on mobile
- Added `common_close` i18n key (not in original plan) for the drawer close button

## Known Issues

- Pre-existing type errors in exercise-repository.test.ts (ExerciseRow constraint and update method signature) — these are from prior tasks and don't affect runtime or test execution (all 70 tests pass)

## Files Created/Modified

- `apps/mobile/src/routes/exercises/+layout.ts` — SSR disabled for exercises route
- `apps/mobile/src/routes/exercises/+page.svelte` — exercise library page orchestrator with DB init, search, filter, and detail state management
- `apps/mobile/src/lib/components/exercises/ExerciseCard.svelte` — compact exercise card with name, compound icon, muscle group and equipment badges
- `apps/mobile/src/lib/components/exercises/ExerciseFilters.svelte` — search input with debounce, muscle group and equipment badge toggles, filter count and clear
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — bottom sheet drawer with full exercise metadata and conditional edit button
- `apps/mobile/src/lib/components/exercises/i18n-maps.ts` — enum-to-i18n message function maps for muscle groups and equipment
- `apps/mobile/messages/de.json` — added 38 exercise UI i18n keys (German)
- `apps/mobile/messages/en.json` — added 38 exercise UI i18n keys (English)
