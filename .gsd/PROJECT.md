# Project

## What This Is

FitLog is a fitness tracking mobile app focused on progressive overload management. Built as a Capacitor 8 hybrid app (SvelteKit + Svelte 5) targeting iOS and Android simultaneously. The app lets users create structured training programs with mesocycles, log workouts with a minimal tap-tap-done UX, track RIR (Reps in Reserve) per set, review workout history, and track body weight. Offline-first with a sync-ready data model (UUID PKs, timestamps, soft-delete) for future cloud sync.

## Core Value

Fast, frictionless workout logging with RIR-driven progressive overload intelligence — the app should be usable at the gym with minimal attention, while building a rich data layer that powers smart training decisions.

## Current State

**M001 (Core Training Engine) is complete.** The app has:

- **Data Layer:** SQLite via @capgo/capacitor-fast-sql, schema v4 with 8 tables, repository pattern with Zod v4 validation, 211 unit tests passing
- **Exercise Library:** 55 curated exercises with search/filter by muscle group and equipment, custom exercise creation
- **Program Management:** Normalized 4-table model (programs, training_days, exercise_assignments, mesocycles) with full CRUD
- **Workout Logging:** Tap-tap-done UX with pre-fill from last session, stepper-based weight/reps, RIR per set (0-5+), set types (warmup/working/drop/failure), optional rest timer, duration timer
- **Workout History:** Browsable session list with full detail views
- **Body Weight Tracking:** One entry per date with partial unique index for soft-delete
- **Onboarding:** 3 starter templates (PPL, Upper/Lower, Full Body) with skip option
- **Design:** Neobrutalist design system with dark/light mode, bottom tab navigation (5 tabs)
- **Haptics:** Fire-and-forget haptic feedback on set completion, workout finish, stepper interactions
- **i18n:** 242 synchronized keys in German (base) and English via Paraglide
- **Platform:** iOS and Android native projects scaffolded via Capacitor 8, builds to static output

## Architecture / Key Patterns

- **Monorepo:** Turborepo + pnpm workspaces
- **Mobile:** SvelteKit (static adapter, SSR disabled) + Capacitor 8
- **UI:** Svelte 5 runes, shadcn-svelte (bits-ui), Tailwind v4, neobrutalist design tokens
- **Forms:** sveltekit-superforms (SPA mode) + zod4 + formsnap (for structured forms, not per-set workout editing)
- **i18n:** Paraglide (base locale: de, detection: localStorage → preferredLanguage → baseLocale)
- **State:** Svelte 5 runes + runed utilities (Debounced, etc.)
- **Data:** SQLite via @capgo/capacitor-fast-sql, thin repository pattern, Zod v4 validation, schema_version migration tracking
- **Icons:** @lucide/svelte
- **Haptics:** @capacitor/haptics (fire-and-forget service with web fallback)
- **Navigation:** Bottom tab bar (Programs, Exercises, History, Body Weight, Settings)
- **Onboarding:** @capacitor/preferences for state, template service for program creation

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Training Engine — Workout logging, exercise library, programs, mesocycles, offline SQLite, onboarding, striking UI, iOS + Android builds, i18n (de/en)
- [ ] M002: Analytics & Progression Intelligence — Strength curves, 1RM estimation, PR tracking, volume trends, RIR-driven progression suggestions, deload automation, freemium gate
- [ ] M003: Monetization & Premium Features — IAP/subscription infra, premium templates, advanced analytics pack, paywall UX, store optimization
- [ ] M004: Cloud Sync & Platform — Account system, cross-device sync, conflict resolution, backup/restore, data export
