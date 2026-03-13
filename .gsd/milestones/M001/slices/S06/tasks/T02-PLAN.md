---
estimated_steps: 5
estimated_files: 5
---

# T02: Add bottom tab navigation and safe-area layout

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Replace the current home-page navigation grid with a persistent bottom tab bar across the app. This is a structural layout change that fundamentally improves the mobile UX (R009). The tab bar provides access to all primary sections: Programs, Exercises, History, Body Weight, and Settings. Safe-area insets are applied to the layout to prevent content from hiding behind notches and home indicators on iOS/Android.

## Steps

1. Create `src/lib/components/BottomNav.svelte` — Build a fixed-bottom tab bar with 5 tabs. Each tab has an icon (ClipboardList, Dumbbell, History, Scale, Settings from `@lucide/svelte`) and a label using `m.*()` i18n functions. Use `page` from `$app/state` to determine the active tab by matching `page.url.pathname`. Active tab gets `text-primary font-bold` styling; inactive gets `text-muted-foreground`. Container: `fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-border pb-safe-bottom`. Each tab is a `<a>` link with `href` for proper SvelteKit navigation.
2. Update `src/routes/+layout.svelte` — Import and render `BottomNav` after the `{@render children()}` call. Add `pt-safe-top` class to the outer container. Add `pb-20` (or appropriate bottom padding) to `<main>` to prevent content from hiding behind the fixed bottom nav. Ensure the bottom nav only renders when `ready` is true and not on the `/onboarding` route.
3. Update `src/routes/+page.svelte` — Transform from navigation grid to a dashboard/home page. Since bottom nav handles navigation, the home page should show: app title, a quick-start workout button (if an active program exists), and a summary of recent activity. Keep it simple — the primary navigation now lives in the bottom tab bar. Make programs the default "home" destination by having the home route redirect to `/programs`, or keep a minimal dashboard.
4. Add any missing i18n keys to `de.json` — `nav_settings` (if not present), ensure all 5 tab labels have corresponding keys.
5. Coordinate z-index with workout rest timer — rest timer is `z-40 fixed bottom-0`. Bottom nav is `z-50`. During active workouts, the rest timer should appear above the bottom nav content area but the nav should still be visible. Consider adding `mb-[bottomNavHeight]` to the rest timer's positioning so they don't overlap.

## Must-Haves

- [ ] `BottomNav.svelte` renders 5 tabs with icons and i18n labels
- [ ] Active tab is visually distinguished based on current URL
- [ ] Bottom nav is fixed at bottom of screen with `z-50`
- [ ] `pt-safe-top` applied to layout
- [ ] `pb-safe-bottom` applied to bottom nav
- [ ] Main content area has padding to not be occluded by bottom nav
- [ ] Bottom nav hidden during onboarding
- [ ] Home page updated (no longer navigation grid since bottom nav handles it)

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `test -f apps/mobile/src/lib/components/BottomNav.svelte` exits 0
- `grep 'BottomNav' apps/mobile/src/routes/+layout.svelte` confirms import
- `grep 'pt-safe-top' apps/mobile/src/routes/+layout.svelte` confirms safe-area
- `grep 'pb-safe-bottom' apps/mobile/src/lib/components/BottomNav.svelte` confirms safe-area on nav

## Observability Impact

- Signals added/changed: None — purely UI/layout
- How a future agent inspects this: Check layout.svelte for BottomNav import and safe-area classes
- Failure state exposed: Visual overlap or hidden content visible via browser inspection

## Inputs

- `apps/mobile/src/routes/+layout.svelte` — Current layout with ModeWatcher, Toaster, onboarding guard
- `apps/mobile/src/routes/+page.svelte` — Current home page with 2x2 card grid
- Existing nav i18n keys: `nav_programs`, `nav_exercises`, `nav_history`, `nav_bodyweight`
- `packages/ui/src/globals.css` — Safe-area utility classes (`pt-safe-top`, `pb-safe-bottom`)

## Expected Output

- `apps/mobile/src/lib/components/BottomNav.svelte` — New bottom tab navigation component
- `apps/mobile/src/routes/+layout.svelte` — Updated with BottomNav, safe-area padding
- `apps/mobile/src/routes/+page.svelte` — Transformed from nav grid to dashboard/redirect
- `apps/mobile/messages/de.json` — Updated with `nav_settings` key (if missing)
