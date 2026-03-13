# S06: Design Polish & Platform Builds

**Goal:** All screens have polished neobrutalist design with hard shadows, bold borders, and consistent layout patterns. Haptic feedback fires on key workout actions. Dark/light mode has a user-facing toggle. A bottom tab navigation replaces the home grid for primary navigation. Exercises can be reordered via drag-and-drop. iOS and Android native projects are scaffolded and the app builds for both platforms.

**Demo:** Open the app — a bottom tab bar navigates between Programs, Exercises, History, Body Weight, and Settings. Cards have hard shadows and bold borders. Go to Settings and toggle dark/light mode. Start a workout, confirm a set — feel haptic feedback (on device). Edit a program's training day and reorder exercises by dragging. Run `npx cap sync` and open in Xcode/Android Studio.

## Must-Haves

- Bottom tab navigation bar with 5 tabs (Programs, Exercises, History, Body Weight, Settings)
- Safe-area padding applied to layout (top and bottom)
- Haptics service wrapping `@capacitor/haptics` with web-safe fallback
- Haptic feedback wired into set confirmation, workout finish, and stepper long-press
- Settings page with dark/light/system mode toggle using `mode-watcher`
- dnd-kit sortable replacing up/down buttons in ExerciseAssignmentList
- Neobrutalist polish across all screens: hard shadow cards, consistent headers, bold typography
- `capacitor.config.ts` updated with real appId and appName
- `pnpm build` succeeds and native projects scaffolded (`npx cap add ios/android`, `npx cap sync`)
- All new i18n keys added to `de.json` (en translation deferred to S07)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (build must succeed; haptics and native scaffold verified by build + sync)
- Human/UAT required: yes (visual design quality, haptic feel on real device — deferred to S06-UAT)

## Verification

