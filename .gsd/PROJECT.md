# Project

## What This Is

FitLog is a fitness tracking mobile app focused on progressive overload management. Built as a Capacitor hybrid app (SvelteKit + Svelte 5) targeting iOS and Android simultaneously. The app lets users create structured training programs with mesocycles, log workouts with a minimal tap-tap-done UX, track RIR (Reps in Reserve) per set, and get smart progression suggestions. Offline-first with a sync-ready data model for future cloud sync.

## Core Value

Fast, frictionless workout logging with RIR-driven progressive overload intelligence — the app should be usable at the gym with minimal attention, while building a rich data layer that powers smart training decisions.

## Current State

Monorepo scaffold exists with `apps/mobile` (Capacitor 8 + SvelteKit static adapter), `apps/web`, and `packages/ui` (shadcn-svelte with neobrutalist design system). The mobile app has a blank landing page, paraglide i18n (de/en), ModeWatcher, and safe-area utilities. No data layer, no screens, no native platform projects yet. The UI component library (`@repo/ui`) has 50+ shadcn-svelte components ready to use.

## Architecture / Key Patterns

- **Monorepo:** Turborepo + pnpm workspaces
- **Mobile:** SvelteKit (static adapter, SSR disabled) + Capacitor 8
- **UI:** Svelte 5 runes, shadcn-svelte (bits-ui), Tailwind v4, neobrutalist design tokens
- **Forms:** sveltekit-superforms (SPA mode) + zod4 + formsnap
- **i18n:** Paraglide (base locale: de)
- **State:** Svelte 5 runes + runed utilities
- **Data:** SQLite via capacitor-community/sqlite (planned), Capacitor Preferences for settings
- **Icons:** @lucide/svelte
- **Haptics:** @capacitor/haptics (in deps)

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Core Training Engine — Workout logging, exercise library, programs, mesocycles, offline SQLite, onboarding, striking UI, iOS + Android builds
- [ ] M002: Analytics & Progression Intelligence — Strength curves, 1RM estimation, PR tracking, volume trends, RIR-driven progression suggestions, deload automation, freemium gate
- [ ] M003: Monetization & Premium Features — IAP/subscription infra, premium templates, advanced analytics pack, paywall UX, store optimization
- [ ] M004: Cloud Sync & Platform — Account system, cross-device sync, conflict resolution, backup/restore, data export
