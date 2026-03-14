# Requirements

This file is the explicit capability and coverage contract for FitLog.

## Active

### R001 — Exercise Library with Rich Metadata
- Class: core-capability
- Status: active
- Description: App ships with a curated library of common exercises, each tagged with primary/secondary muscle groups, equipment type, and brief description. Users can also create custom exercises with the same metadata.
- Why it matters: Exercises are the atomic unit of everything — programs, logging, analytics all depend on a solid exercise model.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S05
- Validation: unmapped
- Notes: Exercise data should be seeded on first launch, not fetched from a server.

### R002 — Program & Mesocycle Management
- Class: core-capability
- Status: active
- Description: Users can create structured training programs with named training days, assign exercises with target rep ranges, and define mesocycle parameters (length in weeks, deload week position). Programs are reusable templates that drive workout sessions.
- Why it matters: Structured programs are the backbone of progressive overload — without them, the app is just a generic logger.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S05
- Validation: unmapped
- Notes: Mesocycle defines week count and deload schedule. Deload auto-adjustment is M002 scope.

### R003 — Workout Logging (Tap-Tap-Done UX)
- Class: primary-user-loop
- Status: active
- Description: User starts a workout from a program day, sees exercises pre-filled from the program. Each set is pre-filled with last session's weight/reps. User confirms or adjusts with steppers, logs RIR, swipes to next set. Absolute minimum taps to complete a set.
- Why it matters: This is the core interaction loop — if logging is slow or clunky, the app fails regardless of other features.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Pre-fill requires reading last session data for same program day.

### R004 — RIR Tracking Per Set
- Class: core-capability
- Status: active
- Description: Every working set has an RIR field (0-5+ scale). RIR is a first-class data point, not optional. It drives progression decisions in M002.
- Why it matters: RIR is the primary signal for progression intelligence — it distinguishes this app from basic loggers.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M002/S*
- Validation: unmapped
- Notes: RIR 0 = failure, RIR 5+ = very easy. Should be fast to input (stepper or tap selector).

### R005 — Rest Timer (Optional/Manual)
- Class: core-capability
- Status: active
- Description: A rest timer is available but does not auto-start. Users can manually start it between sets. Timer is visible during the workout but not intrusive.
- Why it matters: Rest timing is useful for some training styles but shouldn't slow down the logging flow for those who don't use it.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: No haptic alert on timer completion for now — just visual.

### R006 — Body Weight Tracking
- Class: core-capability
- Status: active
- Description: Users can log body weight over time. Simple date + weight entries, viewable as a list/timeline.
- Why it matters: Body weight is a basic data point for correlation with strength trends (M002) and general fitness tracking.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: M002/S*
- Validation: unmapped
- Notes: No photos, no measurements — just weight.

### R007 — Offline-First SQLite Data Layer
- Class: constraint
- Status: active
- Description: All data is stored locally in SQLite via capacitor-community/sqlite. App works fully offline with no network dependency. Data layer uses UUIDs and timestamps for future sync compatibility.
- Why it matters: Mobile fitness apps must work in gyms with poor connectivity. Sync-ready schema avoids painful migration later.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: all
- Validation: unmapped
- Notes: Use capacitor-community/sqlite. Schema must have uuid PKs, created_at, updated_at, and soft-delete support.

### R008 — Starter Program Templates & Onboarding
- Class: launchability
- Status: active
- Description: On first launch, user is presented with starter program templates (PPL, Upper/Lower, Full Body). Picking one creates a ready-to-use program. User is training-ready in under 2 minutes.
- Why it matters: Empty-state apps have massive drop-off. Templates eliminate the cold-start problem.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Templates should be complete programs with exercises, sets, rep ranges pre-configured.

### R009 — Striking Mobile UI (Neobrutalist Design)
- Class: differentiator
- Status: active
- Description: The app has a distinctive, bold visual design using the existing neobrutalist design system (hard shadows, tight radii, oklch color palette). Not a generic fitness app look.
- Why it matters: Design differentiation is a competitive advantage in a crowded market. The design system already exists — leverage it.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: all
- Validation: unmapped
- Notes: Design system already established in packages/ui globals.css. All screens should use shadcn-svelte components.

### R010 — i18n Support (de/en)
- Class: launchability
- Status: active
- Description: All user-facing text is localized in German (base) and English. Paraglide i18n is already configured.
- Why it matters: App targets German-speaking market first, English for broader reach.
- Source: user
- Primary owning slice: M001/S07
- Supporting slices: all
- Validation: unmapped
- Notes: Base locale is de. All new UI must add de keys immediately, en translations in dedicated tasks.

