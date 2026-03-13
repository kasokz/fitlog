---
id: T03
parent: S01
milestone: M004
provides:
  - Sign-in and sign-up screens with superforms SPA mode + zod4 validation + shadcn-svelte form components
  - Auth entry point in Settings page (sign-in/sign-up when unauthenticated, user info + sign-out when authenticated)
  - Bottom nav hidden on /auth/* routes
  - German (de) and English (en) i18n keys for all auth UI strings
key_files:
  - apps/mobile/src/lib/schemas/auth.ts
  - apps/mobile/src/routes/auth/sign-in/SignInForm.svelte
  - apps/mobile/src/routes/auth/sign-in/+page.svelte
  - apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte
  - apps/mobile/src/routes/auth/sign-up/+page.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Schemas placed in lib/schemas/auth.ts (plan path) rather than lib/types/ (existing convention) — keeps auth schemas separate from DB entity types
  - Sign-up uses email prefix as user name for Better Auth (which requires a name field) — avoids adding a name field to the sign-up form
  - Password match refine uses path confirmation message key 'passwords_must_match' — superforms surfaces this as the field error
patterns_established:
  - Auth form pattern — superforms SPA + zod4Client + shadcn-svelte Form components + auth-client service integration + toast feedback + goto navigation
  - Auth state in settings — $effect loading async auth state on mount, conditional UI rendering based on isSignedIn
observability_surfaces:
  - Console logs: [Auth UI] prefixed messages on form submission errors
  - Auth service logs: [Auth] prefixed from auth-client.ts (existing from T02)
  - Toast messages surface success/failure to user
duration: ~20 min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Mobile auth UI — sign-up and sign-in screens with superforms

**Built sign-up/sign-in pages with superforms SPA mode + zod4 validation, auth entry in Settings with sign-out, and 26 new i18n keys in de/en.**

## What Happened

Created the full auth UI layer for mobile:

1. **Zod schemas** — `signInSchema` (email + password) and `signUpSchema` (email + password + confirmPassword with `.refine()` for match) using zod4 syntax.

2. **Form components** — `SignInForm.svelte` and `SignUpForm.svelte` following the exact pattern from ProgramForm/BodyWeightForm: superforms `defaults()` + `zod4()`, SPA mode, `zod4Client` validators, shadcn-svelte `Form.*` components with formsnap. On submit, calls auth-client service, shows toast, navigates to `/programs` on success.

3. **Page routes** — `/auth/sign-in` and `/auth/sign-up` with centered mobile layout (no bottom nav), app title header, and cross-links between pages.

4. **Settings auth section** — Added account section between language and subscription sections. When not signed in: shows "Anmelden" and "Registrieren" buttons navigating to auth routes. When signed in: shows user email, "Angemeldet" status, and sign-out button with loading state.

5. **Bottom nav hidden** — Added `!page.url.pathname.startsWith('/auth/')` to `showBottomNav` derived in layout.

6. **i18n keys** — Added 26 auth keys to both de.json and en.json. German uses proper Umlaute. Both files have 393 keys, perfectly synced.

## Verification

- `pnpm --filter mobile test` — **454 tests passed** (18 test files, 0 failures)
- `pnpm --filter mobile build` — clean build, auth routes compiled to output
- `pnpm --filter mobile check` — 33 pre-existing type errors, **0 errors in new auth files**
- `de.json` / `en.json` — 393 keys each, no duplicates, key diff shows perfect sync
- `pnpm paraglide:compile` — successful compilation of all message keys

### Slice-level verification (partial — T03 is the final task):
- [x] `pnpm --filter mobile test` — 454 tests pass
- [x] `pnpm --filter mobile check` — no new type errors (33 pre-existing)
- [ ] Manual: sign-up from mobile app → requires running dev server + API (user verification)
- [ ] Manual: sign-in, verify token, sign-out → requires running dev server + API (user verification)

## Diagnostics

- Auth form errors: look for `[Auth UI]` prefixed console logs from form components
- Auth service flow: look for `[Auth]` prefixed console logs from auth-client.ts
- Toast messages surface success/error to user on all auth operations
- Auth state inspection: call `getAuthState()` from auth-client.ts

## Deviations

- Added en.json translations alongside de.json to maintain sync (plan only specified de.json base locale, but AGENTS.md rules require keeping all locale files synced)

## Known Issues

- 33 pre-existing type errors in `pnpm check` (none from auth files — all from exercise/workout/settings modules)
- Full end-to-end manual verification requires running both the mobile dev server and the web API with Postgres — not tested in this task execution (per AGENTS.md: "Do not start the dev server yourself")

## Files Created/Modified

- `apps/mobile/src/lib/schemas/auth.ts` — Zod4 schemas for sign-in and sign-up with password match refine
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Sign-in page with centered layout and sign-up link
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Sign-in form with superforms SPA + email/password fields
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Sign-up page with centered layout and sign-in link
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — Sign-up form with superforms SPA + email/password/confirm fields
- `apps/mobile/src/routes/settings/+page.svelte` — Added auth section with sign-in/sign-up buttons and sign-out
- `apps/mobile/src/routes/+layout.svelte` — Updated showBottomNav to hide on /auth/* routes
- `apps/mobile/messages/de.json` — Added 26 auth i18n keys (German)
- `apps/mobile/messages/en.json` — Added 26 auth i18n keys (English)
