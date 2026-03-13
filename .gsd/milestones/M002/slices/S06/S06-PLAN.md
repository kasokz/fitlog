# S06: Freemium Analytics Gate

**Goal:** Free users see a basic analytics summary (top 3 exercise PRs, FrequencySummary as 4-week snapshot) and hit a clear upgrade prompt when tapping into full charts, extended history, or progression suggestions. Premium users see everything. Gate is controlled by a local feature-flag service backed by `@capacitor/preferences`.
**Demo:** Toggle premium off in Settings → navigate to analytics dashboard: only Strength + Frequency tabs visible, other tabs replaced by upgrade banner. PR history shows max 3 exercises + upgrade banner. Progression suggestions don't load during workout. Toggle premium on → all features unlock immediately.

## Must-Haves

- `src/lib/services/premium.ts` service with `isPremiumUser()`, `setPremiumStatus()`, `canAccessFeature()`, and `PremiumFeature` enum following the `onboarding.ts` pattern
- Analytics dashboard gates Volume, Body Weight tabs behind premium — free users see Strength + Frequency + an inline upgrade banner replacing locked tabs
- Time range selector restricted to 30d for free users (premium: 7d/30d/90d)
- PR history page limits to top 3 exercises for free users, with upgrade banner below
- Progression suggestions (`loadProgressionSuggestions`) skipped entirely for free users — ProgressionBanner never renders
- Deload banners, PR celebration toasts, and ExercisePRSection are NOT gated
- Reusable `UpgradePrompt.svelte` component with positive framing
- Dev-only premium toggle in Settings page (hidden via `import.meta.env.DEV`)
- Unit tests for premium service following the onboarding test mock pattern

## Proof Level

- This slice proves: integration
- Real runtime required: no (unit tests for service, gate logic testable from code review + manual dev toggle)
- Human/UAT required: yes (visual verification of gate UX — upgrade prompt appearance, tab hiding, PR limit)

## Verification

- `pnpm test -- --grep "premium"` — premium service unit tests pass (isPremiumUser, setPremiumStatus, canAccessFeature for each PremiumFeature, default-to-free behavior)
- `pnpm run build` — zero build errors with all new files
- Manual: toggle premium off in Settings (dev mode) → analytics dashboard shows only Strength + Frequency tabs, upgrade banner visible for locked tabs → PR history shows max 3 exercises → workout page does NOT load progression suggestions → deload banner still visible → PR celebration toast still fires
- Manual: toggle premium on → all analytics tabs visible, all PR exercises shown, progression suggestions load

## Observability / Diagnostics

- Runtime signals: `[Premium]` prefixed console logs on status read/write (matching `[Onboarding]` pattern). `[Dashboard]`, `[PRHistory]`, `[Progression]` logs include premium status in their existing structured logging.
- Inspection surfaces: `@capacitor/preferences` key `premium_status` readable via Capacitor DevTools or Settings toggle. Dev toggle in Settings provides runtime inspection.
- Failure visibility: `canAccessFeature()` logs the feature name and access result. If premium check fails (Preferences error), defaults to free (safe fallback). Console warns on Preferences read failure.
- Redaction constraints: none — no secrets or PII involved in premium status.

## Integration Closure

- Upstream surfaces consumed: `src/lib/services/onboarding.ts` (pattern), `src/routes/history/analytics/+page.svelte` (S02 dashboard), `src/routes/history/prs/+page.svelte` (S03 PR history), `src/routes/workout/[sessionId]/+page.svelte` (S04 progression loading), `src/routes/settings/+page.svelte` (Settings page), `src/lib/services/analytics/progressionSuggestionLoader.ts` (S04 loader)
- New wiring introduced in this slice: premium service → analytics dashboard (tab gating + time range restriction), premium service → PR history (exercise limit), premium service → workout page (progression skip), premium toggle in Settings, reusable UpgradePrompt component
- What remains before the milestone is truly usable end-to-end: S07 (i18n keys for all new analytics UI text including premium prompts)

