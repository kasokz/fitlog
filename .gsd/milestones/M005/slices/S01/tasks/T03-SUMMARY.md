---
id: T03
parent: S01
milestone: M005
provides:
  - SocialLoginButtons component with Google sign-in (reusable via onSuccess prop)
  - Sign-in page wired with social buttons + "or" divider above email form
  - 4 i18n keys (auth_social_*) in de.json and en.json
key_files:
  - apps/mobile/src/lib/components/SocialLoginButtons.svelte
  - apps/mobile/src/routes/auth/sign-in/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - SocialLoginButtons placed at top-level components dir (not nested) since it's shared across auth pages
  - Google "G" logo rendered as inline SVG with official brand colors rather than importing an icon library
  - Loading spinner replaces the Google icon position (same LoaderCircle pattern as SignInForm)
patterns_established:
  - Social button component takes onSuccess callback for page-specific navigation — caller decides where to go
  - "or" divider uses shadcn-style horizontal rule with centered text on bg-background
observability_surfaces:
  - "[Auth UI] social sign-in error:" console log on unexpected exceptions
  - Success/error toasts (auth_social_signin_success / auth_social_signin_error)
  - User cancel produces no toast (silent exit)
duration: 12 minutes
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Add Google sign-in button to sign-in page with i18n

**Created SocialLoginButtons component with Google sign-in button, wired it into the sign-in page with an "or" divider, and added all i18n keys.**

## What Happened

Added 4 i18n keys (`auth_social_google_button`, `auth_social_divider_or`, `auth_social_signin_success`, `auth_social_signin_error`) to both `de.json` and `en.json`.

Created `SocialLoginButtons.svelte` with a full-width outline Google button featuring the official "G" SVG logo. The component takes an `onSuccess?: () => void` prop for reuse on the sign-up page in S02. The click flow: set loading → `loginWithGoogle()` → if null (cancel/web), exit silently → `signInWithSocial('google', ...)` → toast + navigate + fire-and-forget `fullSync()`. Loading state managed in `finally` block so button never gets stuck.

Updated the sign-in page to show social buttons above the email form with a centered "or" divider between them. The `onSuccess` callback navigates to `/programs` via `goto()`.

## Verification

- `pnpm paraglide:compile` — both projects compiled successfully
- `pnpm --filter mobile build` — builds without errors
- `pnpm --filter web build` — builds without errors
- `pnpm --filter mobile test -- --grep "signInWithSocial"` — all 532 tests pass
- `jq 'keys | length'` — both de.json and en.json have 414 keys (matched)
- `grep auth_social_google_button` — key present in both locale files

### Slice-level verification status (T03 is the final task)

- [x] `pnpm --filter mobile test -- --grep "signInWithSocial"` — 532 tests pass
- [x] `pnpm --filter web build` — server config compiles
- [x] `pnpm --filter mobile build` — mobile app builds
- [ ] `pnpm --filter mobile exec cap sync` — not run (requires native platform setup)
- [ ] UAT: real device Google sign-in — requires real device + credentials

## Diagnostics

- Console: `[Auth UI] social sign-in error:` for unexpected exceptions in button handler
- Console: `[SocialLogin]` prefix logs from plugin wrapper (init, login attempts, cancel)
- Console: `[Auth]` prefix logs from auth-client (signInWithSocial attempting/success/failed)
- Toasts: `auth_social_signin_success` on success, `auth_social_signin_error` on error, nothing on cancel
- Post-sign-in: `getAuthState()` returns user info, Preferences has `auth_token`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — new component with Google sign-in button
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — added social buttons + "or" divider above email form
- `apps/mobile/messages/de.json` — added 4 `auth_social_*` keys
- `apps/mobile/messages/en.json` — added 4 `auth_social_*` keys
- `.gsd/milestones/M005/slices/S01/tasks/T03-PLAN.md` — added Observability Impact section
