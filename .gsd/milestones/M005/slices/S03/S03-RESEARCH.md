# S03: Connected Accounts in Settings — Research

**Date:** 2026-03-13

## Summary

S03 adds a "Connected Accounts" section to the Settings page where users can view their linked providers (Email/Password, Google, Apple), connect a new social provider, and disconnect an existing one. This is a low-risk slice — all server-side infrastructure exists, the mobile auth-client has `signInWithSocial()` ready for reuse, and Better Auth exposes three REST endpoints for account management out of the box.

The primary work is: (1) a new auth-client service layer with `getLinkedAccounts()`, `linkSocialAccount()`, and `unlinkAccount()` functions that call Better Auth's built-in endpoints using Bearer token auth; (2) a `ConnectedAccountsSection.svelte` component following the `SyncStatusSection.svelte` pattern; and (3) i18n keys for the new UI strings in de and en. No server-side changes are needed — Better Auth's `/list-accounts`, `/link-social`, and `/unlink-account` endpoints handle everything.

The main risk is the `freshSessionMiddleware` on the `unlink-account` endpoint — it requires the session to have been updated within 24 hours. For active mobile users this should be fine, but sessions that are >24h old will get a 403. This is a Better Auth default that can be configured if it causes issues.

## Recommendation

**Use Better Auth's built-in REST endpoints directly from the mobile auth-client.** No custom server-side API routes needed.

