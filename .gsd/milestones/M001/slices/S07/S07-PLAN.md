# S07: i18n & Launch Readiness

**Goal:** All user-facing text is localized in German (base) and English. Paraglide is correctly configured for Capacitor SPA with localStorage persistence and device language detection. Native platform localization (iOS/Android) shows the correct app name per device language.
**Demo:** User switches language in Settings, sees all UI strings update. Device language auto-detection works on fresh install. iOS and Android show "FitLog" as localized app name.

## Must-Haves

- `project.inlang/settings.json` has `"baseLocale": "de"` and `"locales": ["de", "en"]`
- Paraglide Vite plugin uses `strategy: ["localStorage", "preferredLanguage", "baseLocale"]` for SPA-appropriate locale detection
- `de.json` and `en.json` have identical key sets — no missing or extra keys
- German text errors fixed: "Schliessen" → "Schließen", "Gesäss" → "Gesäß"
- Placeholder `app_title`/`app_description` updated to FitLog-specific text in both locales
- All hardcoded user-facing strings replaced with i18n keys (aria-label, Zod refinement messages)
- Language switcher in Settings page using `setLocale()` with localStorage persistence
- iOS `de.lproj/InfoPlist.strings` and `en.lproj/InfoPlist.strings` for localized app name
- Android `values-de/strings.xml` for localized app name
- `CFBundleDevelopmentRegion` updated to `de` in Info.plist

## Proof Level

- This slice proves: integration (i18n config produces correct runtime behavior, all keys resolve, locale switching works)
- Real runtime required: no (verification via key count diffs, paraglide compilation, and static analysis)
- Human/UAT required: yes (visual verification of locale switching and native app name on device — deferred to UAT)

## Verification

- `cd apps/mobile && pnpm paraglide:compile` succeeds without errors
- `jq 'keys | length' messages/de.json` equals `jq 'keys | length' messages/en.json` (identical key counts)
- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` produces no output
- `grep -c "Schliessen\|Gesäss" messages/de.json` returns 0
- `grep -c '"Meine App"\|"My App"' messages/de.json messages/en.json` returns 0
- `grep -rn 'aria-label="Drag' src/` returns lines with `m.` calls, not hardcoded strings
- `grep '"baseLocale": "de"' project.inlang/settings.json` matches
- `grep 'strategy:' vite.config.ts` shows localStorage + preferredLanguage + baseLocale
- `test -f ios/App/App/de.lproj/InfoPlist.strings && test -f ios/App/App/en.lproj/InfoPlist.strings` passes
- `test -f android/app/src/main/res/values-de/strings.xml` passes
- `pnpm build` succeeds (full SvelteKit build with Paraglide compilation)

## Observability / Diagnostics

- Runtime signals: Paraglide logs locale resolution to console in dev mode; `getLocale()` returns current locale
- Inspection surfaces: `localStorage` key (set by Paraglide localStorage strategy) shows persisted locale; `de.json`/`en.json` are the translation source of truth
- Failure visibility: Missing i18n keys cause runtime errors in the Paraglide-generated message functions; Vite plugin reports compilation errors
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: All existing route pages and components that import `m` from `$lib/paraglide/messages.js`; `apps/mobile/project.inlang/settings.json`; `apps/mobile/vite.config.ts`; `apps/mobile/src/routes/settings/+page.svelte`; iOS `Info.plist`; Android `values/strings.xml`
- New wiring introduced in this slice: Paraglide strategy config in Vite plugin; language switcher component in Settings; native platform localization files (lproj, values-de)
- What remains before the milestone is truly usable end-to-end: nothing — this is the terminal slice of M001

## Tasks

- [x] **T01: Fix Paraglide config, sync keys, and fix German text errors** `est:45m`
  - Why: The baseLocale is wrong (`en` instead of `de`), the strategy is wrong for SPA (`cookie` instead of `localStorage`), 5 keys are missing from `en.json`, German text has ß errors, and app title/description are placeholders. This is the foundation that everything else depends on.
  - Files: `apps/mobile/project.inlang/settings.json`, `apps/mobile/vite.config.ts`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: (1) Change `baseLocale` to `"de"` and `locales` to `["de", "en"]` in settings.json. (2) Add `strategy: ["localStorage", "preferredLanguage", "baseLocale"]` to the `paraglideVitePlugin()` call in vite.config.ts. (3) Add 5 missing keys to `en.json` (`settings_title`, `settings_theme_label`, `settings_theme_light`, `settings_theme_dark`, `settings_theme_system`). (4) Fix "Schliessen" → "Schließen" and "Gesäss" → "Gesäß" in `de.json`. (5) Update `app_title` and `app_description` in both locale files to FitLog-specific text. (6) Run `pnpm paraglide:compile` and verify.
  - Verify: `pnpm paraglide:compile` succeeds; `diff` of sorted keys shows no differences; `grep` for old German errors returns 0; `grep` for placeholder app titles returns 0
  - Done when: baseLocale is `de`, strategy is SPA-appropriate, all keys synced, German text correct, app titles updated, Paraglide compiles clean

- [x] **T02: Fix hardcoded strings and add language switcher to Settings** `est:45m`
  - Why: Three hardcoded strings remain (aria-label, 2 Zod refinement messages), and users need a way to switch language. This delivers the user-facing locale control and eliminates the last un-i18n'd strings.
  - Files: `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte`, `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte`, `apps/mobile/src/lib/components/programs/MesocycleForm.svelte`, `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: (1) Add i18n keys for the aria-label ("Drag to reorder") and both Zod refinement messages in de.json and en.json. (2) Replace hardcoded strings with `m.*()` calls in the three component files — for Zod refinements, use `m.*()` inside the `message:` field since schemas are defined in `<script>` blocks. (3) Build a language switcher section in the Settings page using `getLocale()` and `setLocale()` from the Paraglide runtime — use a toggle group matching the existing theme toggle pattern. (4) Add i18n keys for the language switcher labels.
  - Verify: `grep -rn 'aria-label="Drag' src/` shows i18n calls; `grep -rn "'Max reps\|'Deload week" src/` returns 0; Settings page has language toggle section; `pnpm build` succeeds
  - Done when: Zero hardcoded user-facing strings remain; language switcher is functional in Settings page

