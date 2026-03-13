---
id: T02
parent: S01
milestone: M004
provides:
  - Mobile auth service with sign-up, sign-in, sign-out
  - Bearer token persistence in @capacitor/preferences
  - Auth state readable by other services (sync, UI)
  - 26 unit tests for auth-client
key_files:
  - apps/mobile/src/lib/services/auth-client.ts
  - apps/mobile/src/lib/services/__tests__/auth-client.test.ts
key_decisions:
  - D112: Bearer token extracted from `set-auth-token` response header (Bearer plugin output), with body `token` fallback
  - D113: Raw fetch to Better Auth REST endpoints instead of Better Auth client SDK — simpler for cross-origin Bearer token flows
patterns_established:
  - Auth service catch-and-return pattern matching premium.ts / purchase-plugin.ts (D073)
  - Preferences keys prefixed with `auth_` for token/user info storage (D103)
  - `[Auth]` prefixed console logging on all operations
  - extractToken() prefers `set-auth-token` header over body token
observability_surfaces:
  - "[Auth] signUp:" / "[Auth] signIn:" / "[Auth] signOut:" prefixed console logs with success/failure context
  - getAuthState() returns typed {isSignedIn, userId, email, name} for runtime inspection
  - getStoredToken() returns raw Bearer token for debugging auth flows
duration: ~10min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Mobile auth service — sign-up/in/out, token storage, auth state

**Built mobile auth-client service with sign-up/in/out wrapping Better Auth API via fetch, token persistence in Preferences, and typed auth state export. 26 unit tests covering happy path, error handling, and integration flows.**

## What Happened

Created `auth-client.ts` following the established service patterns (premium.ts catch-and-return, purchase-plugin.ts logging). The service uses raw fetch against Better Auth REST endpoints rather than the Better Auth client SDK — the SDK is designed for same-origin SvelteKit apps with cookie auth, not cross-origin Bearer token flows.

Key implementation detail: Better Auth's Bearer plugin exposes the signed session token via a `set-auth-token` response header (plus `Access-Control-Expose-Headers`). The `extractToken()` helper reads this header first, falling back to the response body's `token` field. This signed token is what gets stored in Preferences and sent as `Authorization: Bearer <token>` on subsequent requests.

Functions implemented: `signUp(email, password, name)`, `signIn(email, password)`, `signOut()`, `getStoredToken()`, `getAuthState()`, `isSignedIn()`. All return typed results, never throw. Preferences keys: `auth_token`, `auth_user_id`, `auth_user_email`, `auth_user_name`.

Wrote 26 tests covering: token extraction from header vs body, header preference over body, missing token handling, HTTP errors, network failures, non-Error throws, request body correctness, sign-out clearing, auth state reads, error safe defaults, and full integration flow (sign-up → state check → sign-out → state check).

## Verification

- `pnpm --filter mobile test -- auth-client` — 26 tests pass ✅
- `pnpm --filter mobile test` — 454 total tests pass (428 existing + 26 new) ✅
- `pnpm --filter mobile check` — no errors from auth-client.ts (33 pre-existing errors in other files unrelated to this task) ✅

### Slice-level verification (partial — T02 is intermediate):
- `pnpm --filter web test` — 7 tests pass ✅
- `pnpm --filter mobile test` — 454 tests pass ✅
- `docker compose up -d` + `db:push` — not re-tested (T01 verified, no schema changes) ✅
- `curl` auth endpoints — not re-tested (T01 verified, no server changes) ✅
- Manual mobile auth round-trip — deferred to T03 (UI not yet built)

## Diagnostics

- Auth state inspection: call `getAuthState()` — returns `{isSignedIn, userId, email, name}`
- Token inspection: call `getStoredToken()` — returns raw Bearer token or null
- Console logs: all operations emit `[Auth]` prefixed messages with operation context
- Error shapes: `{success: false, error: "message"}` — never throws, safe to call from any context

## Deviations

- Added `name` field to `AuthState` (not in original task plan's `{isSignedIn, userId, email}` spec) — Better Auth returns user name and it's useful for UI display without extra API calls.
- Used raw fetch instead of `better-auth/svelte` `createAuthClient` as mentioned in task plan's "Do" section — the client SDK doesn't fit cross-origin Bearer token flows (D113).

## Known Issues

- API_BASE_URL defaults to `http://localhost:5173` — must be configured per environment for production. Currently a simple constant (D108).

## Files Created/Modified

- `apps/mobile/src/lib/services/auth-client.ts` — Auth service module with sign-up/in/out, token storage, auth state
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — 26 unit tests for auth service