The approach:
1. **Auth-client functions**: Add `getLinkedAccounts()`, `linkSocialAccount()`, `unlinkAccount()` to `auth-client.ts` — same raw-fetch + Bearer token pattern as `signInWithSocial()` (D113).
2. **ConnectedAccountsSection component**: A self-contained Svelte component placed in `apps/mobile/src/lib/components/settings/` following the `SyncStatusSection.svelte` pattern — loads data in `$effect`, manages its own state, renders provider list with connect/disconnect actions.
3. **Reuse `loginWithGoogle()` / `loginWithApple()`** from the plugin wrapper for the "connect" flow — get the idToken, then call `linkSocialAccount()` which POSTs to `/api/auth/link-social` with the idToken.
4. **Settings page integration**: Import and render `ConnectedAccountsSection` after the Auth section, only when `authState.isSignedIn`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| List linked accounts | Better Auth `GET /api/auth/list-accounts` | Built-in, handles session auth, returns `{id, providerId, accountId}[]` |
| Link social account | Better Auth `POST /api/auth/link-social` with `idToken` body | Supports idToken flow (same as sign-in), verifies token server-side, creates account row |
| Unlink account | Better Auth `POST /api/auth/unlink-account` with `{providerId}` | Built-in, prevents unlinking last account, handles cleanup |
| Get idToken for connect | `loginWithGoogle()` / `loginWithApple()` from `social-login-plugin.ts` | Already wraps native plugin, handles cancellation, returns typed result |
| Settings section pattern | `SyncStatusSection.svelte` | Established pattern: self-contained component, loads in `$effect`, manages own state |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/auth-client.ts` — Auth service with raw fetch + Bearer token. `signInWithSocial()` demonstrates the exact pattern for calling Better Auth endpoints with `Authorization: Bearer <token>`. New functions follow the same `getStoredToken() → fetch with header → parse response → return typed result` chain.
- `apps/mobile/src/lib/services/social-login-plugin.ts` — Plugin wrapper for native Google/Apple sign-in. `loginWithGoogle()` and `loginWithApple()` return idTokens needed for the "connect" flow via `/api/auth/link-social`.
- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — Self-contained settings section component pattern. Uses `$effect` to load data on mount, manages local `$state`, renders with shadcn-svelte components. New `ConnectedAccountsSection` should follow this exact structure.
- `apps/mobile/src/routes/settings/+page.svelte` — Settings page. Currently renders: Theme, Language, Export, Account/Auth, SyncStatusSection (when signed in), Subscription, Premium Dev Toggle, IAP Testing. Connected Accounts section should be placed after Auth section and before Sync Status, only when signed in.
- `apps/web/src/hooks.server.ts` — Better Auth handler via `svelteKitHandler`. The `/api/auth/*` routes bypass `handleApiAuth` and are handled directly by Better Auth. Bearer plugin converts `Authorization: Bearer <token>` to session cookie in the `before` hook, so all Better Auth endpoints work with mobile Bearer auth.
- `apps/web/node_modules/better-auth/dist/api/routes/account.mjs` — Better Auth's account endpoints: `listUserAccounts` (GET `/list-accounts`, sessionMiddleware), `linkSocialAccount` (POST `/link-social`, sessionMiddleware, supports idToken), `unlinkAccount` (POST `/unlink-account`, freshSessionMiddleware).

## Constraints

- **Better Auth endpoints are fixed** — `/list-accounts` (GET), `/link-social` (POST), `/unlink-account` (POST). No custom server routes needed, but the paths and body shapes are determined by Better Auth's implementation.
- **`unlinkAccount` uses `freshSessionMiddleware`** — requires session updated within `freshAge` (default: 24 hours / 86400s). If a user's session hasn't been refreshed in >24h, the unlink call will get a 403 `SESSION_NOT_FRESH`. Active users should rarely hit this.
- **Cannot unlink the last account** — Better Auth's `unlinkAccount` throws `FAILED_TO_UNLINK_LAST_ACCOUNT` if the user has only one linked account. UI must reflect this constraint (disable disconnect on the last remaining account).
- **Only 2 locales** — de.json and en.json. de is the base locale (source of truth).
- **`link-social` with idToken requires email match** — By default, Better Auth requires the social account email to match the current user's email (unless `allowDifferentEmails: true`). This means connecting Google to an email-only account only works if the Google account has the same email. This is the correct behavior for account linking security.
- **Apple profile only on first auth** — If a user connects Apple, profile data (name/email) is only sent on the first authorization. This is fine for linking since the user already has a profile.
- **D113: raw fetch, not Better Auth client SDK** — Continue the established pattern of direct fetch calls with Bearer token.

## Common Pitfalls

- **Forgetting Bearer token on GET requests** — `listUserAccounts` is a GET endpoint that still needs the `Authorization: Bearer <token>` header. Easy to forget since GET requests don't typically need auth headers in some patterns.
- **`link-social` body shape differs from `sign-in/social`** — `link-social` expects `{ provider, idToken: { token, nonce?, accessToken? } }` while `sign-in/social` uses the same shape. They're actually the same — but `link-social` returns `{ url, status, redirect }` not `{ data: { user, session } }`. Don't try to extract a new token from the link response.
- **After link/unlink, must refresh the accounts list** — The local UI state won't automatically update. Call `getLinkedAccounts()` again after any mutation.
- **Unlink last-account error handling** — Better Auth returns a specific error for this case. Must catch it and show a user-friendly message (not a generic error toast).
- **Connect flow should NOT re-sign-in** — The "connect" flow calls `link-social`, not `sign-in/social`. If the user signs in with a different social account, they'd get a new session for a potentially different user. The connect flow links to the *current* session.
- **User cancel on connect** — Same as sign-in cancel: `loginWithGoogle()` returns `null`, should exit silently without error toast (D081/D130 precedent).

## Open Risks

- **`freshSessionMiddleware` blocking unlink for stale sessions** — If a user's session is older than 24 hours and they try to disconnect a provider, they'll get a 403. Mitigation: could configure `session.freshAge` in Better Auth config, or show a "please sign in again" message. Low likelihood for active users.
- **Account listing response shape may vary** — The `listUserAccounts` endpoint returns account objects with `providerId`, `accountId`, and `scopes`. Email-password accounts appear with `providerId: 'credential'`. Need to verify this by checking Better Auth's internal adapter, but the account.mjs source confirms it returns all accounts including email-password ones.
- **Google/Apple "connect" button UX on web dev mode** — Plugin wrapper returns `null` on web (D130). Connect buttons should be disabled or hidden on web dev mode, or show a message that native platform is required. Same limitation as sign-in buttons.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Better Auth | `better-auth/skills@better-auth-best-practices` (22.1K installs) | available |
| Better Auth | `better-auth/skills@create-auth-skill` (8.7K installs) | available |
| Svelte | `sveltejs/ai-tools@svelte-code-writer` (2.5K installs) | available |
| Svelte 5 | `ejirocodes/agent-skills@svelte5-best-practices` (2.1K installs) | available |

The Better Auth best-practices skill (22.1K installs) could be useful for verifying the account management API usage patterns. However, this slice's scope is narrow and the Better Auth source code was read directly — the endpoints are well understood.

## Sources

- Better Auth account endpoints: `GET /list-accounts`, `POST /link-social`, `POST /unlink-account` — full implementation read from `apps/web/node_modules/better-auth/dist/api/routes/account.mjs`
- Bearer plugin converts `Authorization: Bearer` to session cookie — verified from `apps/web/node_modules/better-auth/dist/plugins/bearer/index.mjs`
- `freshSessionMiddleware` requires session updated within `freshAge` (default 86400s/24h) — verified from `apps/web/node_modules/better-auth/dist/context/create-context.mjs`
- S01 forward intelligence: `signInWithSocial()` reusable for connect flow, social provider accounts stored with `providerId` of `google` or `apple`
- S02 forward intelligence: corrected endpoint URL is `/social` not `/social/token`, Apple profile only sent on first authorization
- Settings page structure and SyncStatusSection pattern — read directly from source files