- `pnpm --filter @repo/mobile build` — exits 0, `apps/mobile/build/` directory exists with `index.html`
- `ls apps/mobile/ios/App` — iOS project exists
- `ls apps/mobile/android/app` — Android project exists
- `grep -r 'haptics' apps/mobile/src/lib/services/haptics.ts` — haptics service file exists with exported functions
- `grep 'impactMedium\|selectionChanged\|notifySuccess' apps/mobile/src/lib/components/workout/SetRow.svelte apps/mobile/src/lib/components/workout/Stepper.svelte apps/mobile/src/routes/workout/\[sessionId\]/+page.svelte` — haptic calls wired into workout components
- `grep 'mode-watcher\|setMode\|toggleMode' apps/mobile/src/routes/settings/+page.svelte` — settings page with mode toggle exists
- `grep 'dnd-kit\|createSortable\|@attach' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — dnd-kit replaces chevron buttons
- `grep 'BottomNav\|bottom-nav\|tab-bar' apps/mobile/src/routes/+layout.svelte` — bottom nav wired into layout
- `grep 'pt-safe-top\|pb-safe-bottom' apps/mobile/src/routes/+layout.svelte` — safe-area padding applied
- Key count check: `jq 'keys | length' apps/mobile/messages/de.json` returns more than 230 (new settings/nav keys added)

## Observability / Diagnostics

- Runtime signals: Haptics service logs calls at `console.debug` level in dev mode for verification without a device. Pattern: `[Haptics] impactMedium()`, `[Haptics] selectionChanged()`.
- Inspection surfaces: `pnpm build` exit code and build output directory. `npx cap sync` output. Settings page visually shows current mode.
- Failure visibility: Build errors surface in stdout. Haptics calls silently no-op on web (by design). dnd-kit import errors surface at build time.
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: All existing routes and components from S01–S05; `mode-watcher` (already in deps); `@capacitor/haptics` (already in deps); `@dnd-kit/svelte` (new install); design tokens from `packages/ui/src/globals.css`
- New wiring introduced in this slice: Bottom tab navigation in root layout; haptics service consumed by workout components; settings route with mode toggle; dnd-kit sortable in ExerciseAssignmentList; safe-area padding in layout; native iOS/Android projects
- What remains before the milestone is truly usable end-to-end: S07 i18n (en translations for all UI text)

## Tasks

- [x] **T01: Create haptics service and settings page with mode toggle** `est:1h`
  - Why: R033 (haptic feedback) and R034 (dark/light mode toggle) need foundational service and UI before wiring into screens. Settings page is a new route that doesn't exist yet.
  - Files: `src/lib/services/haptics.ts`, `src/routes/settings/+page.svelte`, `messages/de.json`
  - Do: Create haptics service wrapping `@capacitor/haptics` with semantic methods (`impactLight`, `impactMedium`, `impactHeavy`, `notifySuccess`, `selectionChanged`). Each method logs at debug level in dev. Add `/settings` route with dark/light/system mode selector using `mode-watcher`'s `setMode()` and `mode` state. Use shadcn-svelte toggle-group or radio-group for mode picker. Add new i18n keys to `de.json`.
  - Verify: `pnpm --filter @repo/mobile check` passes. Settings page file exists. Haptics service exports all 5 methods.
  - Done when: Haptics service is importable and settings page renders with mode toggle.

- [x] **T02: Add bottom tab navigation and safe-area layout** `est:1h`
  - Why: R009 (striking mobile UI) requires proper mobile navigation patterns. Current home-grid pattern is replaced by a persistent bottom tab bar. Safe-area padding prevents content from hiding under notches and home indicators.
  - Files: `src/lib/components/BottomNav.svelte`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `messages/de.json`
  - Do: Create `BottomNav.svelte` with 5 tabs (Programs, Exercises, History, Body Weight, Settings) using lucide icons and `page.url.pathname` for active state. Wire into root layout below `{@render children()}`. Add `pt-safe-top` to layout header area and `pb-safe-bottom` to bottom nav. Coordinate z-index with workout rest timer (`z-40` → bottom nav at `z-50`). Update home page to be a dashboard/landing rather than a navigation grid. Add i18n keys for settings nav.
  - Verify: `pnpm --filter @repo/mobile check` passes. Layout has safe-area classes. BottomNav component exists with 5 tabs.
  - Done when: Bottom nav renders on all pages with active-tab highlighting and safe-area padding is applied.

- [x] **T03: Wire haptics into workout components** `est:45m`
  - Why: R033 requires haptic feedback on set confirmation, workout finish, and stepper value changes. The haptics service from T01 needs to be integrated into the existing workout flow.
  - Files: `src/lib/components/workout/SetRow.svelte`, `src/lib/components/workout/Stepper.svelte`, `src/routes/workout/[sessionId]/+page.svelte`
  - Do: Import haptics service. Add `impactMedium()` on set confirm button click in SetRow. Add `selectionChanged()` on each stepper value change during long-press repeat. Add `notifySuccess()` on workout finish (complete workout button). All calls are fire-and-forget (no await blocking UI).
  - Verify: `grep 'haptics' apps/mobile/src/lib/components/workout/SetRow.svelte apps/mobile/src/lib/components/workout/Stepper.svelte apps/mobile/src/routes/workout/\[sessionId\]/+page.svelte` shows haptics imports and calls in all 3 files.
  - Done when: Three distinct haptic feedback points are wired: set confirm, stepper tick, workout finish.

- [x] **T04: Replace exercise reorder with dnd-kit sortable** `est:1h`
  - Why: D020 explicitly mandates "upgrade to dnd-kit in S06." Current up/down chevron buttons are clunky on mobile. Drag-and-drop is the expected UX for list reordering.
  - Files: `src/lib/components/programs/ExerciseAssignmentList.svelte`, `package.json`
  - Do: Install `@dnd-kit/svelte`. Replace `ChevronUp`/`ChevronDown` buttons with `createSortable` from `@dnd-kit/svelte/sortable` using `{@attach}` directive. Wrap the list in `<DragDropProvider>`. Add drag handle (GripVertical icon). Configure `activationConstraint: { distance: 8 }` on PointerSensor to avoid conflicts with scroll. On sort end, map new order to IDs and call `onreorder`. Add `selectionChanged()` haptic on drag start.
  - Verify: `pnpm --filter @repo/mobile check` passes. `grep 'createSortable' apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` finds the import. No ChevronUp/ChevronDown imports remain.
  - Done when: Exercise assignments in training days can be reordered by dragging, ChevronUp/ChevronDown buttons are removed.

- [x] **T05: Neobrutalist polish pass — layout, home, and content pages** `est:1.5h`
  - Why: R009 (striking mobile UI) is the primary requirement. All screens need consistent neobrutalist styling using the existing design tokens (hard shadows, bold borders, `--radius: 0px`, oklch palette). Currently screens are functional but visually plain.
  - Files: `src/routes/+page.svelte`, `src/routes/exercises/+page.svelte`, `src/routes/programs/+page.svelte`, `src/routes/programs/[id]/+page.svelte`, `src/routes/history/+page.svelte`, `src/routes/bodyweight/+page.svelte`, `src/routes/onboarding/+page.svelte`
  - Do: Apply consistent page header pattern (bold title, optional subtitle) across all routes. Enhance Cards with explicit `shadow-md border-2 border-border` classes for neobrutalist look. Improve empty states with neobrutalist styling. Add `font-mono` to numeric data (weights, reps, dates). Ensure all pages use `container mx-auto max-w-lg` consistently. Update home page from navigation grid to a proper dashboard (since bottom nav handles navigation) — show active program summary, recent workout, quick-start button.
  - Verify: `pnpm --filter @repo/mobile check` passes. Visual inspection of consistent styling patterns via `grep 'shadow-md\|border-2\|border-border' apps/mobile/src/routes/*/+page.svelte` shows styling applied across pages.
  - Done when: All 9 page routes have consistent neobrutalist styling with hard shadows and bold borders.

- [x] **T06: Neobrutalist polish pass — workout and component cards** `est:1h`
  - Why: Workout logging (R003) and its sub-components (SetRow, ExerciseCard, SessionCard, etc.) are the most-used screens. They need premium feel matching the neobrutalist design system.
  - Files: `src/lib/components/workout/SetRow.svelte`, `src/lib/components/workout/ExerciseCard.svelte`, `src/lib/components/workout/RestTimer.svelte`, `src/lib/components/history/SessionCard.svelte`, `src/lib/components/history/SessionDetail.svelte`, `src/lib/components/programs/ProgramCard.svelte`, `src/lib/components/programs/TrainingDayCard.svelte`, `src/lib/components/onboarding/TemplateCard.svelte`
  - Do: Apply neobrutalist card treatment to all card components: `border-2 border-border shadow-md`. Style completed sets distinctively (muted bg + strikethrough or opacity). Make set type badges more prominent with bold borders. Style rest timer with strong visual presence (larger, bolder). Apply `font-mono` to numeric displays. Ensure consistent spacing and typography across all cards.
  - Verify: `pnpm --filter @repo/mobile check` passes. `grep 'border-2\|shadow-md' apps/mobile/src/lib/components/workout/SetRow.svelte apps/mobile/src/lib/components/workout/ExerciseCard.svelte apps/mobile/src/lib/components/history/SessionCard.svelte apps/mobile/src/lib/components/programs/ProgramCard.svelte` confirms styling applied.
  - Done when: All card-like components have consistent neobrutalist styling.

- [x] **T07: Scaffold native iOS and Android projects** `est:1h`
  - Why: R011 (iOS + Android builds) requires native projects to exist. No `ios/` or `android/` directories exist yet. This is the final task because it depends on a successful `pnpm build` and all UI being finalized.
  - Files: `capacitor.config.ts`, `ios/` (generated), `android/` (generated)
  - Do: Update `capacitor.config.ts` with real `appId` (e.g., `com.fitlog.app`) and `appName` (`FitLog`). Run `pnpm --filter @repo/mobile build` to generate `build/` output. Run `npx cap add ios` and `npx cap add android` from `apps/mobile/`. Run `npx cap sync` to copy web assets and install plugins. Verify both project directories exist with proper structure. Add `ios/` and `android/` to `.gitignore` if not already there (generated native projects are typically not committed).
  - Verify: `ls apps/mobile/ios/App/App.xcodeproj` exits 0. `ls apps/mobile/android/app/build.gradle.kts` exits 0. `grep 'com.fitlog.app' apps/mobile/capacitor.config.ts` confirms appId.
  - Done when: Both native projects exist, `capacitor.config.ts` has real appId/appName, and `npx cap sync` succeeds.

## Files Likely Touched

- `apps/mobile/src/lib/services/haptics.ts` (new)
- `apps/mobile/src/lib/components/BottomNav.svelte` (new)
- `apps/mobile/src/routes/settings/+page.svelte` (new)
- `apps/mobile/src/routes/+layout.svelte`
- `apps/mobile/src/routes/+page.svelte`
- `apps/mobile/src/routes/exercises/+page.svelte`
- `apps/mobile/src/routes/programs/+page.svelte`
- `apps/mobile/src/routes/programs/[id]/+page.svelte`
- `apps/mobile/src/routes/history/+page.svelte`
- `apps/mobile/src/routes/history/[sessionId]/+page.svelte`
- `apps/mobile/src/routes/bodyweight/+page.svelte`
- `apps/mobile/src/routes/onboarding/+page.svelte`
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`
- `apps/mobile/src/lib/components/workout/SetRow.svelte`
- `apps/mobile/src/lib/components/workout/Stepper.svelte`
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte`
- `apps/mobile/src/lib/components/workout/RestTimer.svelte`
- `apps/mobile/src/lib/components/history/SessionCard.svelte`
- `apps/mobile/src/lib/components/history/SessionDetail.svelte`
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte`
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte`
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte`
- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/messages/de.json`
- `apps/mobile/package.json`
