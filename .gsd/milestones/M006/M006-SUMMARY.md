---
id: M006
provides:
  - reactive locale state via paraglide overwrite hooks in root layout
  - no-reload language switching with instant text update across all pages
key_decisions:
  - "D137: overwriteGetLocale/overwriteSetLocale + reactive state + {#key locale} pattern from yahtzee reference"
patterns_established:
  - Save original setLocale reference before calling overwriteSetLocale to prevent infinite recursion and preserve localStorage persistence
  - Wire overwrites at component top level (not inside onMount/effect) so they're active before any user interaction
  - Keep persistent UI (ModeWatcher, Toaster, BottomNav) outside {#key locale} to avoid teardown on language switch
observability_surfaces:
  - "[Locale] Overwrite wired — initial: <locale>" console log on mount
  - "[Locale] Switched: <old> → <new>" console log on each locale change
requirement_outcomes:
  - id: R051
    from_status: active
    to_status: active
    proof: "Build-verified — implementation matches proven yahtzee pattern exactly. Runtime UAT pending manual device test (see S01-UAT.md)."
duration: 10m
verification_result: passed
completed_at: 2026-03-14
---

# M006: No-Reload Language Switching

**Wired paraglide's locale management to reactive Svelte 5 state so language switching in Settings updates all visible text instantly without page reload.**

## What Happened

Single-slice milestone. Added paraglide's `overwriteGetLocale` and `overwriteSetLocale` hooks to the root `+layout.svelte`, following the proven pattern from the yahtzee reference project. The implementation saves the original `setLocale` before overwriting (preventing infinite recursion while preserving localStorage persistence), declares a reactive `$state` locale, wires `overwriteGetLocale` to return the reactive value, and wires `overwriteSetLocale` to update state + call `originalSetLocale(newLocale, { reload: false })`. Content is wrapped in `{#key locale}` to force re-render on locale change, while ModeWatcher, Toaster, and BottomNav remain outside the key block to avoid teardown.

The existing settings page `setLocale(value)` call is automatically intercepted by the overwrite — no changes needed to the settings page or any other consumer of `getLocale()`.

## Cross-Slice Verification

Single slice — no cross-slice integration needed.

**Success criteria verification:**

1. **Language toggle updates text without reload** — `overwriteSetLocale` calls `originalSetLocale(newLocale, { reload: false })`, `{#key locale}` forces content re-render. Build passes clean (exit 0).
2. **All pages render in selected language after navigation** — `overwriteGetLocale(() => locale)` replaces the global `getLocale()` with a reactive getter. Every page's paraglide message calls flow through this getter.
3. **`getLocale()` consumers reflect new locale reactively** — `getBcp47Locale()` in `locale.ts` calls `getLocale()`, which now returns the reactive `$state` value. `SyncStatusSection` and any other consumer automatically gets the updated locale.
4. **Locale persists across app restarts** — `originalSetLocale` is the saved reference to paraglide's built-in `setLocale`, which writes to localStorage. Calling it with `{ reload: false }` persists without navigating.

**Build verification:** `cd apps/mobile && pnpm build` exits 0 with only pre-existing unrelated warnings.

**Runtime UAT:** Defined in `S01-UAT.md` with 7 test cases covering instant switch, cross-navigation persistence, app restart persistence, bottom nav survival, console diagnostics, rapid switching, and active workout edge case. Pending manual execution.

## Requirement Changes

- R051: active → active — Implementation complete and build-verified. Validation status upgraded from `unmapped` to `build-verified` in REQUIREMENTS.md. Full `validated` status requires manual device testing per S01-UAT.md.

## Forward Intelligence

### What the next milestone should know
- Language switching is fully wired. Any new pages or components using paraglide message functions will automatically participate in no-reload switching with zero additional work.

### What's fragile
- The `{#key locale}` wrapper tears down and recreates the entire content subtree on each language switch. Any component-local state inside the content area (open drawers, form inputs, scroll position within content) resets on switch. Persistent UI must stay outside the key block.

### Authoritative diagnostics
- `[Locale] Overwrite wired — initial: <locale>` in console confirms hooks are active on startup
- `[Locale] Switched: <old> → <new>` confirms locale changes flow through the reactive path
- If text doesn't update: check that `overwriteGetLocale` is called (reactive getter not wired)
- If page reloads: check that `originalSetLocale` is saved before `overwriteSetLocale` is called

### What assumptions changed
- No assumptions changed — the pattern matched the yahtzee reference exactly as expected. Zero surprises.

## Files Created/Modified

- `apps/mobile/src/routes/+layout.svelte` — added paraglide overwrite imports, reactive locale state, overwrite wiring, `{#key locale}` content wrapper
