# Project

## What This Is

FitLog is a fitness tracking mobile app focused on progressive overload management. Built as a Capacitor 8 hybrid app (SvelteKit + Svelte 5) targeting iOS and Android simultaneously. The app lets users create structured training programs with mesocycles, log workouts with a minimal tap-tap-done UX, track RIR (Reps in Reserve) per set, review workout history, track body weight, and see analytics-driven progression intelligence. Cloud-connected with user accounts, cross-device sync, and data export. Offline-first with SQLite + custom REST sync protocol (UUID PKs, timestamps, soft-delete, LWW conflict resolution).

## Core Value

Fast, frictionless workout logging with RIR-driven progressive overload intelligence — the app should be usable at the gym with minimal attention, while building a rich data layer that powers smart training decisions.

## Current State

**M001 (Core Training Engine), M002 (Analytics & Progression Intelligence), M003 (Monetization & Premium Features), and M004 (Cloud Sync & Platform) are complete.** The app has:

- **Data Layer:** SQLite via @capgo/capacitor-fast-sql, schema v6 with 8 tables + composite analytics index + deterministic seed exercise UUIDs, repository pattern with Zod v4 validation, 524 mobile + 26 web unit tests passing
- **Exercise Library:** 55 curated exercises with search/filter by muscle group and equipment, custom exercise creation
- **Program Management:** Normalized 4-table model (programs, training_days, exercise_assignments, mesocycles) with full CRUD
- **Program Templates:** 8 total (3 free for onboarding + 5 premium behind template pack purchase), browsable via TemplateBrowserDrawer on Programs page
- **Workout Logging:** Tap-tap-done UX with pre-fill from last session, stepper-based weight/reps, RIR per set (0-5+), set types (warmup/working/drop/failure), optional rest timer, duration timer
- **Workout History:** Browsable session list with full detail views
- **Body Weight Tracking:** One entry per date with partial unique index for soft-delete
- **Onboarding:** 3 starter templates (PPL, Upper/Lower, Full Body) with skip option
- **Design:** Neobrutalist design system with dark/light mode, bottom tab navigation (5 tabs)
- **Haptics:** Fire-and-forget haptic feedback on set completion, workout finish, PR celebration, stepper interactions
- **Analytics Engine:** 1RM estimation (Epley, capped at 10 reps), PR detection (weight/rep/e1RM), volume/tonnage aggregation, RIR-driven progression suggestions, deload auto-adjustment
- **Progress Dashboard:** Interactive charts (Strength curves, Volume trends, Body Weight, Frequency) at /history/analytics with exercise picker and time range selector, rendered via LayerChart v2
- **PR System:** Automatic detection on session completion with celebration toast + haptics, PR history page at /history/prs, per-exercise current bests via ExercisePRSection
- **Progression Suggestions:** Non-intrusive banners during active workouts when RIR criteria met (>=2 sessions, avg RIR >=2), equipment-specific weight rounding
- **Deload Automation:** Page-level deload banner and pre-fill weight reduction (~60%, rounded to 2.5kg) when mesocycle reaches deload week
- **In-App Purchases:** @capgo/native-purchases with Capacitor 8 (StoreKit 2 + Play Billing 7.x). Annual/monthly subscription for analytics, one-time template pack. StoreKit testing config for sandbox
- **Premium Service:** Granular product-tracking via PurchasedProduct map in Preferences. Feature-to-product mapping, subscription expiry checks, launch-time revalidation on mount + resume
- **Paywall UX:** PaywallDrawer with dynamic store pricing, subscription terms, Apple-compliant cancellation instructions. UpgradePrompt on premium-gated features. Restore Purchases and Manage Subscription in Settings
- **Store Submission:** Complete fastlane infrastructure (Fastfile, Appfile, Matchfile) for com.fitlog.app. 40+ metadata files for iOS/Android in de-DE + en-US. Screenshot frameit pipeline. 30-check pre-submission validation script. E2E verification runbook. Human-gated device testing and submission pending
- **Cloud Sync:** SvelteKit API server with Better Auth (email/password + JWT + Bearer) + Drizzle ORM + Postgres (13-table schema). Two-way sync protocol (push/pull with LWW per row) between mobile SQLite and server Postgres. Automatic sync on sign-in (full), resume, and connectivity restore. Deterministic UUID v5 for seed exercises. Schema v6 migration re-IDs existing data. Observable sync state (getSyncState/clearSyncState/triggerSync) with SyncStatusSection UI in Settings showing last sync time, error alerts, and manual sync trigger. Mobile auth service with Bearer token persistence. Sign-up/sign-in/sign-out screens.
- **Data Export:** CSV (denormalized workout log + body weight) and JSON (full structured data) export from Settings with native share sheet integration via Capacitor Filesystem + Share plugins.
- **i18n:** 430 synchronized keys in German (base) and English via Paraglide
- **Platform:** iOS and Android native projects scaffolded via Capacitor 8, builds to static output

