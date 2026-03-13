# S06: Freemium Analytics Gate — Research

**Date:** 2026-03-12

## Summary

S06 implements the freemium boundary separating free analytics (basic PR list, last-4-weeks volume snapshot) from premium features (full charts, extended history, progression suggestions). The implementation is straightforward: a local feature-flag service backed by `@capacitor/preferences` (D048), an upgrade prompt component, and gate checks wired into existing UI components. No new database tables or analytics logic is needed — this slice purely gates existing S02/S03/S04 features at the UI and service layer.

The core pattern follows the existing `onboarding.ts` service exactly: async read/write of a boolean-ish flag via `@capacitor/preferences`, with the same mock pattern for testing. The premium service defines a `PremiumFeature` enum and an `isPremiumUser()` check. Gate points are: (1) analytics dashboard page — free users see limited data, premium users see full charts, (2) PR history page — free users see top 3 exercises only, (3) progression suggestions in workout — hidden for free users, (4) History page buttons — analytics button shows upgrade prompt for free users. An `UpgradePrompt` component provides a reusable upgrade CTA at each gate boundary. M003 will later replace the local flag with real IAP verification.

The primary risk is UX: the gate must feel fair, not punitive. Free users should see enough value to understand what they're missing. The technical risk is minimal — no new queries, no performance concerns, no schema changes.

## Recommendation

**Build from the inside out: service → gate checks → upgrade prompt UI.**

1. Create `src/lib/services/premium.ts` following the `onboarding.ts` pattern: `isPremiumUser()`, `setPremiumStatus()`, `PremiumFeature` enum, `canAccessFeature()`. Store status via `@capacitor/preferences` under key `premium_status`.
2. Create a reusable `UpgradePrompt.svelte` component using the existing `AlertDialog` or `Card` pattern — it appears at gate boundaries with a clear value proposition and upgrade CTA (CTA is a no-op in M002, wired to IAP in M003).
3. Wire gate checks into 4 integration points: analytics dashboard (limit time range + hide tabs), PR history (limit to top 3 exercises), progression suggestions (skip `loadProgressionSuggestions` call), and History page (analytics button → upgrade prompt instead of navigation).
4. Add a "Restore Premium" or "Premium" toggle in Settings for development/testing — this lets M003 wire IAP later.
5. Unit tests follow the onboarding test pattern: mock `@capacitor/preferences`, test each gate function.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Persistent premium flag storage | `@capacitor/preferences` (already installed, pattern in `onboarding.ts`) | Same simple async KV store pattern. No server needed. Mock pattern already established in tests. |
| Upgrade prompt UI | shadcn-svelte `AlertDialog` or `Card` + `Button` | Components already in `packages/ui`. AlertDialog for modal upgrade prompts, Card for inline upgrade banners. Consistent with existing design system. |
| Feature gating logic | Simple function checks, no library | A `canAccessFeature(feature)` function is sufficient. No feature-flag framework needed for a binary premium/free gate with 4 features. |
| Gate-point UI overlay (blurred locked content) | Tailwind `blur-sm` + `pointer-events-none` + overlay | Standard CSS technique. Shows users a preview of premium content behind a translucent overlay with upgrade CTA. |

## Existing Code and Patterns

- `src/lib/services/onboarding.ts` — **Primary pattern to follow.** Same `@capacitor/preferences` read/write/remove pattern. Premium service should mirror this structure exactly: async functions, `Preferences.get/set/remove`, string key constant at top.
- `src/lib/db/__tests__/onboarding.test.ts` — **Test pattern to follow.** Mock `@capacitor/preferences` with in-memory `Map<string, string>`, clear in `beforeEach`/`afterEach`, use dynamic `await import()` after mock. Premium service tests should copy this structure.
- `src/routes/history/analytics/+page.svelte` — **Gate point: full dashboard.** Currently loads all chart data unconditionally. Free tier: restrict time range to 30 days, show only Strength tab (hide Volume/Body Weight/Frequency tabs), show upgrade banner in place of hidden tabs. Premium tier: no changes.
- `src/routes/history/prs/+page.svelte` — **Gate point: PR history.** Loads all exercises' PR history. Free tier: limit to top 3 exercises (most PRs or most recent), show an upgrade banner below the 3 cards. Premium tier: show all.
- `src/routes/workout/[sessionId]/+page.svelte` (line 197-200) — **Gate point: progression suggestions.** `loadProgressionSuggestions()` is called fire-and-forget. Free tier: skip the call entirely (don't load suggestions), so `ProgressionBanner` never renders. Minimal code change.
- `src/routes/history/+page.svelte` — **Gate point: entry buttons.** Has Trophy (PR history) and BarChart3 (analytics) buttons in header. Free users can still access PR history (limited) and see the analytics upgrade prompt. No change needed to button visibility — gate is inside the target pages.
- `src/lib/components/workout/ProgressionBanner.svelte` — Existing banner component. No changes needed — it simply won't be rendered when suggestion is null (which happens when `loadProgressionSuggestions` is skipped for free users).
- `src/lib/components/workout/DeloadBanner.svelte` — Deload banners are **not gated** — deload is a safety feature, not premium analytics. Important: don't accidentally gate deload.
- `src/lib/components/exercises/ExercisePRSection.svelte` — Shows PRs in exercise detail drawer. Free tier: keep this visible (it shows current bests only, which is "basic PR list"). Not gated.
- `src/lib/components/analytics/*.svelte` — Chart components (StrengthChart, VolumeChart, BodyWeightChart, FrequencySummary). These don't need gate logic — the gate is at the page level (don't load data, show upgrade instead).
- `src/routes/settings/+page.svelte` — Settings page with theme and language toggles. Good place to add a "Premium" section with status display and (for dev) a toggle to flip the flag.

