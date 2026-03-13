---
id: T03
parent: S06
milestone: M002
provides:
  - Premium gate on progression suggestions in workout page (free users skip loading)
  - Dev-only premium toggle in Settings page (reads/writes premium status at runtime)
  - All 4 gate points functional (dashboard tabs, time range, PR history limit, progression suggestions)
key_files:
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Premium check in workout page wraps only the loadProgressionSuggestions call, leaving deload banner and PR celebration completely independent — no premium imports or checks in those code paths
  - Settings dev toggle uses import.meta.env.DEV guard (Vite static replacement) — tree-shaken out in production builds, zero runtime overhead
  - Switch component uses onCheckedChange callback with optimistic local state update before async setPremiumStatus call
patterns_established:
  - Dev-only settings section pattern: wrap in {#if import.meta.env.DEV} block, use consistent section styling (space-y-3 mt-6, uppercase label, bordered row with switch)
observability_surfaces:
  - "[Workout] Premium: false, skipping progression suggestions" logged when free user's workout loads
  - "[Premium] setPremiumStatus: true/false" logged when dev toggle is changed (via premium service)
  - "[Workout] Premium check failed, defaulting to free" warned on isPremiumUser() failure in workout page
duration: 12min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Gate progression suggestions in workout + add dev toggle in Settings

**Gated progression suggestion loading behind premium check in workout page and added dev-only premium toggle in Settings for runtime testing of all 4 gate points.**

## What Happened

1. Modified workout page (`+page.svelte`) to import `isPremiumUser` and wrap the `loadProgressionSuggestions()` fire-and-forget call in a premium check. Free users skip the call entirely — `progressionSuggestions` stays as empty Map, so ProgressionBanner never renders. Premium users get existing behavior unchanged. Error handling defaults to free (safe degradation).

2. Modified Settings page (`+page.svelte`) to add a "Premium (Dev)" section visible only in dev mode (`import.meta.env.DEV`). Contains a Switch component that reads current premium status on mount and writes it on toggle via the premium service. Shows "Aktiv"/"Inaktiv" (de) or "Active"/"Inactive" (en) status label.

3. Verified deload banner detection and PR celebration toast have zero premium imports or checks — completely independent of premium status.

4. Added 3 i18n keys (`settings_premium_dev_label`, `settings_premium_active`, `settings_premium_inactive`) to both `de.json` and `en.json`.

## Verification

- `pnpm run build` — zero errors, adapter-static wrote site successfully ✓
- `pnpm vitest run premium.test.ts` — 15/15 premium service tests pass ✓
- Code review: deload block (lines 180-195, 454-455) has no premium references ✓
- Code review: PR celebration block (lines 332-374) has no premium references ✓
- Code review: `import.meta.env.DEV` guard wraps premium toggle section ✓
- i18n: all 3 new keys present in both de.json and en.json ✓

### Slice-level verification status (T03 is final task):
- `pnpm vitest run premium.test.ts` — 15/15 pass ✓
- `pnpm run build` — zero errors ✓
- Manual verification: requires running dev server (not started per AGENTS.md guidelines)

## Diagnostics

- Console filter `[Workout]` during workout load shows premium status and whether progression suggestions were skipped
- Console filter `[Premium]` shows all status reads/writes including dev toggle changes
- Settings page in dev mode shows premium toggle with current status — flip it to test all 4 gate points without touching Preferences directly
- If `isPremiumUser()` throws in workout page, console.warn logs the error and progression suggestions are skipped (safe fallback to free)

## Deviations

- Task plan specified `pnpm test -- --grep "premium"` but vitest v4 doesn't support `--grep`. Used `pnpm vitest run premium.test.ts` to run the premium service tests directly.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Added isPremiumUser import, gated loadProgressionSuggestions behind premium check with safe fallback
- `apps/mobile/src/routes/settings/+page.svelte` — Added Switch import, premium service imports, dev-only premium toggle section with status label
- `apps/mobile/messages/de.json` — Added 3 i18n keys for premium dev toggle
- `apps/mobile/messages/en.json` — Added 3 i18n keys for premium dev toggle
