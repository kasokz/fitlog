---
estimated_steps: 4
estimated_files: 5
---

# T03: Add Google sign-in button to sign-in page with i18n

**Slice:** S01 — Server Config + Auth Client + Google Sign-In
**Milestone:** M005

## Description

Create the `SocialLoginButtons` component with a Google sign-in button, wire it into the sign-in page above the email form with a divider, and add all required i18n keys in both `de.json` and `en.json`.

## Steps

1. Add i18n keys to `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json`:
   - `auth_social_google_button`: "Mit Google fortfahren" / "Continue with Google"
   - `auth_social_divider_or`: "oder" / "or"
   - `auth_social_signin_success`: "Erfolgreich angemeldet" / "Signed in successfully"
   - `auth_social_signin_error`: "Anmeldung fehlgeschlagen" / "Sign-in failed"
2. Create `apps/mobile/src/lib/components/SocialLoginButtons.svelte`:
   - Takes `onSuccess?: () => void` callback prop for post-sign-in navigation (reusable for S02 sign-up page)
   - Google button: full-width, outline style, Google "G" SVG icon, text from `m.auth_social_google_button()`
   - On click: set loading state → call `loginWithGoogle()` from social-login-plugin → if null (cancel), stop loading silently → if result, call `signInWithSocial('google', result.idToken, result.accessToken)` from auth-client → on success: toast success, call `onSuccess` callback → on error: toast error
   - Loading state disables the button and shows spinner
   - Handles the `fullSync().catch(() => {})` fire-and-forget after success
3. Update `apps/mobile/src/routes/auth/sign-in/+page.svelte`:
   - Import `SocialLoginButtons`
   - Place it between the header and `<SignInForm />`
   - Add an "or" divider between `SocialLoginButtons` and `SignInForm`: a horizontal line with centered "or" text (`auth_social_divider_or` i18n key)
   - Pass `onSuccess` callback that does `goto('/programs')`
4. Run `pnpm paraglide:compile` to ensure i18n functions generate. Verify `pnpm --filter mobile build` succeeds. Verify both locale files have matching key counts.

## Must-Haves

- [ ] `SocialLoginButtons` component with Google button, loading state, cancel handling
- [ ] Google button calls plugin → auth-client → toast → navigate → sync
- [ ] User cancel (plugin returns null) produces no toast, no error
- [ ] "or" divider between social buttons and email form on sign-in page
- [ ] i18n keys in both `de.json` and `en.json`
- [ ] Component takes `onSuccess` prop for reuse in S02
- [ ] `pnpm --filter mobile build` succeeds

## Verification

- `pnpm --filter mobile build` compiles successfully
- `jq 'keys | length' apps/mobile/messages/de.json` equals `jq 'keys | length' apps/mobile/messages/en.json` (same key count)
- `grep 'auth_social_google_button' apps/mobile/messages/de.json apps/mobile/messages/en.json` returns matches in both files
- Visual: sign-in page shows Google button → divider → email form

## Observability Impact

- **Console logs:** `[Auth UI] social sign-in error:` logged on unexpected exceptions in the button handler. All other logging is handled by the underlying `loginWithGoogle()` (`[SocialLogin]` prefix) and `signInWithSocial()` (`[Auth]` prefix) — no new log prefixes introduced.
- **User-visible signals:** Success toast (`auth_social_signin_success`) and error toast (`auth_social_signin_error`) provide immediate feedback. User cancel produces no toast — intentional silent handling.
- **Inspection:** After a successful Google sign-in, `getAuthState()` returns the social-signed-in user info. The sign-in page navigates to `/programs` on success.
- **Failure visibility:** Loading state resets in `finally` block — button never gets stuck disabled. Plugin returning `null` (cancel/web) is handled as a non-error exit. Auth-client errors surface via toast with the specific error message from the server.

## Inputs

- `apps/mobile/src/lib/services/social-login-plugin.ts` — `loginWithGoogle()` from T02
- `apps/mobile/src/lib/services/auth-client.ts` — `signInWithSocial()` from T02
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — existing sign-in page layout
- `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json` — existing locale files

## Expected Output

- `apps/mobile/src/lib/components/SocialLoginButtons.svelte` — new component
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — updated with social buttons + divider
- `apps/mobile/messages/de.json` — updated with 4 new keys
- `apps/mobile/messages/en.json` — updated with 4 new keys
