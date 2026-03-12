# M001: Core Training Engine — Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

## Project Description

FitLog is a progressive overload fitness tracking app. M001 delivers the core training engine: exercise library, program/mesocycle management, workout logging with RIR tracking, workout history, body weight tracking, onboarding templates, and polished mobile UI. All data is offline-first via SQLite with a sync-ready schema.

## Why This Milestone

This is the foundation everything else builds on. Without a working training engine, there's nothing to analyze (M002), monetize (M003), or sync (M004). The goal is a fully functional gym companion app that works offline on both iOS and Android.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Install the app on their iPhone or Android phone, pick a starter program, and start logging workouts immediately
- Browse a curated exercise library with muscle group and equipment filters, and add custom exercises
- Create structured training programs with mesocycles (week blocks, deload scheduling)
- Log workouts with a fast tap-tap-done UX: pre-filled sets from last session, RIR per set, rest timer available
- Review past workout sessions and track body weight over time
- Use the app entirely offline with all data persisted in SQLite

### Entry point / environment

- Entry point: Native app launch on iOS / Android
- Environment: Mobile device (Capacitor hybrid app)
- Live dependencies involved: none (fully offline)

## Completion Class

- Contract complete means: All screens render, data CRUD works, SQLite persists across app restarts
- Integration complete means: Program → Workout → History flow works end-to-end on real device
- Operational complete means: App installs and runs on iOS simulator + Android emulator, data survives app kill/restart

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can install the app, complete onboarding (pick a template), and log a full workout session with RIR on a real device
- Workout data persists across app restart and is visible in workout history
- The full flow works offline (airplane mode) on both iOS and Android

## Risks and Unknowns

- **capacitor-community/sqlite integration** — Plugin API is verbose and requires manual SQL. May need a repository/service abstraction layer to keep it manageable. Risk: medium.
- **Tap-tap-done UX performance** — Pre-filling from last session requires efficient DB queries during active workout. Slow queries would ruin the experience. Risk: medium.
- **Neobrutalist design on mobile** — Hard shadows and tight radii may need adjustment for touch targets and mobile readability. Risk: low.
- **Capacitor 8 native project scaffold** — No iOS/Android projects exist yet. First-time scaffold with all plugins could have integration issues. Risk: low.

## Existing Codebase / Prior Art

- `apps/mobile/` — SvelteKit + Capacitor scaffold, static adapter, SSR disabled, blank landing page
- `packages/ui/` — 50+ shadcn-svelte components, neobrutalist design system with oklch colors and hard shadows
- `packages/ui/src/globals.css` — Full theme with safe-area utilities, dark/light mode tokens
- `apps/mobile/src/lib/paraglide/` — Paraglide i18n configured (de base, en)
- `apps/mobile/capacitor.config.ts` — Basic Capacitor config, needs appId/appName update
- `references/` — Local clones of Svelte, SvelteKit, shadcn-svelte, Capacitor, zod, superforms, runed, etc.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Exercise library with rich metadata (primary: S01)
- R002 — Program & mesocycle management (primary: S02)
- R003 — Workout logging tap-tap-done UX (primary: S03)
- R004 — RIR tracking per set (primary: S03)
- R005 — Rest timer optional/manual (primary: S03)
- R006 — Body weight tracking (primary: S04)
- R007 — Offline-first SQLite data layer (primary: S01)
- R008 — Starter program templates & onboarding (primary: S05)
- R009 — Striking mobile UI (primary: S06)
- R010 — i18n de/en (primary: S07)
- R011 — iOS + Android builds (primary: S06)
- R012 — Sync-ready data model (primary: S01)
- R030 — Workout history & session review (primary: S04)
- R031 — Exercise search & filtering (primary: S01)
- R032 — Set types: warmup, working, drop, failure (primary: S03)
- R033 — Haptic feedback on key actions (primary: S06)
- R034 — Dark/light mode (primary: S06)
- R035 — Workout duration timer (primary: S03)

## Scope

### In Scope

- SQLite database with sync-ready schema (UUIDs, timestamps, soft delete)
- Exercise CRUD with curated seed data
- Program/mesocycle creation and editing
- Workout logging with pre-fill, RIR, rest timer, set types, duration tracking
- Workout history browsing
- Body weight logging
- Onboarding flow with starter templates
- UI polish across all screens
- Haptic feedback integration
- Dark/light mode
- iOS + Android native project scaffold and builds
- Full de/en localization

### Out of Scope / Non-Goals

- Analytics charts or progression suggestions (M002)
- Monetization or paywalls (M003)
- Cloud sync, auth, or server infrastructure (M004)
- Social features or sharing (deferred)
- Nutrition or cardio tracking (out of scope)
- App Store submission (M003 — store optimization)

## Technical Constraints

- Must use capacitor-community/sqlite for data storage (not Preferences for structured data)
- All database tables must use UUID PKs and timestamps (sync-ready)
- Must use sveltekit-superforms in SPA mode for all mutating forms
- Must use zod4 syntax for validation schemas
- Must use Svelte 5 runes syntax exclusively
- Must use shadcn-svelte components for UI composition
- Must use @lucide/svelte for icons (not lucide-svelte)
- i18n: de.json is source of truth, must maintain both de and en
- Must use pnpm (not npm)

## Integration Points

- **capacitor-community/sqlite** — Core data persistence
- **@capacitor/haptics** — Tactile feedback on interactions
- **@capacitor/splash-screen** — Launch experience
- **@capacitor/app** — App lifecycle events (background/foreground for workout timer)
- **mode-watcher** — Dark/light mode switching
- **driver.js** — Potential onboarding tour (already in deps via globals.css coach mark styles)

## Open Questions

- **SQLite abstraction layer** — Use raw SQL with a thin repository pattern, or add drizzle-orm? Leaning toward raw SQL + repository for simplicity given capacitor-community/sqlite's API. Decide during S01 research.
- **Exercise seed data source** — Curate manually or use an open exercise database? Need to research available datasets during S01.
- **Mesocycle data model** — How to represent the relationship between program templates and active mesocycle instances? Need to design during S02 planning.