### R011 — iOS + Android Builds
- Class: launchability
- Status: active
- Description: App builds and runs on both iOS and Android devices via Capacitor. Native projects scaffolded, splash screen configured, app icons set.
- Why it matters: Simultaneous platform launch was an explicit user requirement.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: No native projects exist yet — need `npx cap add ios` and `npx cap add android`.

### R012 — Sync-Ready Data Model (UUIDs, Timestamps)
- Class: constraint
- Status: active
- Description: All database tables use UUID primary keys, have created_at and updated_at timestamps, and support soft deletion. This enables future sync without schema migration.
- Why it matters: Retrofitting sync onto an auto-increment schema is extremely painful. Build it right from day one.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M004/S*
- Validation: unmapped
- Notes: UUID generation must work offline (crypto.randomUUID or equivalent).

### R013 — Strength Curves & Estimated 1RM
- Class: core-capability
- Status: active
- Description: Charts showing estimated 1RM progression over time per exercise. Uses standard formulas (Epley, Brzycki) calculated from logged sets.
- Why it matters: The primary analytics view users asked for — the strength story over time.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership.

### R014 — PR Tracking & History
- Class: core-capability
- Status: active
- Description: App automatically detects and records personal records (weight PRs, rep PRs, estimated 1RM PRs) per exercise.
- Why it matters: PRs are the most motivating data point in strength training.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership.

### R015 — Volume/Tonnage Trends
- Class: core-capability
- Status: active
- Description: Track total training volume (sets x reps x weight) over time, per exercise and per muscle group.
- Why it matters: Volume is a key training variable alongside intensity — needed for complete analytics.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership.

### R016 — RIR-Driven Progression Suggestions
- Class: differentiator
- Status: active
- Description: App analyzes RIR trends across sessions. When a user consistently hits RIR 2-3 across sets for an exercise, suggest weight increase for next session.
- Why it matters: This is the core intelligence that makes the app special — proactive, data-driven progression guidance.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership. RIR is the primary signal, not rep range ceiling.

### R017 — Scheduled Deload Auto-Adjustment
- Class: core-capability
- Status: active
- Description: When a mesocycle reaches its deload week, app auto-reduces prescribed weight/volume to ~60% for that week.
- Why it matters: Automated deloads prevent overtraining and make mesocycle management effortless.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership. Deload position defined in mesocycle setup (M001/S02).

### R018 — Progress Dashboard with Charts
- Class: core-capability
- Status: active
- Description: A dashboard screen with interactive charts showing strength curves, volume trends, body weight, and training frequency.
- Why it matters: Visual progress is the payoff for consistent logging — it's what keeps users engaged.
- Source: user
- Primary owning slice: M002
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M002 ownership.

### R019 — Freemium Analytics Gate
- Class: constraint
- Status: active
- Description: Basic workout history view is free. Full analytics (charts, trends, progression suggestions) are premium.
- Why it matters: Defines the free vs. paid boundary for the analytics milestone.
- Source: user
- Primary owning slice: M002
- Supporting slices: M003/S*
- Validation: unmapped
- Notes: Provisional M002 ownership. Gate implementation may shift to M003.

### R020 — In-App Purchase / Subscription Infrastructure
- Class: core-capability
- Status: active
- Description: Subscription and one-time purchase infrastructure for iOS App Store and Google Play Store.
- Why it matters: Required for monetization.
- Source: user
- Primary owning slice: M003
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M003 ownership.

### R021 — Premium Program Templates
- Class: differentiator
- Status: active
- Description: Premium program templates based on established training methodologies (5/3/1, GZCL, nSuns, etc.) available for purchase.
- Why it matters: Curated, well-designed templates are a compelling upsell for intermediate/advanced lifters.
- Source: user
- Primary owning slice: M003
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M003 ownership.

### R022 — Advanced Analytics Pack
- Class: differentiator
- Status: active
- Description: Premium analytics including detailed periodization insights, strength predictions, and advanced visualizations.
- Why it matters: Granular upsell for data-driven users who want the full picture.
- Source: user
- Primary owning slice: M003
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M003 ownership.

### R023 — Paywall UX & Upgrade Flows
- Class: launchability
- Status: active
- Description: Clear, non-intrusive upgrade prompts when users hit premium features. Smooth purchase flow.
- Why it matters: Bad paywall UX kills conversion and creates negative reviews.
- Source: user
- Primary owning slice: M003
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M003 ownership.

