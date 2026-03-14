# S01: No-Reload Language Switching

**Goal:** Language switching in Settings updates all visible text instantly without page reload.
**Demo:** User taps a different language in Settings → all visible text updates in-place, no flash or navigation.

## Must-Haves

- `overwriteGetLocale` wired so all `getLocale()` consumers return reactive locale
- `overwriteSetLocale` wired so `setLocale()` persists to localStorage without triggering reload
- `{#key locale}` wrapper around content forces re-render on locale change
- ModeWatcher, Toaster, BottomNav stay outside the key block (no teardown on switch)
- Original `setLocale` reference saved before overwrite to preserve localStorage persistence

## Verification

- `cd apps/mobile && pnpm build` — no compilation errors
- Manual: open app → Settings → tap different language → all visible text updates without page reload
- Manual: navigate to other pages after switch → correct language persists
- Manual: close and reopen app → selected language persists (localStorage)

## Tasks

- [x] **T01: Wire paraglide locale overwrites in root layout for instant language switching** `est:20m`
  - Why: This is the entire slice — wire reactive locale state through paraglide's overwrite hooks so language changes don't trigger page reloads
  - Files: `apps/mobile/src/routes/+layout.svelte`
  - Do: Import `overwriteGetLocale`, `overwriteSetLocale`, `setLocale`, `getLocale` from paraglide runtime. Save reference to original `setLocale` before overwriting. Add `locale` `$state` initialized from `getLocale()`. Call `overwriteGetLocale(() => locale)` and `overwriteSetLocale((newLocale) => { locale = newLocale; originalSetLocale(newLocale, { reload: false }); })` in the existing init block. Wrap the content `<div>` in `{#key locale}` — keep ModeWatcher, Toaster outside. Follow yahtzee reference pattern exactly.
  - Verify: `cd apps/mobile && pnpm build` succeeds. Settings page `setLocale(value)` call is automatically intercepted — no changes needed there.
  - Done when: Build passes and the overwrite wiring is in place so language switch goes through the non-reload path

## Observability / Diagnostics

- **Console signals:** `[Locale] Overwrite wired — initial: <locale>` logged once at startup to confirm overwrite hooks are active. `[Locale] Switched: <old> → <new>` logged on each locale change via the overwrite handler.
- **Inspection surface:** `getLocale()` from paraglide runtime returns the reactive `$state` value — call it from browser console (`import('$lib/paraglide/runtime.js').then(m => console.log(m.getLocale()))`) to inspect current locale.
- **Failure visibility:** If `overwriteSetLocale` handler throws, the error propagates to the caller (settings page). If `overwriteGetLocale` is not wired, `getLocale()` returns the stale initial locale — visible as text not updating after language switch.
- **Redaction:** No secrets or PII involved in locale switching.

## Files Likely Touched

- `apps/mobile/src/routes/+layout.svelte`
