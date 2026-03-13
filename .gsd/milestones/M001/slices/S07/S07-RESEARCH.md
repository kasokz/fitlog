# S07: i18n & Launch Readiness — Research

**Date:** 2026-03-12

## Summary

S07's scope is delivering complete de/en localization for all user-facing text. The good news: **~95% of the i18n infrastructure is already in place**. Paraglide is configured, the Vite plugin compiles messages, 31 components and route files already import and use `m.*()` message functions, and both `de.json` (236 keys) and `en.json` (231 keys) exist with substantial coverage.

The remaining work is surgical:
1. **Fix the baseLocale mismatch** — `project.inlang/settings.json` declares `baseLocale: "en"` but AGENTS.md mandates `de` as the base locale. This affects URL patterns (currently en=no prefix, de=/de/) and fallback behavior. Since SSR is disabled (`ssr = false`), URL-based locale detection doesn't apply in the Capacitor SPA context, but the baseLocale determines the fallback language and the source-of-truth semantics.
2. **Sync the 5 missing keys** in `en.json` (all settings-related: `settings_title`, `settings_theme_label`, `settings_theme_light`, `settings_theme_dark`, `settings_theme_system`).
3. **Fix German ß errors** — "Schliessen" → "Schließen", "Gesäss" → "Gesäß". AGENTS.md explicitly requires proper Umlaute.
4. **Update placeholder app titles** — `app_title`/`app_description` are currently "Meine App"/"My App" instead of "FitLog".
5. **Configure Paraglide locale strategy** for Capacitor SPA — the current strategy `["cookie", "globalVariable", "baseLocale"]` is wrong for a client-only app. Should use `["localStorage", "preferredLanguage", "baseLocale"]` so the device language is detected and user overrides persist.
6. **Add a language switcher** to the Settings page.
7. **Add native platform localization** for iOS (`de.lproj`) and Android (`values-de/strings.xml`) so the app name appears correctly in the device language.
8. **Fix 3 hardcoded strings**: one `aria-label="Drag to reorder"` and two Zod refinement messages.

## Recommendation

Structure this as 3-4 focused tasks:
- **T01: Fix Paraglide config** — Fix baseLocale to `de`, update strategy for SPA, sync all missing keys, fix German text errors, update app titles.
- **T02: Language switcher** — Add locale selection to Settings page using `setLocale()`, persist choice via localStorage strategy.
- **T03: Native platform localization** — Add `de.lproj` for iOS and `values-de/strings.xml` for Android with localized app name and any native strings.
- **T04: Final i18n audit & remaining hardcoded strings** — Fix aria-label and Zod messages, run full audit, verify complete coverage.

The baseLocale change from `en` → `de` is the riskiest part. The URL patterns will flip (de=no prefix, en=/en/), but since `ssr = false` and this is a Capacitor SPA, URL-based routing doesn't matter — the app runs from `index.html`. The key impact is which language is the fallback when no locale is detected.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Locale detection on mobile | Paraglide `preferredLanguage` strategy | Reads `navigator.languages` which Capacitor WebView inherits from device settings |
| Locale persistence | Paraglide `localStorage` strategy | Built-in, persists across app restarts |
| Message compilation | `paraglideVitePlugin` | Already configured in vite.config.ts |
| Enum-to-i18n mapping | `src/lib/components/exercises/i18n-maps.ts` | Established pattern for muscle groups and equipment labels |

## Existing Code and Patterns

- `apps/mobile/project.inlang/settings.json` — Paraglide project settings. **Needs baseLocale fix: `en` → `de`**. Currently declares `locales: ["en", "de"]`.
- `apps/mobile/vite.config.ts` — `paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })`. No `strategy` override — inherits defaults from settings. **Need to add strategy option**.
- `apps/mobile/src/lib/paraglide/runtime.js` — Generated runtime. Shows `baseLocale = "en"`, strategy `["cookie", "globalVariable", "baseLocale"]`. Will regenerate when config changes.
- `apps/mobile/src/hooks.server.ts` — Server middleware for SSR locale detection. **Not relevant** since `ssr = false`, but not harmful.
- `apps/mobile/src/routes/+layout.ts` — `export const ssr = false;` — confirms SPA-only mode.
- `apps/mobile/src/app.html` — Uses `%paraglide.lang%` for html lang attribute, replaced by middleware.
- `apps/mobile/messages/de.json` — 236 keys, German translations. **Source of truth per AGENTS.md**.
- `apps/mobile/messages/en.json` — 231 keys, English translations. **Missing 5 settings keys**.
- `apps/mobile/src/lib/components/exercises/i18n-maps.ts` — Pattern for mapping enum values to `m.*` message functions. Reuse this pattern.
- `apps/mobile/src/lib/components/BottomNav.svelte` — Uses `label: () => m.nav_*()` pattern for lazy i18n evaluation. Good pattern.
- `apps/mobile/src/routes/settings/+page.svelte` — Settings page with theme toggle. **Needs language switcher added**.
- `apps/mobile/ios/App/App/Info.plist` — `CFBundleDevelopmentRegion` is `en`. Needs `de.lproj` for German localization.
- `apps/mobile/android/app/src/main/res/values/strings.xml` — App name "FitLog". Needs `values-de/strings.xml`.

### Components Already Using i18n (31 files)

All route pages (9) and most components (22) already import `m` from `$lib/paraglide/messages.js`. Non-i18n components are either pure display (`ExerciseCard`, `RirSelector`, `DurationTimer`) that delegate text to parent or use i18n-maps, or structural (`+layout.svelte`, `+page.svelte` redirect).

