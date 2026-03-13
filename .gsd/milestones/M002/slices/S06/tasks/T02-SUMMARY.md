---
id: T02
parent: S06
milestone: M002
provides:
  - Reusable UpgradePrompt component with feature-contextual messaging
  - Premium gate on analytics dashboard (tabs restricted to Strength + Frequency, time range locked to 30d)
  - Premium gate on PR history (max 3 exercise groups for free users)
  - TimeRangeSelect restrictTo30d prop for disabling time range selection
key_files:
  - apps/mobile/src/lib/components/premium/UpgradePrompt.svelte
  - apps/mobile/src/routes/history/analytics/+page.svelte
  - apps/mobile/src/routes/history/prs/+page.svelte
  - apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte
key_decisions:
  - TimeRangeSelect uses disabled prop + filtered options for restrictTo30d rather than hiding the component entirely — keeps UI consistent and user sees the control exists but can't change it
  - PR history loads all groups then slices to 3 via $derived instead of limiting the API call — ensures correct group ordering is preserved and premium toggle works without reload
  - UpgradePrompt feature prop is typed union ('full_charts' | 'extended_history') not free string — prevents typos and enables compile-time checking
patterns_established:
  - Premium gating pattern for pages: isPremiumUser() awaited in init function before data loading, result stored in $state, UI conditionally rendered with {#if premium}
  - UpgradePrompt usage pattern: place below gated content with feature context prop, component handles message selection and button logging
observability_surfaces:
  - "[Dashboard] premium: true/false" console log on analytics page init
  - "[PRHistory] premium: true/false" console log on PR history page init
  - "[Premium] Upgrade tapped — feature: {feature} (coming soon)" on upgrade button click
  - Premium status check failure logged with console.error, defaults to free (safe degradation)
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Create UpgradePrompt component and wire gate into analytics dashboard + PR history

**Built reusable UpgradePrompt component and wired premium gates into analytics dashboard (tab + time range restrictions) and PR history (3-exercise limit) with positive upgrade framing.**

## What Happened

Created `UpgradePrompt.svelte` as a reusable premium upgrade prompt using shadcn-svelte Card + Button with Lock icon and positive framing ("Mehr Einblicke freischalten"). The component accepts a typed `feature` prop that selects the appropriate context-specific description message.

Modified the analytics dashboard to check `isPremiumUser()` before loading data. Free users see only Strength and Frequency tabs (Volume and Body Weight hidden), time range forced to 30d with the TimeRangeSelect disabled. UpgradePrompt appears below the tabs for free users.

Modified PR history to check premium status and limit exercise groups to 3 for free users using a `$derived` slice of the full `allGroups` array. UpgradePrompt appears below the visible cards when more groups exist.

Updated `TimeRangeSelect` with a `restrictTo30d` prop that filters options to only 30d and disables the select control entirely.

Added i18n keys to both `de.json` and `en.json` for all upgrade prompt strings (5 keys each).

## Verification

- `pnpm --filter mobile run build` — zero errors, build succeeds
- `pnpm --filter mobile test -- --grep "premium"` — all 354 tests pass (including 15 premium service tests from T01)
- Code review: `isPremiumUser()` awaited before data loading in both pages, tab/group limits applied conditionally, UpgradePrompt shown at correct positions
- Slice-level checks: `pnpm test -- --grep "premium"` passes; `pnpm run build` passes; remaining slice checks (manual toggle, progression suggestions) are for later tasks

## Diagnostics

- Console filter `[Dashboard]` shows premium status on analytics page load
- Console filter `[PRHistory]` shows premium status on PR history page load
- Console filter `[Premium] Upgrade tapped` shows upgrade button clicks with feature context
- If `isPremiumUser()` throws, both pages catch the error, log it, and default to free (safe degradation)

## Deviations

- Removed unused `goto` import from PR history page (was imported but only `history.back()` was used) — cleanup, not a deviation from plan
- TimeRangeSelect uses `disabled` prop on the Select.Root rather than just hiding options — provides better UX (user sees the select but can't change it, rather than the select disappearing entirely)

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — new reusable upgrade prompt component with feature-contextual messaging
- `apps/mobile/src/routes/history/analytics/+page.svelte` — added premium gate: tabs restricted to Strength + Frequency, time range locked to 30d, UpgradePrompt shown for free users
- `apps/mobile/src/routes/history/prs/+page.svelte` — added premium gate: max 3 exercise groups for free users with UpgradePrompt below
- `apps/mobile/src/lib/components/analytics/TimeRangeSelect.svelte` — added `restrictTo30d` prop to disable and filter options
- `apps/mobile/messages/de.json` — added 5 premium upgrade i18n keys
- `apps/mobile/messages/en.json` — added 5 premium upgrade i18n keys
