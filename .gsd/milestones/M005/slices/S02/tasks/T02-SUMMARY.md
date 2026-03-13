---
id: T02
parent: S02
milestone: M005
provides:
  - Social login buttons and divider on the sign-up page, matching sign-in layout
key_files:
  - apps/mobile/src/routes/auth/sign-up/+page.svelte
key_decisions:
  - none — followed sign-in page pattern exactly
patterns_established:
  - none — reused existing pattern from sign-in page
observability_surfaces:
  - "[Auth UI] social sign-in error:" and "[SocialLogin] loginWithGoogle/loginWithApple:" console logs now fire on the sign-up page as well
  - Visual parity between sign-in and sign-up pages is a regression signal
duration: 5m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Add social buttons to sign-up page and run final sync

**Added SocialLoginButtons component and "or" divider to the sign-up page, matching sign-in layout; verified build, cap sync, and i18n parity.**

## What Happened

Imported `SocialLoginButtons` and `goto` into the sign-up page. Added the component with `onSuccess={() => goto('/programs')}` after the header, followed by the identical "or" divider markup from the sign-in page. The sign-up page now mirrors sign-in: social buttons → divider → email form → sign-in link.

Ran `pnpm cap sync` — `@capgo/capacitor-social-login` appears in the iOS plugin list with Apple provider enabled. i18n key counts are identical (de.json=415, en.json=415).

## Verification

All slice-level checks pass (this is the final task):

- ✅ `pnpm --filter mobile test` — 534 tests pass across 22 test files
- ✅ `pnpm --filter mobile build` — builds successfully
- ✅ `pnpm --filter mobile exec cap sync` — succeeds, `@capgo/capacitor-social-login` in iOS plugin list, Apple provider enabled
- ✅ i18n key count: de.json=415, en.json=415 (zero drift)
- ✅ `grep SocialLoginButtons sign-up/+page.svelte` — import and usage present
- ✅ `grep auth_social_divider_or sign-up/+page.svelte` — divider present

## Diagnostics

- Sign-up page social login errors surface via `[Auth UI] social sign-in error:` console log (same as sign-in page)
- Missing social buttons on sign-up = visual regression compared to sign-in page
- Cap sync output confirms native plugin wiring — re-run `pnpm cap sync` to verify

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — added SocialLoginButtons import, component, and "or" divider above email form
- `.gsd/milestones/M005/slices/S02/tasks/T02-PLAN.md` — added Observability Impact section (pre-flight fix)