### R024 — App Store / Play Store Optimization
- Class: launchability
- Status: active
- Description: Store listings optimized with proper metadata, screenshots, descriptions. No emojis in metadata.
- Why it matters: Store presence directly affects discoverability and downloads.
- Source: user
- Primary owning slice: M003
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M003 ownership. AGENTS.md prohibits emojis in store metadata.

### R025 — Cloud Sync Infrastructure
- Class: core-capability
- Status: active
- Description: Server-side sync API with conflict resolution for merging offline changes from multiple devices.
- Why it matters: Enables cross-device usage and data safety.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M004 ownership.

### R026 — Account System (Auth)
- Class: core-capability
- Status: active
- Description: User registration and authentication for cloud sync.
- Why it matters: Required for cloud sync and user identity.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M004 ownership.

### R027 — Cross-Device Sync
- Class: core-capability
- Status: active
- Description: Training data syncs between devices logged into the same account.
- Why it matters: Users may switch phones or use multiple devices.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M004 ownership.

### R028 — Backup/Restore
- Class: continuity
- Status: active
- Description: Users can back up their training data to the cloud and restore it on a new device.
- Why it matters: Data loss is the #1 fear for fitness app users — years of training history is irreplaceable.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M004 ownership.

### R029 — Data Export (CSV/JSON)
- Class: core-capability
- Status: active
- Description: Users can export their workout history in CSV or JSON format.
- Why it matters: Data portability builds trust and is expected by data-conscious users.
- Source: user
- Primary owning slice: M004
- Supporting slices: none
- Validation: unmapped
- Notes: Provisional M004 ownership. User said "not a priority" — deferred to sync milestone.

### R030 — Workout History & Session Review
- Class: primary-user-loop
- Status: active
- Description: Users can browse past workout sessions, see details of each session (exercises, sets, weights, reps, RIR), and review their training over time.
- Why it matters: Without history review, logging data has no feedback loop. Users need to see what they did last time.
- Source: research
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Essential for pre-filling next session's data.

### R031 — Exercise Search & Filtering
- Class: primary-user-loop
- Status: active
- Description: Users can search exercises by name and filter by muscle group or equipment type.
- Why it matters: With a curated library + custom exercises, finding the right exercise quickly is table stakes.
- Source: research
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Needed during program creation and workout logging.

### R032 — Set Types (Warmup, Working, Drop, Failure)
- Class: core-capability
- Status: active
- Description: Sets can be tagged as warmup, working, drop set, or to-failure. Only working sets count toward progression analytics.
- Why it matters: Without set type distinction, warmup sets pollute progression signals and volume calculations.
- Source: research
- Primary owning slice: M001/S03
- Supporting slices: M002/S*
- Validation: unmapped
- Notes: Critical for analytics accuracy in M002.

### R033 — Haptic Feedback on Key Actions
- Class: differentiator
- Status: active
- Description: Haptic feedback on set completion, workout finish, and other key interactions. Uses Capacitor Haptics (already in dependencies).
- Why it matters: Haptics make the app feel premium and native — small detail, big impact on perceived quality.
- Source: research
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: @capacitor/haptics already in package.json.

### R034 — Dark/Light Mode
- Class: quality-attribute
- Status: active
- Description: App supports dark and light mode, respecting system preference with manual override. ModeWatcher already installed.
- Why it matters: Dark mode is essential for gym use (dim environments) and is a basic expectation.
- Source: inferred
- Primary owning slice: M001/S06
- Supporting slices: none
- Validation: unmapped
- Notes: ModeWatcher and dark theme tokens already configured in globals.css.

### R035 — Workout Duration Timer
- Class: core-capability
- Status: active
- Description: Active workout sessions track total duration from start to finish, displayed during the workout and saved with the session.
- Why it matters: Session duration is basic expected data — users want to know how long they trained.
- Source: research
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Auto-starts when workout begins, stops on completion.

### R041 — Native Google Sign-In
- Class: core-capability
- Status: active
- Description: Users can tap "Continue with Google" and authenticate via the native OS credential picker (Google Credential Manager on Android, Google Sign-In on iOS).
- Why it matters: One-tap social sign-in removes the biggest onboarding friction point on mobile.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: M005/S02
- Validation: unmapped
- Notes: Requires Google OAuth web client ID for token verification.

