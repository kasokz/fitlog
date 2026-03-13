---
estimated_steps: 6
estimated_files: 4
---

# T01: Fix Paraglide config, sync keys, and fix German text errors

**Slice:** S07 — i18n & Launch Readiness
**Milestone:** M001

## Description

The Paraglide configuration has three issues that must be fixed before any other i18n work: (1) `baseLocale` is `"en"` but must be `"de"` per AGENTS.md, (2) the locale detection strategy uses `cookie` which doesn't work for a Capacitor SPA — must use `localStorage` + `preferredLanguage`, (3) the `locales` array order should list `de` first. Additionally, `en.json` is missing 5 keys that exist in `de.json`, two German words have ß errors, and `app_title`/`app_description` are generic placeholders in both locales.

## Steps

1. Edit `apps/mobile/project.inlang/settings.json`: change `"baseLocale": "en"` to `"baseLocale": "de"`, change `"locales": ["en", "de"]` to `"locales": ["de", "en"]`.
2. Edit `apps/mobile/vite.config.ts`: add `strategy: ["localStorage", "preferredLanguage", "baseLocale"]` to the `paraglideVitePlugin()` options object.
3. Edit `apps/mobile/messages/en.json`: add the 5 missing keys with proper English translations — `settings_title: "Settings"`, `settings_theme_label: "Theme"`, `settings_theme_light: "Light"`, `settings_theme_dark: "Dark"`, `settings_theme_system: "System"`.
4. Edit `apps/mobile/messages/de.json`: fix `"common_close": "Schliessen"` → `"Schließen"` and `"muscle_group_glutes": "Gesäss"` → `"Gesäß"`.
5. Edit both locale files: update `app_title` to `"FitLog"` in both, update `app_description` to `"Dein Trainingslogbuch"` in de.json and `"Your training logbook"` in en.json.
6. Run `pnpm paraglide:compile` from `apps/mobile/` to regenerate the runtime with the new config. Verify key count parity with `jq` and absence of old error strings with `grep`.

## Must-Haves

- [ ] `baseLocale` is `"de"` in `project.inlang/settings.json`
- [ ] `locales` array is `["de", "en"]`
- [ ] Vite plugin strategy is `["localStorage", "preferredLanguage", "baseLocale"]`
- [ ] `en.json` has all 5 previously missing settings keys
- [ ] `de.json` key count equals `en.json` key count
- [ ] "Schliessen" replaced with "Schließen" in de.json
- [ ] "Gesäss" replaced with "Gesäß" in de.json
- [ ] `app_title` is "FitLog" in both locales
- [ ] `app_description` is FitLog-specific in both locales
- [ ] `pnpm paraglide:compile` succeeds

## Verification

- `pnpm paraglide:compile` exits 0
- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` produces no output
- `grep -c "Schliessen\|Gesäss" messages/de.json` returns `0`
- `grep -c '"Meine App"\|"My App"' messages/de.json messages/en.json` returns `0` for both files
- `jq '.app_title' messages/de.json` returns `"FitLog"`
- `grep '"baseLocale": "de"' project.inlang/settings.json` matches
- `grep 'localStorage' vite.config.ts` matches

## Observability Impact

- Signals added/changed: Paraglide runtime will regenerate with `baseLocale = "de"` and `strategy = ["localStorage", "preferredLanguage", "baseLocale"]` — this changes default locale resolution for every page load
- How a future agent inspects this: Check `src/lib/paraglide/runtime.js` for `baseLocale` and `strategy` values; diff `de.json` vs `en.json` keys
- Failure state exposed: Paraglide compile errors surface missing keys or malformed JSON; runtime console errors surface unresolved message functions

## Inputs

- `apps/mobile/project.inlang/settings.json` — current wrong baseLocale (`en`) and strategy
- `apps/mobile/vite.config.ts` — current Vite plugin config without strategy override
- `apps/mobile/messages/de.json` — 236 keys, source of truth, has ß errors and placeholder titles
- `apps/mobile/messages/en.json` — 231 keys, missing 5 settings keys and placeholder titles
- S07 Research — identified exact missing keys, errors, and correct strategy

## Expected Output

- `apps/mobile/project.inlang/settings.json` — corrected baseLocale and locales order
- `apps/mobile/vite.config.ts` — strategy option added to paraglideVitePlugin
- `apps/mobile/messages/de.json` — ß errors fixed, app title/description updated
- `apps/mobile/messages/en.json` — 5 keys added, app title/description updated, key count matches de.json
- `apps/mobile/src/lib/paraglide/runtime.js` — regenerated with correct baseLocale and strategy
