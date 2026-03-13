---
estimated_steps: 5
estimated_files: 3
---

# T02: Create UpgradePrompt component and wire gate into analytics dashboard + PR history

**Slice:** S06 — Freemium Analytics Gate
**Milestone:** M002

## Description

Build the reusable `UpgradePrompt.svelte` component and integrate premium gating into the two most visible analytics surfaces: the analytics dashboard (restrict tabs + time range) and PR history page (limit to 3 exercises). Free users see a clear, positively framed upgrade prompt at each gate boundary.

## Steps

1. Create `src/lib/components/premium/UpgradePrompt.svelte`:
   - Uses shadcn-svelte `Card` + `Button` components
   - Accepts a `feature: string` prop to customize the message context (e.g., "full_charts", "extended_history")
   - Positive framing: "Unlock detailed strength curves..." not "You can't access..."
   - Upgrade button is visible but non-functional (logs "Coming soon" to console — M003 wires real IAP)
   - Uses `m.*()` calls for all text (S07 will add the actual keys; use descriptive key names now)
   - Styled with Card border + subtle background, Lock icon from lucide-svelte
2. Modify `src/routes/history/analytics/+page.svelte`:
   - Import `isPremiumUser` from premium service
   - Add `let premium = $state(false)` initialized in an `$effect` that awaits `isPremiumUser()` before data loading starts
   - Gate the time range: free users forced to `30d` (hide 7d and 90d options or force value to 30d)
   - Gate tabs: free users see only Strength and Frequency `Tabs.Trigger` entries; Volume and Body Weight triggers hidden
   - Show `UpgradePrompt` component inline below the visible tabs (or in place of hidden tab content) when user is free
   - Premium users: no changes to existing behavior
3. Modify `src/routes/history/prs/+page.svelte`:
   - Import `isPremiumUser` from premium service
   - Add `let premium = $state(false)` initialized in `$effect`
   - After loading PR groups, if not premium: slice to first 3 groups (sorted by most PRs or as-is from the existing sort), show `UpgradePrompt` below the 3 cards
   - Premium users: show all groups as before
4. Ensure `TimeRangeSelect` component handles disabled/forced value gracefully — if free user, the select either hides the 7d/90d options or locks to 30d
5. Run `pnpm run build` to verify zero errors

## Must-Haves

- [ ] `UpgradePrompt.svelte` exists as a reusable component with `feature` prop
- [ ] Upgrade prompt uses positive framing (unlock language, not restriction language)
- [ ] Analytics dashboard shows only Strength + Frequency tabs for free users
- [ ] Analytics dashboard restricts time range to 30d for free users
- [ ] PR history shows max 3 exercise groups for free users with upgrade prompt below
- [ ] Premium users see all tabs, all time ranges, all PR exercise groups unchanged
- [ ] Deload-related UI in dashboard is unaffected (not a dashboard tab — confirmed safe)
- [ ] Build succeeds with zero errors

## Verification

- `pnpm run build` — zero errors
- Code review: `isPremiumUser()` awaited before data loading in both pages, tab/group limits applied conditionally, UpgradePrompt shown at correct positions

## Observability Impact

- Signals added/changed: Dashboard and PR history `$effect` blocks log premium status in their existing `[Dashboard]` / `[PRHistory]` log lines. UpgradePrompt logs "upgrade tapped" with feature context on button click.
- How a future agent inspects this: Check console for `[Dashboard] premium: true/false` and `[PRHistory] premium: true/false` during page load. UpgradePrompt button click logs to console.
- Failure state exposed: If `isPremiumUser()` throws, catch block defaults to `false` (free) — safe degradation. Console error logged.

## Inputs

- `src/lib/services/premium.ts` — T01 output, provides `isPremiumUser()`, `PremiumFeature`
- `src/routes/history/analytics/+page.svelte` — existing dashboard page to modify
- `src/routes/history/prs/+page.svelte` — existing PR history page to modify
- `src/lib/components/analytics/TimeRangeSelect.svelte` — may need modification for restricted options

## Expected Output

- `src/lib/components/premium/UpgradePrompt.svelte` — new reusable component
- `src/routes/history/analytics/+page.svelte` — modified with premium gate (tabs + time range)
- `src/routes/history/prs/+page.svelte` — modified with premium gate (exercise limit)
