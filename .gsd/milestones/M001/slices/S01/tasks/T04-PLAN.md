---
estimated_steps: 5
estimated_files: 8
---

# T04: Build exercise browse, search, and filter UI

**Slice:** S01 — Data Layer & Exercise Library
**Milestone:** M001

## Description

Build the primary user-facing exercise library UI that allows browsing, searching, and filtering exercises. This is the main deliverable for R001 (Exercise Library with Rich Metadata) and R031 (Exercise Search & Filtering). The UI connects to the real ExerciseRepository and displays data from the SQLite database. Uses shadcn-svelte components (Card, Badge, Command input, Tabs), Svelte 5 runes, runed `Debounced` for search, and Paraglide for i18n.

## Steps

1. **Create the `/exercises` route** with `src/routes/exercises/+layout.ts` (export `ssr = false`) and `src/routes/exercises/+page.svelte`. The page is the orchestrator: initializes DB on mount via `$effect`, holds reactive state for search query, selected muscle group filter, selected equipment filter, and the exercise list. Loads exercises via ExerciseRepository on mount and whenever filters change.

2. **Build ExerciseCard component** (`src/lib/components/exercises/ExerciseCard.svelte`): Displays exercise name, primary muscle group as a Badge (color-coded by group), equipment as a Badge (outline variant), and is_compound indicator. Clicking the card opens the detail view. Use Card component from `@repo/ui`. Keep it compact for mobile — name prominent, badges below.

3. **Build ExerciseFilters component** (`src/lib/components/exercises/ExerciseFilters.svelte`): Contains a search Input with debounced text (use runed `Debounced` with ~300ms delay), muscle group filter as horizontally scrollable Badge toggles (tap to select/deselect), and equipment filter as Badge toggles below or in a collapsible section. Filters emit changes via callback props or bindable state. Show active filter count. Include a "clear filters" action when any filter is active.

4. **Build ExerciseDetail component** (`src/lib/components/exercises/ExerciseDetail.svelte`): Renders inside a Drawer (mobile-friendly bottom sheet). Shows: exercise name (heading), description, primary muscle group, secondary muscle groups as Badge list, equipment, compound/isolation indicator. Include an edit action for custom exercises (edit wiring is T05 scope — just show the button conditionally on `is_custom`).

5. **Add i18n keys and wire everything together**: Add all UI strings to `de.json` first (exercise screen title, search placeholder, filter labels for each muscle group and equipment type, empty state text, detail labels), then add matching `en.json` translations. Wire the page: on mount → init DB → load exercises → render ExerciseList (map of ExerciseCards) → ExerciseFilters controls re-query → ExerciseCard click opens ExerciseDetail Drawer. Handle empty states using the Empty component (EmptyMedia, EmptyTitle, EmptyDescription) for: no exercises found (after filter), loading state.

## Must-Haves

- [ ] `/exercises` route renders exercise library from SQLite data
- [ ] Search input with debounced query (runed `Debounced`)
- [ ] Muscle group filter with visual toggles
- [ ] Equipment filter with visual toggles
- [ ] Exercise detail view in a Drawer
- [ ] Empty state for no results
- [ ] All UI strings in `de.json` and `en.json`
- [ ] Uses shadcn-svelte components (Card, Badge, Drawer, Input, Empty)
- [ ] Icons from `@lucide/svelte`

## Verification

- Dev server: `/exercises` page loads and shows seeded exercises
- Search: typing "bench" filters to bench-related exercises
- Muscle group filter: selecting "chest" shows only chest exercises
- Equipment filter: selecting "barbell" shows only barbell exercises
- Combined: muscle group + equipment narrows results correctly
- Detail: clicking an exercise opens drawer with full info
- Empty state: filtering to impossible combination shows empty state
- i18n: switching locale shows translated UI labels

## Observability Impact

- Signals added/changed: None beyond existing DB signals — UI is purely reactive
- How a future agent inspects this: Navigate to `/exercises` route; use browser accessibility tree to verify rendered exercise cards and filter state
- Failure state exposed: Database initialization errors would prevent page from loading — visible as empty page with console errors

## Inputs

- `src/lib/db/database.ts` — `getDb()` for DB initialization on mount (from T01)
- `src/lib/db/repositories/exercise.ts` — ExerciseRepository for data access (from T02)
- `src/lib/db/seed/exercises.ts` — seed data loads on first init (from T03)
- `src/lib/types/exercise.ts` — Exercise, MuscleGroup, Equipment types (from T01)
- `packages/ui/src/components/ui/` — Card, Badge, Drawer, Input, Empty, Command components

## Expected Output

- `apps/mobile/src/routes/exercises/+layout.ts` — SSR disabled for route
- `apps/mobile/src/routes/exercises/+page.svelte` — exercise library page (orchestrator)
- `apps/mobile/src/lib/components/exercises/ExerciseCard.svelte` — exercise card component
- `apps/mobile/src/lib/components/exercises/ExerciseFilters.svelte` — search + filter controls
- `apps/mobile/src/lib/components/exercises/ExerciseDetail.svelte` — exercise detail drawer
- `apps/mobile/messages/de.json` — updated with all exercise UI keys
- `apps/mobile/messages/en.json` — updated with all exercise UI translations