## Architecture / Key Patterns

- **Monorepo:** Turborepo + pnpm workspaces
- **Mobile:** SvelteKit (static adapter, SSR disabled) + Capacitor 8
- **UI:** Svelte 5 runes, shadcn-svelte (bits-ui), Tailwind v4, neobrutalist design tokens
- **Charts:** LayerChart v2 via shadcn-svelte chart wrappers
- **Forms:** sveltekit-superforms (SPA mode) + zod4 + formsnap (for structured forms, not per-set workout editing)
- **i18n:** Paraglide (base locale: de, detection: localStorage → preferredLanguage → baseLocale)
- **State:** Svelte 5 runes + runed utilities (Debounced, etc.)
- **Data:** SQLite via @capgo/capacitor-fast-sql, thin repository pattern, Zod v4 validation, schema_version migration tracking (currently v6)
- **Sync:** Custom REST push/pull protocol with LWW per row, server timestamps as high-water marks, @capacitor/network for connectivity detection
- **Auth:** Better Auth (JWT + Bearer plugins) via raw fetch from mobile, Bearer token in Preferences
- **API Server:** SvelteKit (adapter-node) with Drizzle ORM + Postgres, AppError + resolveError error handling
- **Analytics:** Pure-function services in `src/lib/services/analytics/`, AnalyticsRepository for filtered queries, dashboardData.ts intermediary for chart-ready data
- **IAP:** @capgo/native-purchases via PurchasePlugin wrapper (catch-and-return safe defaults, never throws)
- **Premium:** Granular product-tracking service via @capacitor/preferences (PurchasedProduct JSON map), feature-to-product mapping, page-level gate enforcement before data loading, revalidation on mount + resume
- **Icons:** @lucide/svelte
- **Haptics:** @capacitor/haptics (fire-and-forget service with web fallback)
- **Navigation:** Bottom tab bar (Programs, Exercises, History, Body Weight, Settings). Analytics at /history/analytics, PRs at /history/prs (sub-routes of History tab)
- **Onboarding:** @capacitor/preferences for state, template service for program creation

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Core Training Engine — Workout logging, exercise library, programs, mesocycles, offline SQLite, onboarding, striking UI, iOS + Android builds, i18n (de/en)
- [x] M002: Analytics & Progression Intelligence — Strength curves, 1RM estimation, PR tracking, volume trends, RIR-driven progression suggestions, deload automation, freemium gate, i18n (de/en)
- [x] M003: Monetization & Premium Features — IAP/subscription infra, purchase state management, paywall UX, premium templates, store listing optimization, end-to-end integration + store submission, i18n key sync. All 7 slices complete.
- [x] M004: Cloud Sync & Platform — Account system (Better Auth JWT/Bearer), cross-device sync (custom REST push/pull with LWW), deterministic seed exercise UUIDs, CSV/JSON data export, sync status UI, backup/restore via sync. 5 slices complete. 524 mobile + 26 web tests passing. 410 i18n keys (de+en, zero drift).
- [x] M005: Native Social Login — Google + Apple social sign-in via native OS credential pickers. S01 complete (server social providers, auth-client signInWithSocial, Google button on sign-in page). S02 complete (Apple Sign-In with nonce + profile forwarding, social buttons on both auth pages, endpoint URL fix, 534 tests passing, 415 i18n keys). S03 complete (Connected Accounts in Settings with connect/disconnect, last-account protection, 20 new auth-client tests, 15 new i18n keys). 554 tests passing, 430 i18n keys (de+en, zero drift).
