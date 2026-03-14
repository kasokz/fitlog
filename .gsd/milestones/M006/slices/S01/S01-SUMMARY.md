---
id: S01
parent: M006
milestone: M006
provides:
  - reactive locale state via paraglide overwrite hooks
  - no-reload language switching path via {#key locale} re-render
requires: []
affects: []
key_files:
  - apps/mobile/src/routes/+layout.svelte
key_decisions:
  - "D137: overwriteGetLocale/overwriteSetLocale + reactive state + {#key locale} pattern from yahtzee reference"
patterns_established:
  - Save original setLocale reference before calling overwriteSetLocale to prevent infinite recursion and preserve localStorage persistence
  - Wire overwrites at component top level (not inside onMount/effect) so they're active before any user interaction
  - Keep persistent UI (ModeWatcher, Toaster, BottomNav) outside {#key locale} to avoid teardown on language switch
observability_surfaces:
  - "[Locale] Overwrite wired — initial: <locale>" console log on mount
  - "[Locale] Switched: <old> → <new>" console log on each locale change
drill_down_paths:
  - .gsd/milestones/M006/slices/S01/tasks/T01-SUMMARY.md
duration: 10m
verification_result: passed
completed_at: 2026-03-14
---

# S01: No-Reload Language Switching

**Wired paraglide locale overwrites into root layout so language switching in Settings updates all visible text instantly without page reload.**

## What Happened

Added paraglide's `overwriteGetLocale` and `overwriteSetLocale` hooks to `+layout.svelte`, following the proven pattern from the yahtzee reference project. The implementation saves the original `setLocale` before overwriting, declares a reactive `$state` locale, wires `overwriteGetLocale` to return the reactive value, and wires `overwriteSetLocale` to update state + call `originalSetLocale(newLocale, { reload: false })`. Content is wrapped in `{#key locale}` to force re-render on locale change, while ModeWatcher, Toaster, and BottomNav remain outside the key block to avoid teardown.

The existing settings page `setLocale(value)` call is automatically intercepted — no changes needed there.

## Verification

- `cd apps/mobile && pnpm build` — exits 0, clean build (only pre-existing unrelated warnings)
- Inspected `+layout.svelte`: overwrite wiring matches yahtzee reference pattern exactly
- Confirmed ModeWatcher, Toaster, and BottomNav are outside `{#key locale}`
- Confirmed settings page `setLocale(value)` call unchanged and intercepted by overwrite
- Observability: `[Locale] Overwrite wired` and `[Locale] Switched:` console logs confirmed in implementation

## Requirements Advanced

- R051 — No-Reload Language Switching: fully implemented via overwrite hooks + reactive state + `{#key locale}`

## Requirements Validated

- R051 — Build verification passes. Full runtime validation requires manual device testing (see UAT).

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- Svelte `state_referenced_locally` warning on the startup console.log line. Harmless — it's a one-time log that intentionally captures the initial value, not a reactive consumer.

## Follow-ups

- none

## Files Created/Modified

- `apps/mobile/src/routes/+layout.svelte` — added paraglide overwrite imports, reactive locale state, overwrite wiring, and `{#key locale}` content wrapper

## Forward Intelligence

### What the next slice should know
- No downstream slices in M006 — this is the only slice.

### What's fragile
- The `{#key locale}` wrapper tears down and recreates the entire content subtree on each language switch. This is correct for forcing re-render of all translated strings, but means any component-local state inside the key block resets on switch. Persistent UI (BottomNav, ModeWatcher, Toaster) must stay outside.

### Authoritative diagnostics
- `[Locale] Overwrite wired` in console confirms hooks are active on startup
- `[Locale] Switched:` messages confirm locale changes flow through the reactive path

### What assumptions changed
- No assumptions changed — pattern matched the yahtzee reference exactly as expected
