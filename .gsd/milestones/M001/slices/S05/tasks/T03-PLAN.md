---
estimated_steps: 5
estimated_files: 6
---

# T03: Build onboarding route UI and wire root layout guard

**Slice:** S05 — Onboarding & Program Templates
**Milestone:** M001

## Description

Builds the user-facing onboarding flow: a `/onboarding` route with template selection cards, a loading overlay during creation, a "Skip" option, and the root layout guard that redirects first-launch users. Also adds all new German (de.json) i18n keys. After this task, the full onboarding flow works end-to-end in the browser.

## Steps

1. **Create TemplateCard component** — `src/lib/components/onboarding/TemplateCard.svelte`. Card-based display for a program template: icon (Dumbbell), template name, description, badge showing day count. Uses shadcn Card, Badge components. Fires an `onselect` callback prop. Follow the visual pattern of `ProgramCard.svelte` but adapted for template selection (no chevron, more prominent layout since these are full-width selection cards).

2. **Create `/onboarding` route** — `src/routes/onboarding/+page.svelte` + `+layout.ts` (ssr: false). Page shows: heading ("Wähle dein Trainingsprogramm"), brief description, then 3 TemplateCard components (one per template from `PROGRAM_TEMPLATES`). Below the cards, a subtle "Skip" text button for users who want to create their own. On template selection: set a `creating` $state flag to true → show a loading overlay (Loader2 spinner + text) → call `createProgramFromTemplate(templateId)` → call `completeOnboarding()` → show success toast → `goto('/')`. On skip: call `completeOnboarding()` → `goto('/')`. On error: show error toast, reset creating flag. Use `getDb()` to ensure DB is initialized before template creation.

3. **Wire root layout onboarding guard** — Modify `src/routes/+layout.svelte` to check onboarding status on mount. Use `$effect` with an async IIFE: call `isOnboardingCompleted()` → if false and current path is not `/onboarding`, call `goto('/onboarding', { replaceState: true })`. Set a `ready` $state that starts false and flips true once the check completes. Wrap `{@render children()}` in an `{#if ready}` block to prevent flash of home screen. Import `page` from `$app/state` to check current path.

4. **Add German (de.json) i18n keys** — Add all new onboarding strings to `apps/mobile/messages/de.json`:
   - `onboarding_title`, `onboarding_description`
   - `onboarding_template_ppl_name`, `onboarding_template_ppl_description`
   - `onboarding_template_upper_lower_name`, `onboarding_template_upper_lower_description`
   - `onboarding_template_full_body_name`, `onboarding_template_full_body_description`
   - `onboarding_template_days_count` (with `{count}` param)
   - `onboarding_creating`, `onboarding_creating_description`
   - `onboarding_success`, `onboarding_error`
   - `onboarding_skip`, `onboarding_skip_description`

5. **Verify full flow** — `pnpm --filter mobile build` passes. Manual verification in browser: fresh state → redirect to /onboarding → see 3 template cards → pick one → loading state shown → program created → redirected to home → navigate to programs page → program visible → reload → onboarding skipped.

## Must-Haves

- [ ] TemplateCard component renders template name, description, day count badge
- [ ] `/onboarding` page shows all 3 templates and a skip option
- [ ] Loading overlay with spinner shown during template creation — buttons disabled
- [ ] Success toast on completion, error toast on failure
- [ ] Root layout redirects to `/onboarding` on first launch (no onboarding_completed flag)
- [ ] Root layout does NOT redirect if already on `/onboarding` route
- [ ] Root layout does NOT redirect if onboarding is already completed
- [ ] No flash of home screen before redirect (loading guard)
- [ ] "Skip" button marks onboarding complete and navigates to home without creating a program
- [ ] All new strings in de.json with proper German translations
- [ ] Build passes with no type errors

## Verification

- `pnpm --filter mobile build` — clean build, no type errors
- Manual: open app in browser → onboarding flow → template selection → program creation → home redirect → programs page shows created program → reload skips onboarding

## Observability Impact

- Signals added/changed: `[Onboarding]` console logs in the onboarding page component for user actions (template selected, skip pressed, creation started, creation complete/failed). Toasts provide user-visible feedback.
- How a future agent inspects this: Check browser console for `[Onboarding]` and `[TemplateService]` log lines. Check `/programs` page for created program. Check Capacitor Preferences for `onboarding_completed` key.
- Failure state exposed: Error toast with message visible in UI. Full error in console. Loading state resets on failure so user can retry.

## Inputs

- `apps/mobile/src/lib/services/template-service.ts` — createProgramFromTemplate() from T02
- `apps/mobile/src/lib/services/onboarding.ts` — isOnboardingCompleted(), completeOnboarding() from T02
- `apps/mobile/src/lib/data/templates/index.ts` — PROGRAM_TEMPLATES registry from T01
- `apps/mobile/src/lib/data/templates/types.ts` — ProgramTemplate type from T01
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte` — visual pattern reference
- `apps/mobile/src/routes/+layout.svelte` — existing root layout to modify
- `apps/mobile/messages/de.json` — existing i18n file to extend

## Expected Output

- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — template selection card component
- `apps/mobile/src/routes/onboarding/+page.svelte` — onboarding page with template selection
- `apps/mobile/src/routes/onboarding/+layout.ts` — ssr: false
- `apps/mobile/src/routes/+layout.svelte` — modified with onboarding guard
- `apps/mobile/messages/de.json` — extended with onboarding keys
