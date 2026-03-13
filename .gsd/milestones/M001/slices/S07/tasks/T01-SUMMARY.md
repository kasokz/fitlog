---
id: T01
parent: S07
milestone: M001
provides:
  - Correct Paraglide baseLocale and SPA strategy configuration
  - Synchronized de.json and en.json with 236 keys each
  - Fixed German ß errors and placeholder app titles
key_files:
  - apps/mobile/project.inlang/settings.json
  - apps/mobile/vite.config.ts
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Paraglide strategy set to localStorage → preferredLanguage → baseLocale for Capacitor SPA (no cookie strategy)
patterns_established:
  - de.json is the source of truth; en.json must always have identical keys
observability_surfaces:
  - Paraglide compile errors surface missing keys or malformed JSON
  - src/lib/paraglide/runtime.js contains baseLocale and strategy values for inspection
duration: ~10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Fix Paraglide config, sync keys, and fix German text errors

**Fixed Paraglide baseLocale to `de`, added SPA-appropriate locale strategy, synced all 236 i18n keys, corrected German ß errors, and replaced placeholder app titles with FitLog branding.**

## What Happened

1. Changed `baseLocale` from `"en"` to `"de"` and reordered `locales` to `["de", "en"]` in `project.inlang/settings.json`.
2. Added `strategy: ['localStorage', 'preferredLanguage', 'baseLocale']` to `paraglideVitePlugin()` in `vite.config.ts` — replaces the default cookie-based strategy which doesn't work in Capacitor SPA.
3. Added 5 missing keys to `en.json`: `settings_title`, `settings_theme_label`, `settings_theme_light`, `settings_theme_dark`, `settings_theme_system`.
4. Fixed two German ß errors in `de.json`: "Schliessen" → "Schließen", "Gesäss" → "Gesäß".
5. Updated `app_title` to "FitLog" in both locales; `app_description` to "Dein Trainingslogbuch" (de) and "Your training logbook" (en).
6. Ran `pnpm paraglide:compile` — succeeded, regenerating runtime with corrected config.

## Verification

All task-level checks passed:

- `pnpm paraglide:compile` exits 0 ✅
- `diff` of sorted keys between de.json and en.json: no output (identical key sets) ✅
- Key counts: de=236, en=236 ✅
- `grep -c "Schliessen\|Gesäss" messages/de.json` returns 0 ✅
- `grep -c '"Meine App"\|"My App"' messages/de.json messages/en.json` returns 0 for both ✅
- `jq '.app_title' messages/de.json` returns "FitLog" ✅
- `grep '"baseLocale": "de"' project.inlang/settings.json` matches ✅
- `grep 'localStorage' vite.config.ts` matches ✅

Slice-level verification (partial — intermediate task):

- ✅ `pnpm paraglide:compile` succeeds
- ✅ Key counts match (236 = 236)
- ✅ Key diff is empty
- ✅ No ß errors remain
- ✅ No placeholder app titles remain
- ✅ baseLocale is "de"
- ✅ strategy shows localStorage + preferredLanguage + baseLocale
- ⏳ aria-label hardcoded strings → T02
- ⏳ iOS lproj files → T03
- ⏳ Android strings.xml → T03
- ⏳ `pnpm build` → T04

## Diagnostics

- Inspect `apps/mobile/src/lib/paraglide/runtime.js` for `baseLocale` and `strategy` values
- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` to verify key sync
- Paraglide compile errors will surface any key or JSON issues at build time

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/project.inlang/settings.json` — changed baseLocale to "de", locales to ["de", "en"]
- `apps/mobile/vite.config.ts` — added strategy option to paraglideVitePlugin
- `apps/mobile/messages/de.json` — fixed ß errors, updated app_title/app_description
- `apps/mobile/messages/en.json` — added 5 missing settings keys, updated app_title/app_description
