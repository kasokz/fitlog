---
estimated_steps: 5
estimated_files: 8
---

# T03: Mobile auth UI — sign-up and sign-in screens with superforms

**Slice:** S01 — Backend API + Auth + Mobile Sign-In
**Milestone:** M004

## Description

Build the user-facing sign-up and sign-in screens on mobile, proving the full auth round-trip from UI → auth service → API → Postgres → token stored. Uses superforms SPA mode with zod4 validation and shadcn-svelte form components (formsnap). Adds auth entry point in Settings. Adds base locale (de) i18n keys for all new auth strings.

## Steps

1. **Define Zod schemas** — Create `apps/mobile/src/lib/schemas/auth.ts` with `signInSchema` (email: `z.email()`, password: `z.string().min(8)`) and `signUpSchema` (email: `z.email()`, password: `z.string().min(8)`, confirmPassword: `z.string().min(8)`, with `.refine()` for password match). Use `zod4` syntax per AGENTS.md rules (e.g., `z.email()` not `z.string().email()`).

2. **Create form components** — Per AGENTS.md rules, forms MUST be refactored into their own components:
   - `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Uses superforms SPA mode with `zod4Client` adapter, shadcn-svelte form components (`Form.Field`, `Form.Control`, `Form.Label`, etc. from formsnap). On submit: calls `signIn()` from auth-client.ts. Success → `goto('/programs')` + success toast. Error → shows error in form or toast.
   - `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — Same pattern. Calls `signUp()`. Success → `goto('/programs')` + success toast.

3. **Create page routes** — 
   - `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Clean mobile layout, no bottom nav. Renders SignInForm. Link to sign-up page. App logo/name at top.
   - `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Same layout. Renders SignUpForm. Link to sign-in page.
   - Hide bottom nav on `/auth/*` routes (update the `showBottomNav` derived in `+layout.svelte`).

4. **Add auth entry point in Settings** — Modify `apps/mobile/src/routes/settings/+page.svelte`: when not signed in (check via `isSignedIn()` from auth-client), show a "Sign In" / "Create Account" section with buttons that navigate to `/auth/sign-in` and `/auth/sign-up`. When signed in, show user email and a "Sign Out" button (calls `signOut()`, shows toast). Use `$effect` for async auth state check on mount.

5. **Add i18n keys (de.json base locale)** — Add German translation keys to `apps/mobile/messages/de.json` for all new auth UI strings: form labels (E-Mail, Passwort, Passwort bestaetigen), button text (Anmelden, Registrieren, Abmelden), validation messages, page titles, success/error toasts, settings section headers. Follow AGENTS.md: use proper Umlaute (ae→ä, oe→ö, ue→ü).

## Must-Haves

- [ ] Sign-in and sign-up screens render with proper form validation
- [ ] Forms use superforms SPA mode + `zod4Client` + shadcn-svelte form components
- [ ] Successful sign-up/sign-in stores token and navigates to programs page
- [ ] Form validation errors display inline (email format, password length, password match)
- [ ] API errors (duplicate email, wrong password) shown as toast or form error
- [ ] Settings page shows sign-in entry point when not authenticated
- [ ] Settings page shows signed-in user info + sign-out when authenticated
- [ ] Bottom nav hidden on auth routes
- [ ] German i18n keys added to `de.json` for all new UI strings
- [ ] All existing tests pass

## Verification

- Manual: open `/auth/sign-up`, submit with invalid email → see validation error. Submit with valid data against running API → navigated to `/programs`, toast shown.
- Manual: open `/auth/sign-in`, sign in with credentials from sign-up → success.
- Manual: open `/settings` → see signed-in user email and sign-out button. Tap sign-out → section changes to sign-in prompt.
- `pnpm --filter mobile test` — all existing tests pass
- `pnpm --filter mobile check` — no type errors
- Verify `de.json` has all new keys, no duplicate keys

## Inputs

- T02 output: `auth-client.ts` with signUp, signIn, signOut, getAuthState, isSignedIn functions
- Existing patterns: superforms usage in codebase (check existing form components for SPA mode pattern), shadcn-svelte form components
- Settings page: `apps/mobile/src/routes/settings/+page.svelte` (current structure)
- Layout: `apps/mobile/src/routes/+layout.svelte` (showBottomNav logic)
- i18n: `apps/mobile/messages/de.json` (base locale source of truth)

## Expected Output

- `apps/mobile/src/lib/schemas/auth.ts` — Zod4 schemas for sign-in and sign-up
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Sign-in page
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Sign-in form component
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Sign-up page
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — Sign-up form component
- `apps/mobile/src/routes/settings/+page.svelte` — Modified with auth section
- `apps/mobile/src/routes/+layout.svelte` — Updated showBottomNav for auth routes
- `apps/mobile/messages/de.json` — New auth i18n keys
