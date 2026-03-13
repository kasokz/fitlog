---
id: T03
parent: S07
milestone: M001
provides:
  - Native iOS localization files (de.lproj, en.lproj) with CFBundleDisplayName and CFBundleName
  - Native Android localization file (values-de/strings.xml) for German locale
  - CFBundleDevelopmentRegion set to de and CFBundleLocalizations declared in Info.plist
key_files:
  - apps/mobile/ios/App/App/Info.plist
  - apps/mobile/ios/App/App/de.lproj/InfoPlist.strings
  - apps/mobile/ios/App/App/en.lproj/InfoPlist.strings
  - apps/mobile/android/app/src/main/res/values-de/strings.xml
key_decisions:
  - none
patterns_established:
  - Native localization files use brand name "FitLog" identically in both languages since it's a product name
observability_surfaces:
  - none — these are build-time/install-time platform configuration files; check with file existence tests and grep
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Native platform localization (iOS & Android)

**Added iOS lproj localization files and Android values-de/strings.xml for native app name localization, updated Info.plist development region to `de` with declared localizations.**

## What Happened

Updated `Info.plist` to change `CFBundleDevelopmentRegion` from `en` to `de` (matching the project's base locale) and added a `CFBundleLocalizations` array declaring `de` and `en` as supported localizations.

Created `de.lproj/InfoPlist.strings` and `en.lproj/InfoPlist.strings` in the iOS app directory, both containing `CFBundleDisplayName = "FitLog"` and `CFBundleName = "FitLog"`. Since "FitLog" is a brand name, the values are identical in both locales but the files must exist for iOS to recognize German as a supported language.

Created `values-de/strings.xml` in the Android resources directory, mirroring the existing `values/strings.xml` with identical `app_name`, `title_activity_main`, `package_name`, and `custom_url_scheme` values.

## Verification

- `test -f ios/App/App/de.lproj/InfoPlist.strings` — ✓ passes
- `test -f ios/App/App/en.lproj/InfoPlist.strings` — ✓ passes
- `test -f android/app/src/main/res/values-de/strings.xml` — ✓ passes
- `grep CFBundleDevelopmentRegion Info.plist` shows `de` — ✓
- `grep CFBundleLocalizations Info.plist` matches with `de` and `en` entries — ✓
- `pnpm build` succeeds — ✓

Slice-level checks (all passing):
- `pnpm paraglide:compile` succeeds — ✓
- de.json and en.json both have 242 keys, diff produces no output — ✓
- No "Schliessen"/"Gesäss" matches — ✓
- No placeholder app name matches — ✓
- baseLocale is `de` — ✓
- iOS lproj files exist — ✓
- Android values-de exists — ✓
- Build succeeds — ✓

## Diagnostics

- Check file existence: `find apps/mobile/ios/App/App -name "InfoPlist.strings"` and `find apps/mobile/android -name "strings.xml"`
- Inspect Info.plist localization config: `grep -A6 CFBundleLocalizations apps/mobile/ios/App/App/Info.plist`
- Verify development region: `grep -A1 CFBundleDevelopmentRegion apps/mobile/ios/App/App/Info.plist`
- Actual localized app name display is only verifiable on device (iOS/Android)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/ios/App/App/Info.plist` — Changed CFBundleDevelopmentRegion to `de`, added CFBundleLocalizations array
- `apps/mobile/ios/App/App/de.lproj/InfoPlist.strings` — New: German localization with CFBundleDisplayName and CFBundleName
- `apps/mobile/ios/App/App/en.lproj/InfoPlist.strings` — New: English localization with CFBundleDisplayName and CFBundleName
- `apps/mobile/android/app/src/main/res/values-de/strings.xml` — New: German Android strings resource