## Tasks

- [x] **T01: Create premium service with unit tests** `est:45m`
  - Why: Foundation — all gate checks depend on this service. Tests prove correct behavior before wiring into UI.
  - Files: `src/lib/services/premium.ts`, `src/lib/db/__tests__/premium.test.ts`
  - Do: Create `premium.ts` mirroring `onboarding.ts` pattern: `isPremiumUser()`, `setPremiumStatus(active)`, `PremiumFeature` enum (`full_charts`, `extended_history`, `progression_suggestions`, `volume_trends`), `canAccessFeature(feature)`. Write unit tests with `@capacitor/preferences` mock (Map-based, same as onboarding test). Test all enum values, default-to-free, round-trip set/check, and canAccessFeature gating.
  - Verify: `pnpm test -- --grep "premium"` — all tests pass
  - Done when: premium service exports all functions, tests cover every PremiumFeature value and edge cases

- [x] **T02: Create UpgradePrompt component and wire gate into analytics dashboard + PR history** `est:1h`
  - Why: Two of the four gate points (dashboard tabs + PR history limit) plus the reusable upgrade prompt component. These are the most visible free-tier boundaries.
  - Files: `src/lib/components/premium/UpgradePrompt.svelte`, `src/routes/history/analytics/+page.svelte`, `src/routes/history/prs/+page.svelte`
  - Do: (1) Create `UpgradePrompt.svelte` using Card + Button from shadcn-svelte — accepts `feature` prop for context-specific messaging, uses positive framing ("Unlock..."). (2) In analytics dashboard: await `isPremiumUser()` before data loading, restrict time range to `30d` for free users, show only Strength + Frequency tabs for free, replace hidden tab content area with UpgradePrompt. (3) In PR history: await `isPremiumUser()`, slice `groups` to first 3 for free users, show UpgradePrompt below the 3 cards.
  - Verify: `pnpm run build` — zero errors. Code review: premium check gates data loading, tabs/groups correctly limited.
  - Done when: free users see 2 tabs + upgrade prompt on dashboard, max 3 exercises + upgrade prompt on PR history; premium users see everything unchanged

- [x] **T03: Gate progression suggestions in workout + add dev toggle in Settings** `est:45m`
  - Why: Completes the remaining gate point (progression suggestions) and provides the dev toggle for testing all gates at runtime.
  - Files: `src/routes/workout/[sessionId]/+page.svelte`, `src/routes/settings/+page.svelte`, `src/lib/services/premium.ts`
  - Do: (1) In workout page: import `isPremiumUser`, check premium status before `loadProgressionSuggestions` call — skip the call entirely for free users so `progressionSuggestions` stays empty and ProgressionBanner never renders. Deload banner logic must remain untouched. PR celebration toast must remain untouched. (2) In Settings: add a "Premium" section (dev-only via `import.meta.env.DEV`) with a Switch toggle that calls `setPremiumStatus()`. Shows current premium status label. (3) Verify build succeeds.
  - Verify: `pnpm run build` — zero errors. Code review: progression skip is conditional on premium, deload/PR celebration paths untouched, dev toggle only renders in DEV mode.
  - Done when: free users see no progression banners during workout; dev toggle in Settings flips premium status and all 3 gate points respond correctly

## Files Likely Touched

- `src/lib/services/premium.ts` (new)
- `src/lib/db/__tests__/premium.test.ts` (new)
- `src/lib/components/premium/UpgradePrompt.svelte` (new)
- `src/routes/history/analytics/+page.svelte` (modify — gate tabs + time range)
- `src/routes/history/prs/+page.svelte` (modify — limit exercises)
- `src/routes/workout/[sessionId]/+page.svelte` (modify — skip progression load)
- `src/routes/settings/+page.svelte` (modify — add dev toggle)