### R042 — Native Apple Sign-In (iOS)
- Class: core-capability
- Status: active
- Description: iOS users can tap "Continue with Apple" and authenticate via the native ASAuthorizationController sheet.
- Why it matters: Apple requires any app offering third-party login to also offer Sign in with Apple.
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: unmapped
- Notes: iOS only. Apple on Android (R051) deferred.

### R043 — Social Login idToken Handoff to Better Auth
- Class: core-capability
- Status: active
- Description: Native social login plugin provides an idToken that is sent to the Better Auth server for verification and session creation.
- Why it matters: The idToken handoff is the bridge between the native credential picker and the server auth system.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Uses POST /api/auth/sign-in/social endpoint.

### R044 — Auto-Link Accounts by Email
- Class: core-capability
- Status: active
- Description: When a social sign-in email matches an existing email/password account, the accounts are automatically linked so the user sees their existing data.
- Why it matters: Prevents duplicate accounts and ensures seamless transition from email to social sign-in.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Better Auth accountLinking with trustedProviders config.

### R045 — Unified Social Sign-In/Sign-Up
- Class: core-capability
- Status: active
- Description: Social login buttons appear on both sign-in and sign-up pages with the same behavior — social sign-in creates an account if needed or signs in if one exists.
- Why it matters: Users shouldn't need to know whether they have an account — social login handles both cases.
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: none
- Validation: unmapped
- Notes: SocialLoginButtons component reused on both pages via onSuccess callback.

### R046 — Social Buttons Above Email Form
- Class: core-capability
- Status: active
- Description: Social login buttons appear above the email/password form with a visual "or" divider, establishing social-first layout.
- Why it matters: Social login should be the primary, lowest-friction path with email as fallback.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: M005/S02
- Validation: unmapped
- Notes: Layout: SocialLoginButtons -> "or" divider -> email form.

### R047 — Connected Accounts Management in Settings
- Class: core-capability
- Status: active
- Description: Settings page shows Connected Accounts section listing linked providers (Email, Google, Apple) with connect/disconnect actions and last-account protection.
- Why it matters: Users need to manage their login methods — connect additional providers or disconnect ones they no longer want.
- Source: user
- Primary owning slice: M005/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Disconnect disabled when only one account linked.

### R048 — Post-Social-Login Sync Trigger
- Class: core-capability
- Status: active
- Description: After successful social sign-in, a full sync triggers automatically so users see their data immediately.
- Why it matters: New social sign-in users and returning users expect their data to be available right away.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: none
- Validation: unmapped
- Notes: fullSync() fired as fire-and-forget in SocialLoginButtons onSuccess.

### R049 — i18n for Social Login UI (de + en)
- Class: launchability
- Status: active
- Description: All social login UI strings are localized in German (base) and English.
- Why it matters: Consistent with app-wide i18n strategy (R010).
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: M005/S02, M005/S03
- Validation: unmapped
- Notes: 20 new keys (5 auth_social_* + 15 connected_accounts_*).

### R050 — Credential Setup Documentation
- Class: launchability
- Status: active
- Description: Step-by-step documentation for configuring Google Cloud Console and Apple Developer Portal credentials for social login.
- Why it matters: Social login requires external service configuration that must be reproducible.
- Source: user
- Primary owning slice: M005
- Supporting slices: none
- Validation: unmapped
- Notes: Documented in M005-CONTEXT.md.

### R051 — No-Reload Language Switching
- Class: quality-attribute
- Status: active
- Description: Changing the app language in settings updates all visible UI text instantly without triggering a page reload or navigation flash.
- Why it matters: Page reloads feel jarring in a native mobile app — instant language switching matches native app expectations and avoids losing in-progress state.
- Source: user
- Primary owning slice: M006/S01
- Supporting slices: none
- Validation: build-verified (runtime UAT pending per S01-UAT.md)
- Notes: Pattern proven in yahtzee reference project using paraglide's overwriteGetLocale/overwriteSetLocale with reactive Svelte 5 state and {#key locale} re-render. Implementation complete in M006/S01.

## Deferred

### R036 — Social Features / Sharing
- Class: core-capability
- Status: deferred
- Description: Sharing workouts, comparing with friends, community features.
- Why it matters: Social features drive retention and organic growth but add significant complexity.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User explicitly said "not now." Revisit after M004.

### R037 — Progress Photos
- Class: core-capability
- Status: deferred
- Description: Users can take and store progress photos tied to dates.
- Why it matters: Visual progress is motivating and a common feature request.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User chose "body weight only" — photos deferred.