- [x] **T03: Native platform localization (iOS & Android)** `est:30m`
  - Why: Without native localization files, the app name on the device home screen and app drawer won't translate — it will always show the English name regardless of device language.
  - Files: `apps/mobile/ios/App/App/Info.plist`, `apps/mobile/ios/App/App/de.lproj/InfoPlist.strings`, `apps/mobile/ios/App/App/en.lproj/InfoPlist.strings`, `apps/mobile/android/app/src/main/res/values-de/strings.xml`
  - Do: (1) Update `CFBundleDevelopmentRegion` from `en` to `de` in Info.plist. (2) Add `CFBundleLocalizations` array with `de` and `en` to Info.plist. (3) Create `de.lproj/InfoPlist.strings` with `CFBundleDisplayName = "FitLog";` and `CFBundleName = "FitLog";`. (4) Create `en.lproj/InfoPlist.strings` with the same. (5) Create `values-de/strings.xml` for Android with German app name. (6) Verify files exist and are well-formed.
  - Verify: `test -f ios/App/App/de.lproj/InfoPlist.strings && test -f ios/App/App/en.lproj/InfoPlist.strings` passes; `test -f android/app/src/main/res/values-de/strings.xml` passes; `grep "CFBundleDevelopmentRegion" ios/App/App/Info.plist` shows `de`; `pnpm build` still succeeds
  - Done when: Both platforms have localization files; Info.plist declares supported languages; build passes

- [x] **T04: Final i18n audit and build verification** `est:30m`
  - Why: Need a comprehensive audit to catch any remaining un-i18n'd strings, verify the full build pipeline works with the new config, and confirm all verification criteria pass.
  - Files: `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json` (if fixes needed), any component files with remaining hardcoded strings
  - Do: (1) Run `grep -rn` across all `.svelte` files for hardcoded user-facing strings (quotes in template blocks, excluding imports/types/props). (2) Verify all message keys have non-empty values in both locales. (3) Run full `pnpm build` to confirm SvelteKit + Paraglide compiles. (4) Run all slice verification commands and fix any failures. (5) Cross-check en.json translations for quality — ensure they're semantically correct, not just mechanical.
  - Verify: All slice-level verification commands pass; `pnpm build` succeeds; no hardcoded user-facing strings in .svelte files
  - Done when: All slice verification criteria pass, build is green, i18n coverage is complete

## Files Likely Touched

- `apps/mobile/project.inlang/settings.json`
- `apps/mobile/vite.config.ts`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte`
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentForm.svelte`
- `apps/mobile/src/lib/components/programs/MesocycleForm.svelte`
- `apps/mobile/ios/App/App/Info.plist`
- `apps/mobile/ios/App/App/de.lproj/InfoPlist.strings`
- `apps/mobile/ios/App/App/en.lproj/InfoPlist.strings`
- `apps/mobile/android/app/src/main/res/values-de/strings.xml`
