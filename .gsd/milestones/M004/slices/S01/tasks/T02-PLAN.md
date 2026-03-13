---
estimated_steps: 4
estimated_files: 3
---

# T02: Mobile auth service — sign-up/in/out, token storage, auth state

**Slice:** S01 — Backend API + Auth + Mobile Sign-In
**Milestone:** M004

## Description

Create the mobile-side auth service that wraps Better Auth client calls, persists Bearer tokens and user info in `@capacitor/preferences`, and exposes auth state for consumption by other services (sync in S02, UI in T03). Follows existing service patterns (D073 catch-and-return, D103 Preferences storage, `[Auth]` prefixed logging matching `[Premium]` and `[Haptics]` patterns).

## Steps

1. **Create auth-client.ts** — New file at `apps/mobile/src/lib/services/auth-client.ts`. Define Preferences keys for token, user ID, user email. Configure API base URL (use environment variable or constant — the mobile SPA calls the web app's API). Implement:
   - `signUp(email, password, name)` → calls Better Auth sign-up endpoint via fetch, stores token + user info in Preferences, returns `{success, error?}`
   - `signIn(email, password)` → calls Better Auth sign-in endpoint, stores token + user info, returns `{success, error?}`
   - `signOut()` → clears stored token + user info from Preferences
   - `getStoredToken()` → reads token from Preferences (returns `string | null`)
   - `getAuthState()` → reads stored user info, returns `{isSignedIn: boolean, userId: string | null, email: string | null}`
   - `isSignedIn()` → convenience boolean check
   All functions use `[Auth]` prefixed logging. All catch errors and return safe defaults (never throw), matching the premium.ts / purchase-plugin.ts pattern.

2. **Handle Better Auth response format** — Better Auth sign-up/sign-in returns a session object with token. Extract the Bearer token from the response. For the Bearer plugin specifically, the token may be in the response headers or body — inspect Better Auth Bearer plugin docs. Store the raw Bearer token string, not the full session object.

3. **Add API base URL configuration** — The mobile SPA (static adapter) needs to know the API server URL. Add a constant in auth-client.ts (e.g., `API_BASE_URL`) that defaults to a sensible local dev value. For production, this would be configured per environment. This is a simple string constant — not a full env system.

4. **Write unit tests** — Create `apps/mobile/src/lib/services/__tests__/auth-client.test.ts`. Mock `@capacitor/preferences` (same pattern as premium.test.ts). Mock `fetch` for API calls. Test: signUp success stores token, signIn success stores token, signOut clears stored data, getAuthState returns correct state, error handling returns safe defaults without throwing. Verify existing tests are unaffected.

## Must-Haves

- [ ] `signUp()`, `signIn()`, `signOut()` functions that call Better Auth API and persist tokens
- [ ] Token + user info stored in `@capacitor/preferences` (matching D103)
- [ ] `getAuthState()` returns typed `{isSignedIn, userId, email}` readable by other services
- [ ] Never throws — all errors caught and returned as typed results (matching D073)
- [ ] `[Auth]` prefixed logging on all operations
- [ ] Unit tests covering happy path and error cases
- [ ] Existing 428 tests unaffected

## Verification

- `pnpm --filter mobile test -- auth-client` — new tests pass
- `pnpm --filter mobile test` — all 428+ existing tests still pass
- `pnpm --filter mobile check` — no type errors

## Inputs

- T01 output: Running Better Auth server with sign-up/sign-in endpoints
- Existing patterns: `apps/mobile/src/lib/services/premium.ts` (Preferences pattern, catch-and-return), `apps/mobile/src/lib/services/purchase-plugin.ts` (logging pattern)
- Decisions: D073 (catch-and-return), D103 (Preferences for token storage)

## Expected Output

- `apps/mobile/src/lib/services/auth-client.ts` — Auth service module with sign-up/in/out, token storage, auth state
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — Unit tests for auth service
