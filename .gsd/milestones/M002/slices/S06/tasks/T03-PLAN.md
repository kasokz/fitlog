---
estimated_steps: 5
estimated_files: 3
---

# T03: Gate progression suggestions in workout + add dev toggle in Settings

**Slice:** S06 — Freemium Analytics Gate
**Milestone:** M002

## Description

Complete the final gate point by skipping progression suggestion loading for free users during workouts. Add a dev-only premium toggle in the Settings page so all gate points can be tested at runtime without modifying Preferences directly. Verify the full integration: all 4 gate points respond to the premium flag, and non-gated features (deload, PR celebration, ExercisePRSection) remain untouched.

## Steps

1. Modify `src/routes/workout/[sessionId]/+page.svelte`:
   - Import `isPremiumUser` from premium service
   - Before the existing `loadProgressionSuggestions()` fire-and-forget call (~line 197), check `isPremiumUser()`
   - If free: skip the call entirely — `progressionSuggestions` stays as empty Map, ProgressionBanner never renders
   - If premium: existing behavior unchanged (fire-and-forget call proceeds)
   - Deload banner detection block must remain completely untouched (it's above the progression code)
   - PR celebration in `completeWorkout` must remain completely untouched
   - Add `[Workout] Premium: ${premium}, skipping progression suggestions` log when skipping
2. Modify `src/routes/settings/+page.svelte`:
   - Import `isPremiumUser`, `setPremiumStatus` from premium service
   - Add a "Premium" section wrapped in `{#if import.meta.env.DEV}` block
   - Section contains: heading ("Premium (Dev)"), a shadcn Switch component bound to premium state, and a status label ("Active" / "Inactive")
   - On mount (`$effect`): load current premium status via `isPremiumUser()`
   - On toggle: call `setPremiumStatus(checked)`, update local state
   - Position section after the Language section with consistent spacing
3. Verify deload is NOT gated: read through the deload detection block and confirm no premium check was added. The `isDeloadSession` flag and `DeloadBanner` rendering must be independent of premium status.
4. Verify PR celebration is NOT gated: the `detectSessionPRs()` call in `completeWorkout` must have no premium check around it.
5. Run `pnpm run build` to verify zero errors. Run `pnpm test -- --grep "premium"` to confirm service tests still pass.

## Must-Haves

- [ ] Free users see no progression suggestions during workout (loadProgressionSuggestions skipped)
- [ ] Premium users see progression suggestions as before
- [ ] Deload banner rendering is completely independent of premium status
- [ ] PR celebration toast is completely independent of premium status
- [ ] Dev-only premium toggle appears in Settings when `import.meta.env.DEV` is true
- [ ] Dev toggle correctly reads and writes premium status via the premium service
- [ ] Dev toggle is NOT visible in production builds
- [ ] `pnpm run build` succeeds with zero errors
- [ ] `pnpm test -- --grep "premium"` passes

## Verification

- `pnpm run build` — zero errors
- `pnpm test -- --grep "premium"` — all service tests pass
- Code review: progression skip conditional on premium, deload + PR celebration paths have zero premium imports or checks, Settings toggle wrapped in DEV guard

## Observability Impact

- Signals added/changed: `[Workout] Premium: false, skipping progression suggestions` logged when free user's workout loads. Settings toggle logs `[Premium] setPremiumStatus: true/false` via the service.
- How a future agent inspects this: Check console during workout load for premium skip log. Check Settings page in dev mode for toggle visibility and status.
- Failure state exposed: If `isPremiumUser()` throws in workout page, catch defaults to false (free) — progression suggestions are skipped as safe fallback. Console error logged.

## Inputs

- `src/lib/services/premium.ts` — T01 output
- `src/routes/workout/[sessionId]/+page.svelte` — existing workout page with progression loading at ~line 197
- `src/routes/settings/+page.svelte` — existing settings with theme + language toggles
- T02 output — UpgradePrompt and dashboard/PR gates already wired

## Expected Output

- `src/routes/workout/[sessionId]/+page.svelte` — modified with premium gate on progression suggestions
- `src/routes/settings/+page.svelte` — modified with dev-only premium toggle section
- All 4 gate points functional: dashboard tabs, dashboard time range, PR history limit, progression suggestions