### Hardcoded Strings Found

| File | String | Action |
|------|--------|--------|
| `ExerciseAssignmentList.svelte:80` | `aria-label="Drag to reorder"` | Add i18n key |
| `ExerciseAssignmentForm.svelte:38` | `message: 'Max reps must be >= min reps'` | Zod refinement — keep English (client-side validation, not user-visible toast) |
| `MesocycleForm.svelte:34` | `message: 'Deload week must be within weeks count'` | Same — Zod refinement message |

**Note on Zod refinement messages**: These are validation error messages shown in form field errors via formsnap. They ARE user-visible and SHOULD be i18n'd. However, Zod refinement messages are static strings at schema definition time, not runtime-evaluated. The cleanest approach is to keep them in English in the schema and override the display in the form field error component, OR use a message key that resolves at validation time.

### German Text Errors (ß vs ss)

| Key | Current | Correct |
|-----|---------|---------|
| `common_close` | "Schliessen" | "Schließen" |
| `muscle_group_glutes` | "Gesäss" | "Gesäß" |

### Placeholder Values

| Key | Current de | Should be |
|-----|-----------|-----------|
| `app_title` | "Meine App" | "FitLog" |
| `app_description` | "Eine moderne mobile Anwendung" | Something FitLog-specific |

| Key | Current en | Should be |
|-----|-----------|-----------|
| `app_title` | "My App" | "FitLog" |
| `app_description` | "A modern mobile application" | Something FitLog-specific |

## Constraints

- **`de` is the base locale** (per AGENTS.md) — `project.inlang/settings.json` must declare `"baseLocale": "de"`. Currently wrong (`"en"`).
- **SSR is disabled** (`ssr = false`) — URL-based locale strategy is irrelevant for the Capacitor WebView. Locale detection must work client-side only.
- **Paraglide strategy must be set in the Vite plugin** config (not in `settings.json`) according to the docs — `strategy` is a compiler option.
- **Cookie strategy doesn't work well for SPA** — No server to set/read cookies on initial load. Must use `localStorage` and/or `preferredLanguage`.
- **Exercise names in seed data are English** — These are used as-is (international fitness terminology). Not i18n'd. Template names and descriptions are also English in the code data but are already i18n'd in the UI via `onboarding_template_*` keys.
- **No emojis in store metadata** — Per AGENTS.md constraint.

## Common Pitfalls

- **baseLocale change breaks URL patterns** — Switching baseLocale from `en` to `de` will flip which locale gets the URL prefix. Since this is an SPA without URL-based routing, this is harmless, but verify the generated runtime doesn't cause issues.
- **Paraglide strategy config location** — The `strategy` option must be passed to the compiler (Vite plugin), not the `settings.json`. The `settings.json` only defines baseLocale, locales, and plugins.
- **`setLocale()` triggers page reload** — In Paraglide, changing locale via `setLocale()` causes a full page navigation/reload to ensure all messages re-render. The language switcher UI should account for this (user sees brief reload).
- **`%paraglide.lang%` in app.html** — This is set by server middleware. With `ssr=false`, the middleware still runs for the initial SvelteKit static generation. After baseLocale change, verify the html lang attribute is correctly set.
- **Zod refinement i18n** — Zod schema refinements with `message:` are evaluated at validation time, not at schema definition time. This means you CAN use `m.*()` calls in the message field IF the schema is defined inside a component (not at module top level). Since the schemas in `ExerciseAssignmentForm` and `MesocycleForm` are defined inside `<script>`, this should work.
- **Native platform localization** — iOS requires `de.lproj/InfoPlist.strings` for localized app name. Android requires `values-de/strings.xml`. Without these, the app name won't translate on the device home screen/app drawer.

## Open Risks

- **Paraglide baseLocale change in existing install** — If a user already has the app with `baseLocale: "en"` and we switch to `"de"`, their stored cookie/localStorage locale preference might become stale. Low risk since there are no existing users yet (pre-launch).
- **hooks.server.ts with SSR=false** — The server hooks file with `paraglideMiddleware` is present but SSR is disabled. Verify it doesn't interfere with static adapter builds. If it does, it can be removed since the middleware is a no-op for SPA.
- **Missing iOS localization project settings** — iOS projects need `CFBundleLocalizations` array in Info.plist to declare supported languages, and `de.lproj` directory with `InfoPlist.strings`. Without project.pbxproj changes, Xcode may not pick up the localization.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Paraglide JS | `oimiragieo/agent-studio@paraglide-js-internationalization-i18n` | available (27 installs) — low install count, references are better |
| SvelteKit | — | none relevant found; reference docs at `./references/kit` are sufficient |
| Capacitor | — | none relevant found; reference docs at `./references/capacitor` are sufficient |

**Recommendation**: Skip the Paraglide skill — install count is very low (27) and we have comprehensive local reference docs at `./references/paraglide-js` including the strategy documentation which is the most complex part.

## Sources

- Paraglide locale detection strategies (source: `references/paraglide-js/docs/strategy.md`)
- Paraglide middleware docs — confirms middleware is SSR-only (source: `references/paraglide-js/docs/middleware.md`)
- Current runtime shows strategy `["cookie", "globalVariable", "baseLocale"]` (source: `apps/mobile/src/lib/paraglide/runtime.js`)
- AGENTS.md baseLocale requirement: `"de"` is the base locale (source: `AGENTS.md`)
- 5 missing en.json keys: `settings_title`, `settings_theme_label`, `settings_theme_light`, `settings_theme_dark`, `settings_theme_system` (source: `diff de.json en.json`)
