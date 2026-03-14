# S01: No-Reload Language Switching — Research

**Date:** 2026-03-14

## Summary

The change is mechanical and well-scoped. The settings page currently calls `setLocale(value)` from paraglide runtime, which defaults to `{ reload: true }` and triggers a full page navigation. The fix uses paraglide's built-in `overwriteGetLocale` / `overwriteSetLocale` hooks to route locale reads/writes through reactive Svelte 5 state, plus a `{#key locale}` wrapper in the root layout to force content re-render on change.

The yahtzee reference project implements this exact pattern with the same paraglide version and strategy configuration (`["localStorage", "preferredLanguage", "baseLocale"]`). The fitlog implementation is simpler because it has no settings store — the reactive state and overwrite wiring can live directly in `+layout.svelte`.

Three files need changes, no new files needed. No new i18n keys required. All existing `getLocale()` consumers (`locale.ts`, `SyncStatusSection.svelte`) will automatically return the reactive value once `overwriteGetLocale` is called — no changes needed in those files.

## Requirement Coverage

| Requirement | Relevance | Notes |
|-------------|-----------|-------|
| R051 — No-Reload Language Switching | Primary | This slice fully delivers it |

## Recommendation

Follow the yahtzee reference pattern directly in `+layout.svelte`:

1. Save a reference to the original `setLocale` before overwriting (needed to persist to localStorage without triggering reload)
2. Add a `locale` `$state` variable initialized from `getLocale()`
3. Call `overwriteGetLocale(() => locale)` to make all `getLocale()` consumers return the reactive value
4. Call `overwriteSetLocale((newLocale) => { locale = newLocale; originalSetLocale(newLocale, { reload: false }); })` to intercept locale changes
5. Wrap the `<main>` content in `{#key locale}` to force full re-render when locale changes
6. Update the settings page `handleLocaleChange` to call `setLocale(value)` — the overwritten version handles `{ reload: false }` automatically

Key difference from yahtzee: no settings store needed. Yahtzee has a `settings.svelte.ts` store that manages locale alongside many other settings (animations, haptics, music, etc.). FitLog doesn't have this pattern — locale is the only setting managed via paraglide, and mode is managed via mode-watcher directly. Wiring the overwrite in the layout is sufficient.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Locale state reactivity | `overwriteGetLocale` / `overwriteSetLocale` from paraglide runtime | Built-in hooks specifically designed for this — already exported, zero dependencies |
| Content re-render on locale change | Svelte `{#key locale}` block | Native Svelte mechanism, forces child teardown/recreation when key changes |
| Locale persistence | Paraglide's built-in `localStorage` strategy | Already configured in strategy array, `setLocale` writes to localStorage automatically |

## Existing Code and Patterns

- `references/yahtzee/apps/mobile/src/routes/+layout.svelte` — Exact pattern to follow: imports `overwriteGetLocale`/`overwriteSetLocale`, calls them in `onMount`, wraps content in `{#key locale}`. Uses `useLocale()` from settings store for the reactive state.
- `references/yahtzee/apps/mobile/src/lib/stores/settings.svelte.ts` — Shows `originalSetLocale` save-before-overwrite pattern. Lines 10, 56: saves reference to original `setLocale` at module level, calls `originalSetLocale(newLocale, { reload: false })` inside the custom setter.
- `apps/mobile/src/routes/+layout.svelte` — Current root layout. Needs `overwriteGetLocale`/`overwriteSetLocale` wiring in the existing `$effect` init block. Content needs `{#key locale}` wrapper.
- `apps/mobile/src/routes/settings/+page.svelte` — Current settings page. Line 5: imports `getLocale, setLocale` from paraglide. Line 268: calls `setLocale(value)` without `{ reload: false }`. After the overwrite, this call automatically goes through the non-reload path.
- `apps/mobile/src/lib/utils/locale.ts` — `getBcp47Locale()` calls `getLocale()`. No changes needed — overwrite makes `getLocale()` return reactive value.
- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — Line 80: calls `getLocale()` for `formatRelativeTime`. No changes needed — same overwrite benefit.
- `apps/mobile/src/lib/paraglide/runtime.js` — Generated runtime. Lines 323, 524: exports `overwriteGetLocale` and `overwriteSetLocale`. Line 411: `setLocale` defaults to `{ reload: true }`. Line 487: localStorage strategy writes `localStorage.setItem(localStorageKey, newLocale)`.

## Constraints

- Must save a reference to the original `setLocale` **before** calling `overwriteSetLocale`, otherwise localStorage persistence is lost (the overwritten function replaces the original entirely)
- The `overwriteGetLocale` / `overwriteSetLocale` calls must happen during initialization, before any user interaction — the existing `$effect` + `untrack` init block in the layout is the right place
- The `{#key locale}` block destroys and recreates all children on locale change — this is intentional and correct for i18n (all `m.*()` calls re-evaluate), but means any ephemeral component state inside the key block is lost on switch. Acceptable trade-off since language switching is infrequent.
- The paraglide runtime file (`runtime.js`) is auto-generated — must not be edited. Only use its exported APIs.

## Common Pitfalls

- **Forgetting to save `originalSetLocale` before overwrite** — If you overwrite `setLocale` and then call `setLocale` inside the overwrite handler, you get infinite recursion. Save the reference at module level or before the overwrite call.
- **Not wrapping content in `{#key locale}`** — Without the key block, changing the reactive locale variable updates `getLocale()` return value but doesn't trigger re-render of components that called `m.*()` functions at mount time. The `{#key}` forces teardown/recreation.
- **Placing `{#key locale}` around the entire layout including ModeWatcher/Toaster** — The key should only wrap the content that needs re-rendering for locale changes. ModeWatcher and Toaster should stay outside the key block to avoid teardown of active toasts and mode state.
- **Calling `overwriteGetLocale` before the reactive state is initialized** — The getter function must capture the reactive variable by closure. Initialize the `$state` variable before wiring the overwrite.

## Open Risks

None. The pattern is proven in the reference project with identical tech stack and paraglide configuration. The implementation touches three files with minimal, well-understood changes.

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/src/routes/+layout.svelte` | Import overwrites, add reactive `locale` state, wire overwrites in init, add `{#key locale}` wrapper |
| `apps/mobile/src/routes/settings/+page.svelte` | No code change needed — `setLocale(value)` call on line 268 is automatically intercepted by the overwritten `setLocale`. The ToggleGroup `value={getLocale()}` returns the reactive value after overwrite, and re-renders via `{#key locale}`. |

Total: **1 file with changes** (root layout). Settings page works as-is because the overwrite intercepts the existing `setLocale(value)` call.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Svelte 5 | — | No specialized skill needed; standard runes |
| Paraglide.js | — | No skill available; pattern fully documented in reference project |

## Sources

- Yahtzee reference layout (source: `references/yahtzee/apps/mobile/src/routes/+layout.svelte`)
- Yahtzee settings store (source: `references/yahtzee/apps/mobile/src/lib/stores/settings.svelte.ts`)
- Paraglide runtime overwrite API (source: `apps/mobile/src/lib/paraglide/runtime.js` lines 323, 524)