## Constraints

- **`@capacitor/preferences` is the only persistence mechanism.** No SQLite involvement for the premium flag. This is deliberate: premium status is app-level configuration, not relational data (D034 rationale applies).
- **No real IAP in this slice.** The upgrade CTA button is visible but non-functional (no purchase flow). It should show a "coming soon" or placeholder message. M003 will wire real IAP to `setPremiumStatus(true)`.
- **5-tab bottom nav (D036) cannot change.** No new "Premium" tab. Premium UI lives in Settings and at gate boundaries within existing pages.
- **Deload auto-adjustment (S05) must NOT be gated.** Deload is a safety/training feature. Only analytics/intelligence features (charts, extended PR history, progression suggestions) are premium.
- **PR celebration toast during workout must NOT be gated.** PRs detected at session completion should still celebrate for free users — this is core motivation, not premium analytics.
- **ExercisePRSection (current bests in exercise detail drawer) is NOT gated.** Free users see their current best weight/rep/e1RM per exercise. This is "basic PR list" per the roadmap.
- **i18n keys for this slice will be added in S07.** Use `m.*()` calls in the new components — S07 adds the actual de.json/en.json keys. However, the premium service itself doesn't need i18n (it's a data layer).

## Common Pitfalls

- **Gating too aggressively makes the free tier feel useless.** The roadmap says "basic PR list and last-4-weeks summary" are free. Don't gate: ExercisePRSection, PR celebration toast, deload banners, the basic session history list. Only gate: full analytics dashboard (time range + tabs), extended PR history (>3 exercises), progression suggestions.
- **Importing premium service in deeply nested components creates coupling.** Don't pass `isPremium` down through 5 levels of props. Instead, gate at the page/route level where the data is loaded. For the workout page, simply skip `loadProgressionSuggestions()` based on a single check at the top.
- **Forgetting to handle the async nature of Preferences.** `isPremiumUser()` is async. Don't block render on it — load premium status in an `$effect` and default to `false` (free) until resolved. This prevents premium content flash.
- **Dev toggle leaking to production.** The Settings toggle for flipping premium status should only be visible in development mode. Use `import.meta.env.DEV` or similar to hide it in production builds. M003 replaces this with real IAP.
- **Race condition between premium check and data loading.** If the analytics dashboard loads data before `isPremiumUser()` resolves, it might load full data then retroactively try to limit it. Solution: await premium status before initiating data loads. Use a simple `let premium = $state(false)` that gates the data-loading `$effect`.

## Open Risks

- **Free-tier "last-4-weeks volume snapshot" scope is ambiguous.** The roadmap says free users see "last-4-weeks summary" but the current dashboard doesn't have a dedicated summary view — it has 4 chart tabs. Options: (a) show the Frequency tab (totalSessions + avgPerWeek) as the free summary, (b) build a small summary card showing total sessions + total volume for last 4 weeks. Recommendation: option (a) is simplest — show FrequencySummary as the free dashboard content alongside limited strength data. Decide during planning.
- **Upgrade prompt design needs to communicate value without feeling punitive.** The prompt should say what premium unlocks, not what free lacks. Use positive framing ("Unlock detailed strength curves and progression intelligence") not negative ("You can't see this because you're a free user").
- **M003 integration surface.** The premium service must expose a clean `setPremiumStatus(active: boolean)` that M003's IAP verification can call. The internal storage key and validation logic should be encapsulated so M003 doesn't need to know about Preferences directly.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 | (already in codebase) | installed / in references |
| shadcn-svelte | (already in codebase) | installed / in references |
| Capacitor Preferences | (already in codebase, pattern in onboarding.ts) | installed |

No new skills needed for this slice. The work is UI composition + a simple service layer using established patterns. No external libraries or frameworks are introduced.

## Sources

- Freemium gate boundary definition: M002 Roadmap (D048, D009, R019) — "Free users see basic PR list and last-4-weeks summary; full charts, trends, and progression suggestions are gated behind a premium flag"
- `@capacitor/preferences` API: same pattern as `src/lib/services/onboarding.ts` — `get({ key })`, `set({ key, value })`, `remove({ key })`
- Onboarding test mock pattern: `src/lib/db/__tests__/onboarding.test.ts` — in-memory Map mock for `@capacitor/preferences`
- Feature gate integration points: identified from S02 (dashboard), S03 (PR history), S04 (progression suggestions) component and route source code
