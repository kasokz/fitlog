# M006: No-Reload Language Switching

**Vision:** Wire paraglide's locale management to reactive Svelte 5 state so language switching in settings updates all visible text instantly without page reload.

## Success Criteria

- Tapping a different language in Settings updates all visible text in-place without page reload or navigation flash
- Navigating to other pages after switching shows the correct language
- `getLocale()` consumers (`getBcp47Locale()`, `SyncStatusSection`) reflect the new locale reactively

## Key Risks / Unknowns

- None — pattern is proven in the yahtzee reference project with the same stack and paraglide configuration

## Proof Strategy

- No risks to retire — straightforward mechanical wiring

## Verification Classes

- Contract verification: manual browser/device test — switch language, confirm text updates without reload
- Integration verification: navigate between pages after switch, confirm locale persists
- Operational verification: none
- UAT / human verification: tap language toggle in Settings, confirm instant update

## Milestone Definition of Done

This milestone is complete only when all are true:

- Language toggle in Settings switches text instantly without reload
- All pages render in the selected language after navigation
- `getLocale()` returns the reactive value for all consumers
- Locale persists across app restarts (already handled by paraglide localStorage, just confirm not broken)

## Requirement Coverage

- Covers: R051
- Partially covers: none
- Leaves for later: none
- Orphan risks: none

## Slices

- [x] **S01: No-Reload Language Switching** `risk:low` `depends:[]`
  > After this: User taps language toggle in Settings and all visible text updates instantly without page reload.

## Boundary Map

### S01 (single slice — no downstream consumers)

Produces:
- Reactive locale state via `overwriteGetLocale` in root layout
- `setLocale(locale, { reload: false })` call in settings handler
- `{#key locale}` wrapper in root layout for content re-render

Consumes:
- `overwriteGetLocale`, `overwriteSetLocale` from `$lib/paraglide/runtime.js` (already exported)
- Existing `getLocale()` / `setLocale()` usage in settings page
