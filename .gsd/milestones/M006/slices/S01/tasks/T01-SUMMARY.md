---
id: T01
parent: S01
milestone: M006
provides:
  - reactive locale state via paraglide overwrite hooks
  - no-reload language switching path
key_files:
  - apps/mobile/src/routes/+layout.svelte
key_decisions:
  - Wired overwrites at component top level (not inside onMount/effect) so they're active before any user interaction
  - Kept BottomNav outside {#key locale} alongside ModeWatcher/Toaster to avoid teardown on language switch
patterns_established:
  - Save original setLocale reference before calling overwriteSetLocale to prevent infinite recursion and preserve localStorage persistence
observability_surfaces:
  - "[Locale] Overwrite wired — initial: <locale>" console log on mount
  - "[Locale] Switched: <old> → <new>" console log on each locale change
duration: 10m
verification_result: passed
completed_at: 2026-03-14
blocker_discovered: false
---

# T01: Wire paraglide locale overwrites in root layout for instant language switching

**Wired `overwriteGetLocale`/`overwriteSetLocale` into root layout with reactive `$state` locale and `{#key locale}` content wrapper for no-reload language switching.**

## What Happened

Added paraglide overwrite hooks to `+layout.svelte` following the yahtzee reference pattern. The implementation:

1. Saves original `setLocale` reference before overwriting
2. Declares `let locale = $state(getLocale())` for reactive tracking
3. Calls `overwriteGetLocale(() => locale)` so all `getLocale()` consumers return the reactive value
4. Calls `overwriteSetLocale()` with a handler that updates reactive state and calls original `setLocale` with `{ reload: false }`
5. Wraps the content `<div>` in `{#key locale}` to force re-render on locale change
6. Keeps ModeWatcher, Toaster, and BottomNav outside the key block

The existing settings page `setLocale(value)` call is automatically intercepted — no changes needed there.

## Verification

- `cd apps/mobile && pnpm build` — exits 0, clean build with only pre-existing unrelated warnings
- Inspected `+layout.svelte`: overwrite wiring matches yahtzee reference pattern
- Confirmed ModeWatcher (line 95) and Toaster (line 96) are outside `{#key locale}` (line 99)
- Confirmed BottomNav (line 107) is outside `{#key locale}`
- Confirmed settings page `setLocale(value)` call unchanged and will be intercepted by overwrite

### Slice-level verification status

- ✅ `cd apps/mobile && pnpm build` — no compilation errors
- ⏳ Manual: open app → Settings → tap different language → all visible text updates without page reload (requires running app)
- ⏳ Manual: navigate to other pages after switch → correct language persists (requires running app)
- ⏳ Manual: close and reopen app → selected language persists (requires running app)

## Diagnostics

- Check `[Locale] Overwrite wired` in console to confirm hooks are active on startup
- Check `[Locale] Switched:` messages to confirm locale changes are flowing through the reactive path
- If text doesn't update after language switch, verify `overwriteGetLocale` is being called (reactive getter not wired)
- If page reloads on language switch, verify `originalSetLocale` is called with `{ reload: false }` (original not saved before overwrite)

## Deviations

None.

## Known Issues

- Svelte `state_referenced_locally` warning on the startup log line (`console.log(\`[Locale] Overwrite wired — initial: ${locale}\`)`). Harmless — it's a one-time log that intentionally captures the initial value.

## Files Created/Modified

- `apps/mobile/src/routes/+layout.svelte` — added paraglide overwrite imports, reactive locale state, overwrite wiring, and `{#key locale}` content wrapper
