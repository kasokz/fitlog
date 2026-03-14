---
estimated_steps: 4
estimated_files: 1
---

# T01: Wire paraglide locale overwrites in root layout for instant language switching

**Slice:** S01 — No-Reload Language Switching
**Milestone:** M006

## Description

Wire paraglide's `overwriteGetLocale` and `overwriteSetLocale` hooks into the root layout so that all `getLocale()` consumers return a reactive Svelte 5 `$state` value, and `setLocale()` persists to localStorage without triggering a page reload. Add a `{#key locale}` wrapper around the main content to force re-render when the locale changes. This is the complete implementation of R051.

## Steps

1. In `+layout.svelte`, add imports for `getLocale`, `setLocale`, `overwriteGetLocale`, `overwriteSetLocale` from `$lib/paraglide/runtime.js`
2. At module/component top level, save a reference to the original `setLocale` (`const originalSetLocale = setLocale`), declare `let locale = $state(getLocale())`, then call `overwriteGetLocale(() => locale)` and `overwriteSetLocale((newLocale) => { locale = newLocale; originalSetLocale(newLocale, { reload: false }); })`
3. In the template, wrap the `<div class="flex min-h-screen...">` content block inside `{#key locale}` — keep `<ModeWatcher />`, `<Toaster />` outside the key block
4. Run `pnpm build` from `apps/mobile` to verify no compilation errors

## Must-Haves

- [ ] `overwriteGetLocale` called with reactive getter before any user interaction
- [ ] `overwriteSetLocale` called with handler that sets reactive state AND calls original `setLocale` with `{ reload: false }`
- [ ] Original `setLocale` reference saved before overwrite (prevents infinite recursion and preserves localStorage write)
- [ ] `{#key locale}` wraps content div but not ModeWatcher/Toaster/BottomNav-outside-key
- [ ] No changes to settings page needed — existing `setLocale(value)` call is intercepted by overwrite

## Verification

- `cd apps/mobile && pnpm build` — exits 0
- Inspect `+layout.svelte` for correct overwrite wiring pattern matching yahtzee reference
- Confirm ModeWatcher and Toaster are outside the `{#key locale}` block

## Inputs

- `apps/mobile/src/routes/+layout.svelte` — current root layout with init block
- `references/yahtzee/apps/mobile/src/routes/+layout.svelte` — reference pattern for overwrite wiring
- `references/yahtzee/apps/mobile/src/lib/stores/settings.svelte.ts` — reference for save-before-overwrite pattern

## Expected Output

- `apps/mobile/src/routes/+layout.svelte` — updated with paraglide overwrite wiring and `{#key locale}` content wrapper

## Observability Impact

- **New console signals:** `[Locale] Overwrite wired — initial: <locale>` on mount, `[Locale] Switched: <old> → <new>` on each locale change. These confirm the overwrite hooks are active and locale changes are flowing through the reactive path.
- **Inspection:** A future agent can verify correct wiring by checking that `getLocale()` returns the expected locale after a `setLocale()` call, and that the `{#key locale}` block triggers re-render (visible via DOM updates without page reload).
- **Failure state:** If overwrites aren't wired, `setLocale()` triggers a page reload (the default behavior). If the reactive state isn't updating, text won't change after language switch — both are observable without instrumentation.
