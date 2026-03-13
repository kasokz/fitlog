---
id: T03
parent: S05
milestone: M001
provides:
  - /onboarding route with template selection UI, loading overlay, skip option
  - Root layout onboarding guard with flash-prevention
  - TemplateCard reusable component for template selection
  - German (de.json) i18n keys for all onboarding strings
key_files:
  - apps/mobile/src/lib/components/onboarding/TemplateCard.svelte
  - apps/mobile/src/routes/onboarding/+page.svelte
  - apps/mobile/src/routes/onboarding/+layout.ts
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Root layout guard uses $effect with untrack() to run once on mount, preventing re-execution on navigation
  - Loading overlay is a fixed full-screen element with backdrop blur, independent of the card layout
  - TemplateCard accepts full ProgramTemplate object and fires onselect callback (not event)
patterns_established:
  - Onboarding guard pattern: $effect + untrack + ready $state flag wrapping children render
  - Onboarding page pattern: creating $state flag disables all buttons and shows overlay during async work
observability_surfaces:
  - "[Onboarding]" console logs for user actions (template selected, skip, creation start/complete/fail)
  - "[TemplateService]" console logs from T02 service during program creation phases
  - Toast notifications for success/error visible in UI
  - Capacitor Preferences key "onboarding_completed" inspectable programmatically
duration: 15min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Build onboarding route UI and wire root layout guard

**Built the /onboarding route with 3 template selection cards, loading overlay, skip option, and root layout guard that redirects first-launch users — full end-to-end onboarding flow works.**

## What Happened

Created TemplateCard component following ProgramCard visual patterns but adapted for full-width selection with icon, name, description, and day count badge. Built the /onboarding page showing all 3 PROGRAM_TEMPLATES with TemplateCard components, a loading overlay with spinner during creation, and a subtle skip button. Wired the root layout with an onboarding guard that checks `isOnboardingCompleted()` on mount and redirects to /onboarding if not completed. Used `$effect` with `untrack()` to ensure the guard runs exactly once (no re-runs on navigation). A `ready` $state flag wraps the children render to prevent flash of home screen. Added 15 German i18n keys for all onboarding strings.

## Verification

- `pnpm --filter mobile build` — clean build, no type errors
- `pnpm --filter mobile test -- --grep "template"` — 211 tests pass (all template + onboarding tests from T01/T02)
- `pnpm --filter mobile test -- --grep "onboarding"` — 211 tests pass
- Build output confirms onboarding route chunks generated (`entries/pages/onboarding/_page.svelte.js`)

### Slice-level verification status:
- ✅ `pnpm --filter mobile test -- --grep "template"` — all 211 pass
- ✅ `pnpm --filter mobile test -- --grep "onboarding"` — all 211 pass
- ✅ `pnpm --filter mobile build` — clean build
- ⏳ Manual browser verification — requires dev server (user-initiated)

## Diagnostics

- Check browser console for `[Onboarding]` prefix to see guard checks, template selection, skip actions, creation lifecycle
- Check browser console for `[TemplateService]` prefix to see exercise resolution and program creation phases
- Toast notifications provide user-visible feedback for success/error
- Capacitor Preferences `onboarding_completed` key: null = not completed, "true" = completed
- Loading state resets on error so user can retry template selection

## Deviations

- Used `$effect` + `untrack()` instead of `$effect` with async IIFE reading `page` reactively. The plan suggested `$effect` with an async IIFE, but reading `page.url.pathname` inside a plain `$effect` would make it reactive to every navigation change — `untrack()` ensures single execution.

## Known Issues

- `en.json` is missing the 15 new onboarding keys — needs translation sync in a separate locale task per AGENTS.md guidelines.

## Files Created/Modified

- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — template selection card with icon, name, description, day count badge
- `apps/mobile/src/routes/onboarding/+page.svelte` — onboarding page with 3 template cards, loading overlay, skip option
- `apps/mobile/src/routes/onboarding/+layout.ts` — SSR disabled for onboarding route
- `apps/mobile/src/routes/+layout.svelte` — added onboarding guard with ready flag and flash prevention
- `apps/mobile/messages/de.json` — added 15 onboarding i18n keys
