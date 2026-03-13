---
estimated_steps: 3
estimated_files: 1
---

# T02: Add social buttons to sign-up page and run final sync

**Slice:** S02 — Apple Sign-In + Auth UI Finalization
**Milestone:** M005

## Description

Completes the auth UI by adding the reusable `SocialLoginButtons` component and "or" divider to the sign-up page, matching the sign-in page layout. Runs `cap sync` to verify the Apple Sign-In entitlement is picked up and all native dependencies are current.

## Steps

1. **Add social buttons to sign-up page**: import `SocialLoginButtons` and `goto` in `sign-up/+page.svelte`. Add `<SocialLoginButtons onSuccess={() => goto('/programs')} />` after the header div, followed by the same "or" divider markup from the sign-in page (centered `{m.auth_social_divider_or()}` text over a border).

2. **Run `pnpm cap sync`** and verify output includes `@capgo/capacitor-social-login` in plugin list and the build completes without errors.

3. **Verify i18n key parity**: confirm de.json and en.json have identical key counts.

## Must-Haves

- [ ] Sign-up page renders `SocialLoginButtons` above the email form
- [ ] "or" divider appears between social buttons and email form
- [ ] `onSuccess` callback navigates to `/programs`
- [ ] `pnpm cap sync` succeeds for iOS
- [ ] i18n key counts match between de.json and en.json

## Verification

- `pnpm --filter mobile build` — app compiles with sign-up page changes
- `pnpm --filter mobile exec cap sync` — succeeds, `@capgo/capacitor-social-login` in output
- `grep 'SocialLoginButtons' apps/mobile/src/routes/auth/sign-up/+page.svelte` — import present
- `grep 'auth_social_divider_or' apps/mobile/src/routes/auth/sign-up/+page.svelte` — divider present

## Inputs

- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — T01 completed Apple button addition
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — reference for the social buttons + divider pattern
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — currently has no social buttons

## Observability Impact

- **Visual parity**: sign-up page now mirrors sign-in page layout — social buttons above email form with divider. Any future layout regression is visible by comparing both pages side-by-side.
- **Runtime signals**: `SocialLoginButtons` component emits `[Auth UI] social sign-in error:` and `[SocialLogin] loginWithGoogle/loginWithApple:` console logs — these now fire on the sign-up page as well.
- **Failure visibility**: if `SocialLoginButtons` fails to render on sign-up, the sign-up page will show only the email form without social buttons or divider — visually distinguishable from the sign-in page.
- **Cap sync verification**: `pnpm cap sync` output includes `@capgo/capacitor-social-login` in the iOS plugin list, confirming the entitlement is wired.

## Expected Output

- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — social buttons + divider above email form, matching sign-in page layout
