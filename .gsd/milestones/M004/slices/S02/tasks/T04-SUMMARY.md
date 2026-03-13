---
id: T04
parent: S02
milestone: M004
provides:
  - "Automatic sync triggers: full sync after sign-in/sign-up, incremental on mount/resume/connectivity restore"
  - "@capacitor/network installed for connectivity detection"
key_files:
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/src/routes/auth/sign-in/SignInForm.svelte
  - apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte
  - apps/mobile/package.json
key_decisions:
  - "No explicit isSignedIn() guards in callers — sync functions already skip silently when no token (T03 pattern)"
  - "Network listener cleanup via onDestroy matches existing resumeHandle pattern"
patterns_established:
  - "Fire-and-forget async with .catch(() => {}) for non-blocking lifecycle hooks (consistent with revalidatePurchases pattern)"
observability_surfaces:
  - "[Sync] prefixed console logs fire on each trigger (mount, resume, connectivity restore, sign-in, sign-up)"
duration: 10m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T04: Wire sync triggers into app lifecycle + install @capacitor/network

**Wired automatic sync into app mount, resume, connectivity restore, sign-in, and sign-up — all fire-and-forget with @capacitor/network for connectivity detection.**

## What Happened

Installed `@capacitor/network` in apps/mobile. Added three sync triggers to `+layout.svelte`: `incrementalSync()` on mount (alongside existing `revalidatePurchases()`), on resume, and on `networkStatusChange` when `status.connected` is true. The network listener is cleaned up in `onDestroy` following the same pattern as the existing `resumeHandle`. Added `fullSync()` calls in `SignInForm.svelte` and `SignUpForm.svelte` after successful authentication and navigation. All sync calls use `.catch(() => {})` to never block UI.

## Verification

- `pnpm --filter mobile build` — compiles cleanly ✅
- `pnpm --filter mobile test` — 483 tests passed ✅
- `pnpm --filter web build` — compiles cleanly ✅
- `pnpm --filter web test` — 26 tests passed ✅
- `grep` confirms `incrementalSync` in layout (3 call sites), `fullSync` in SignInForm and SignUpForm ✅
- `@capacitor/network` present in `apps/mobile/package.json` ✅

### Slice-level verification status (T04 is final task):
- `pnpm --filter mobile test` — 483 passed ✅
- `pnpm --filter web test` — 26 passed ✅
- `pnpm --filter mobile build` — clean ✅
- `pnpm --filter web build` — clean ✅
- `uuid-v5.test.ts` — passed (T01) ✅
- `migration-v6.test.ts` — passed (T01) ✅
- `push.test.ts` — passed (T02) ✅
- `pull.test.ts` — passed (T02) ✅
- `sync.test.ts` — passed (T03) ✅
- Manual integration test (docker + curl) — not run (requires live Postgres, deferred to UAT)

## Diagnostics

- Sync triggers produce `[Sync]` prefixed console logs on every invocation
- On mount: `incrementalSync()` logs push/pull counts or skips silently if no token
- On resume: same incremental sync logging
- On connectivity restore: Network listener fires, `incrementalSync()` logs
- After sign-in/sign-up: `fullSync()` logs full push then pull with row counts
- Errors: logged with `[Sync]` prefix including HTTP status; sync timestamps not updated on failure (retry-safe)

## Deviations

- Task plan mentioned guarding calls with `isSignedIn()` — skipped because sync functions already guard internally (return early when no token stored, per T03 design). Adding redundant guards would be noisy.
- Task plan listed `auth-client.ts` in files to modify — no changes needed there since sync.ts already imports from it.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json` — `@capacitor/network` dependency added
- `apps/mobile/src/routes/+layout.svelte` — sync triggers on mount, resume, and connectivity restore
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — fullSync() after successful sign-in
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — fullSync() after successful sign-up
