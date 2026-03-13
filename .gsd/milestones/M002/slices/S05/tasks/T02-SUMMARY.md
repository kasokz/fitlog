---
id: T02
parent: S05
milestone: M002
provides:
  - DeloadBanner.svelte component for visual deload-week indication on workout page
  - Deload detection logic integrated into workout session loading
  - de.json i18n keys for deload banner (deload_banner_title, deload_banner_description, deload_banner_week, deload_banner_dismiss)
key_files:
  - apps/mobile/src/lib/components/workout/DeloadBanner.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Used amber color theme (border-amber-500/30 bg-amber-500/5) to differentiate from green ProgressionBanner — amber signals caution/deload vs green for progression
  - TrendingDown icon chosen over Minus for semantic clarity — matches the weight-reduction concept
  - Deload detection placed after exerciseGroups build but before progression suggestions — keeps load order logical and non-blocking
  - Used console.warn (not console.error) for deload detection failures since banner is supplementary
patterns_established:
  - Banner component pattern with amber theme for deload/warning indicators (parallels green ProgressionBanner)
  - Non-critical feature detection wrapped in try/catch with warn-level logging in loadSession
observability_surfaces:
  - "[Workout] Deload banner detection failed:" console.warn when mesocycle lookup fails — non-critical so warn not error
  - DeloadBanner presence in DOM inspectable via browser tools to verify deload state
duration: 12min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Create DeloadBanner and integrate into workout page with i18n keys

**Created amber-themed DeloadBanner component and integrated deload-week detection into the workout page, showing a dismissible banner when the session is in a deload week.**

## What Happened

1. Added 4 i18n keys to `de.json`: `deload_banner_title` ("Deload-Woche"), `deload_banner_description` (reduced weights message), `deload_banner_week` ("Woche {week}"), and `deload_banner_dismiss` (accessible dismiss label).

2. Created `DeloadBanner.svelte` following the established `ProgressionBanner.svelte` pattern — uses `Alert`/`AlertTitle`/`AlertDescription` from shadcn-svelte with amber color theme, `TrendingDown` icon, and a dismiss button with aria-label. Props: `week: number` and `ondismiss: () => void`.

3. Integrated into the workout page (`+page.svelte`):
   - Added state: `isDeloadSession`, `deloadWeek`, `deloadBannerDismissed`
   - In `loadSession()`, after building exercise groups: checks if `mesocycle_id` is non-null, fetches mesocycle via `ProgramRepository.getMesocycleByProgramId()`, and compares `session.mesocycle_week === mesocycle.deload_week_number` (with `!== 0` guard for disabled deload). All wrapped in try/catch.
   - Banner renders above the exercise cards list, dismissible within the session.

## Verification

- `pnpm run build` — passes with zero errors, all i18n keys resolve, DeloadBanner compiles
- `pnpm test -- deloadIntegration` — 14/14 tests pass (T01's integration tests still green)
- Code review confirmed graceful handling for all edge cases:
  - `mesocycle_id` null → no banner (guard skips)
  - Mesocycle deleted → `getMesocycleByProgramId` returns null → no banner
  - Non-deload week → week comparison fails → no banner
  - Deload disabled (`deload_week_number === 0`) → explicit check → no banner
  - Any error → try/catch with console.warn → no banner, no crash

### Slice-level verification status
- `pnpm test -- deloadIntegration` — PASS (14/14)
- `pnpm run build` — PASS (zero errors)
- Manual verification (deload session banner visible, non-deload no banner, dismiss works) — deferred to final slice task or manual QA

## Diagnostics

- If banner doesn't show for a deload session: check console for `[Workout] Deload banner detection failed:` warning
- Inspect DOM for `DeloadBanner` component presence to verify deload state
- Check session's `mesocycle_week` in DB matches mesocycle's `deload_week_number`

## Deviations

None.

## Known Issues

- Remaining locale translations (en, es, fr, it) for the 4 new deload banner keys are not yet added — per AGENTS.md, these are handled as separate tasks at end of phase

## Files Created/Modified

- `apps/mobile/src/lib/components/workout/DeloadBanner.svelte` — new component: amber-themed dismissible deload banner
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — added deload detection in loadSession() and banner rendering before exercise cards
- `apps/mobile/messages/de.json` — 4 new i18n keys for deload banner
