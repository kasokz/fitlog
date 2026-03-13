---
estimated_steps: 5
estimated_files: 5
---

# T04: Wire sync triggers into app lifecycle + install @capacitor/network

**Slice:** S02 — Sync Protocol + Two-Way Sync
**Milestone:** M004

## Description

The sync service from T03 exists but nothing calls it. This task wires automatic sync triggers into the app lifecycle: full sync after sign-in/sign-up, incremental sync on app resume, and incremental sync on connectivity restore. Requires installing `@capacitor/network` for connectivity detection.

## Steps

1. Install `@capacitor/network` in `apps/mobile`:
   - `pnpm --filter mobile add @capacitor/network`
   - No `cap sync` needed for dev/web — the plugin has web fallback via `navigator.onLine`

2. Wire sync triggers in `apps/mobile/src/routes/+layout.svelte`:
   - Import `incrementalSync` from `sync.ts`
   - Import `Network` from `@capacitor/network`
   - In the existing `onMount` block (where `revalidatePurchases()` fires): add `incrementalSync().catch(() => {})` (fire-and-forget, same pattern as revalidatePurchases)
   - In the existing `App.addListener('resume')` handler: add `incrementalSync().catch(() => {})` alongside `revalidatePurchases()`
   - Add new `Network.addListener('networkStatusChange', (status) => { if (status.connected) incrementalSync().catch(() => {}); })` listener. Clean up on destroy.

3. Wire full sync after sign-in in `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte`:
   - Import `fullSync` from `sync.ts`
   - In the success path (after `signIn()` returns success, after `goto('/')`): call `fullSync().catch(() => {})` — fire-and-forget, don't block navigation
   - The sign-in page navigates to `/` on success. Full sync runs in background.

4. Wire full sync after sign-up in `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte`:
   - Same pattern as sign-in: import `fullSync`, call after successful sign-up and navigation

5. Verify the complete stack:
   - `pnpm --filter mobile build` — compiles with new imports and `@capacitor/network`
   - `pnpm --filter mobile test` — all tests still pass (new imports don't break existing tests since they're mocked/isolated)
   - `pnpm --filter web build` — still compiles
   - `pnpm --filter web test` — still passes

## Must-Haves

- [ ] `@capacitor/network` installed in `apps/mobile`
- [ ] Incremental sync fires on app mount (if signed in)
- [ ] Incremental sync fires on app resume (if signed in)
- [ ] Incremental sync fires on connectivity restore (if signed in)
- [ ] Full sync fires after successful sign-in
- [ ] Full sync fires after successful sign-up
- [ ] All sync calls are fire-and-forget (never block UI)
- [ ] Network listener cleaned up on component destroy
- [ ] `pnpm --filter mobile build` and `pnpm --filter web build` succeed
- [ ] All existing tests pass

## Verification

- `pnpm --filter mobile build` — compiles cleanly
- `pnpm --filter mobile test` — all 454+ tests pass
- `pnpm --filter web test` — all tests pass
- `grep 'incrementalSync\|fullSync' apps/mobile/src/routes/+layout.svelte apps/mobile/src/routes/auth/*/SignInForm.svelte apps/mobile/src/routes/auth/*/SignUpForm.svelte` — confirms wiring
- `grep '@capacitor/network' apps/mobile/package.json` — confirms dependency installed

## Inputs

- T03 output: `apps/mobile/src/lib/services/sync.ts` — `fullSync()`, `incrementalSync()` exports
- `apps/mobile/src/routes/+layout.svelte` — existing resume handler and mount block
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — existing sign-in success path
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — existing sign-up success path
- `references/capacitor-plugins/network/` — `@capacitor/network` API reference

## Expected Output

- Modified: `apps/mobile/package.json` — `@capacitor/network` dependency added
- Modified: `apps/mobile/src/routes/+layout.svelte` — sync triggers on mount, resume, connectivity
- Modified: `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — full sync after sign-in
- Modified: `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — full sync after sign-up