### R038 — AI Coach (LLM-powered)
- Class: differentiator
- Status: deferred
- Description: LLM-powered training advice based on user's history, goals, and progression patterns.
- Why it matters: Potential premium differentiator, but depends on M002 analytics foundation and cloud infra.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Depends on M002 analytics + M004 cloud. High cost, uncertain ROI.

## Out of Scope

### R039 — Nutrition Tracking
- Class: anti-feature
- Status: out-of-scope
- Description: Calorie counting, macro tracking, meal logging.
- Why it matters: Prevents scope creep into a different product category. Dedicated nutrition apps exist.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Not what this app is about.

### R040 — Cardio Tracking
- Class: anti-feature
- Status: out-of-scope
- Description: Tracking cardio sessions (running, cycling, etc.) with duration, distance, heart rate.
- Why it matters: Prevents scope creep. This is a strength training app.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Progressive overload is a strength concept. Cardio is a different domain.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | active | M001/S01 | M001/S05 | unmapped |
| R002 | core-capability | active | M001/S02 | M001/S05 | unmapped |
| R003 | primary-user-loop | active | M001/S03 | none | unmapped |
| R004 | core-capability | active | M001/S03 | M002 | unmapped |
| R005 | core-capability | active | M001/S03 | none | unmapped |
| R006 | core-capability | active | M001/S04 | M002 | unmapped |
| R007 | constraint | active | M001/S01 | all | unmapped |
| R008 | launchability | active | M001/S05 | none | unmapped |
| R009 | differentiator | active | M001/S06 | all | unmapped |
| R010 | launchability | active | M001/S07 | all | unmapped |
| R011 | launchability | active | M001/S06 | none | unmapped |
| R012 | constraint | active | M001/S01 | M004 | unmapped |
| R013 | core-capability | active | M002 | none | unmapped |
| R014 | core-capability | active | M002 | none | unmapped |
| R015 | core-capability | active | M002 | none | unmapped |
| R016 | differentiator | active | M002 | none | unmapped |
| R017 | core-capability | active | M002 | none | unmapped |
| R018 | core-capability | active | M002 | none | unmapped |
| R019 | constraint | active | M002 | M003 | unmapped |
| R020 | core-capability | active | M003 | none | unmapped |
| R021 | differentiator | active | M003 | none | unmapped |
| R022 | differentiator | active | M003 | none | unmapped |
| R023 | launchability | active | M003 | none | unmapped |
| R024 | launchability | active | M003 | none | unmapped |
| R025 | core-capability | active | M004 | none | unmapped |
| R026 | core-capability | active | M004 | none | unmapped |
| R027 | core-capability | active | M004 | none | unmapped |
| R028 | continuity | active | M004 | none | unmapped |
| R029 | core-capability | active | M004 | none | unmapped |
| R030 | primary-user-loop | active | M001/S04 | none | unmapped |
| R031 | primary-user-loop | active | M001/S01 | none | unmapped |
| R032 | core-capability | active | M001/S03 | M002 | unmapped |
| R033 | differentiator | active | M001/S06 | none | unmapped |
| R034 | quality-attribute | active | M001/S06 | none | unmapped |
| R035 | core-capability | active | M001/S03 | none | unmapped |
| R041 | core-capability | active | M005/S01 | M005/S02 | unmapped |
| R042 | core-capability | active | M005/S02 | none | unmapped |
| R043 | core-capability | active | M005/S01 | none | unmapped |
| R044 | core-capability | active | M005/S01 | none | unmapped |
| R045 | core-capability | active | M005/S02 | none | unmapped |
| R046 | core-capability | active | M005/S01 | M005/S02 | unmapped |
| R047 | core-capability | active | M005/S03 | none | unmapped |
| R048 | core-capability | active | M005/S01 | none | unmapped |
| R049 | launchability | active | M005/S01 | M005/S02, M005/S03 | unmapped |
| R050 | launchability | active | M005 | none | unmapped |
| R051 | quality-attribute | active | M006/S01 | none | build-verified |
| R036 | core-capability | deferred | none | none | unmapped |
| R037 | core-capability | deferred | none | none | unmapped |
| R038 | differentiator | deferred | none | none | unmapped |
| R039 | anti-feature | out-of-scope | none | none | n/a |
| R040 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 46
- Mapped to slices: 28 (M001: 17, M005: 10, M006: 1)
- Provisionally mapped: 12 (M002-M004)
- Validated: 1 (R051 — build-verified)
- Unmapped active requirements: 0
