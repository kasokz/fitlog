# M006: No-Reload Language Switching — Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

## Project Description

Wire paraglide's locale management to reactive Svelte 5 state so that switching language in settings updates all visible UI text instantly — no page reload, no navigation flash.

## Why This Milestone

Currently, `setLocale()` from paraglide's runtime defaults to `{ reload: true }`, causing a full page navigation when the user changes language. This feels jarring in a native mobile app context and can lose ephemeral UI state. The yahtzee reference project has already proven a pattern for no-reload switching.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Tap a different language in Settings and see all text update instantly in-place
- Switch back and forth between languages with zero delay or page flash

### Entry point / environment

- Entry point: Settings page language toggle
- Environment: Mobile app (Capacitor webview) and local dev browser
- Live dependencies involved: none

## Completion Class

- Contract complete means: language toggle calls `setLocale(locale, { reload: false })` and all visible text re-renders
- Integration complete means: paraglide's `getLocale()` returns the reactive value everywhere (settings, locale utils, sync status)
- Operational complete means: none — no server-side or lifecycle concerns

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Switching language in settings updates all visible text on the current page without a reload
- Navigating to other pages after switching shows the new language
- `getBcp47Locale()` and other `getLocale()` consumers reflect the new locale

## Risks and Unknowns

- None significant — the exact pattern is proven in the yahtzee reference project with the same paraglide version and strategy configuration

## Existing Codebase / Prior Art

- `references/yahtzee/apps/mobile/src/routes/+layout.svelte` — Shows `overwriteGetLocale`/`overwriteSetLocale` wiring with `{#key locale}` re-render
- `references/yahtzee/apps/mobile/src/lib/stores/settings.svelte.ts` — Shows `useLocale()` reactive store pattern with `originalSetLocale(newLocale, { reload: false })`
- `apps/mobile/src/routes/settings/+page.svelte` — Current settings page, calls `setLocale(value)` without `{ reload: false }`
- `apps/mobile/src/routes/+layout.svelte` — Current root layout, needs `overwriteGetLocale`/`overwriteSetLocale` wiring and `{#key locale}`
- `apps/mobile/src/lib/utils/locale.ts` — `getBcp47Locale()` calls `getLocale()` from paraglide
- `apps/mobile/src/lib/paraglide/runtime.js` — Generated runtime, already exports `overwriteGetLocale`, `overwriteSetLocale`, and supports `{ reload: false }` on `setLocale`

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R051 — No-Reload Language Switching: this milestone fully delivers it

## Scope

### In Scope

- Reactive locale state in root layout
- `overwriteGetLocale` / `overwriteSetLocale` wiring in `+layout.svelte`
- `{#key locale}` wrapper for content re-render
- Settings page `setLocale` call updated to `{ reload: false }`
- All `getLocale()` consumers work correctly with the overwritten getter

### Out of Scope / Non-Goals

- Adding new locales (stays de + en)
- Locale persistence changes (localStorage strategy is already correct)
- Server-side locale handling changes (hooks.server.ts stays as-is)

## Technical Constraints

- Must use paraglide's built-in `overwriteGetLocale` / `overwriteSetLocale` — no custom forks
- Must follow the yahtzee reference pattern for consistency across the monorepo
- Locale persistence already handled by paraglide's localStorage strategy — no need for Capacitor Preferences

## Integration Points

- Paraglide runtime (`$lib/paraglide/runtime.js`) — overwrite hooks
- Settings page — locale change handler
- Root layout — reactive state + content re-render key

## Open Questions

- None — pattern is fully proven in the reference project
